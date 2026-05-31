/**
 * mobile-app/src/screens/SOSScreen.js
 * ════════════════════════════════════════════════════════════
 * Full SOS workflow — works OFFLINE via cellular calls/SMS.
 * 
 * Features:
 *  • Giant animated SOS button
 *  • SVG countdown ring (10 sec)
 *  • Emergency chain visualization (Family → 108 → 112)
 *  • Impact detection toggle
 *  • Stationary detection toggle
 *  • Offline status indicator
 * ════════════════════════════════════════════════════════════
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, Alert, Vibration, Platform, StatusBar,
} from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { Accelerometer } from 'expo-sensors';
import {
  startSOSCountdown, cancelSOS, callEmergencyNumber,
  sendEmergencySMS, openNativeSOSDialer, getCurrentLocation,
  startImpactDetection, stopImpactDetection,
  startStationaryMonitor, stopStationaryMonitor,
  addSOSListener,
} from '../services/sos';
import { getContacts, getSettings } from '../services/storage';
import { colors, spacing, radius } from '../constants/theme';

// ── Request notification permissions ──────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

// ── SVG Countdown Ring ─────────────────────────────────────────────────────
function CountdownRing({ seconds, total }) {
  const SIZE   = 200;
  const STROKE = 10;
  const R      = (SIZE - STROKE * 2) / 2;
  const CIRC   = 2 * Math.PI * R;
  const progress = seconds / total;
  const dash     = CIRC * progress;

  return (
    <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
      {/* Track */}
      <Circle
        cx={SIZE / 2} cy={SIZE / 2} r={R}
        stroke="rgba(239,68,68,0.15)" strokeWidth={STROKE} fill="none"
      />
      {/* Progress arc */}
      <Circle
        cx={SIZE / 2} cy={SIZE / 2} r={R}
        stroke={seconds <= 3 ? colors.red : colors.amber}
        strokeWidth={STROKE} fill="none"
        strokeDasharray={`${dash} ${CIRC}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(-90, ${SIZE / 2}, ${SIZE / 2})`}
      />
    </Svg>
  );
}

// ── Emergency chain step ───────────────────────────────────────────────────
function ChainStep({ icon, label, status }) {
  const dotColor =
    status === 'done'    ? colors.green  :
    status === 'active'  ? colors.amber  : colors.textFaint;
  const labelColor =
    status === 'done'    ? colors.green  :
    status === 'active'  ? colors.amber  : colors.textFaint;

  return (
    <View style={styles.chainStep}>
      <View style={[styles.chainDot, { borderColor: dotColor, backgroundColor: status === 'done' ? colors.green : 'transparent' }]}>
        {status === 'done'
          ? <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>
          : status === 'active'
            ? <View style={[styles.chainInnerDot, { backgroundColor: colors.amber }]} />
            : null
        }
      </View>
      <Text style={{ color: labelColor, fontSize: 12, fontWeight: '600', marginTop: 4 }}>{icon}</Text>
      <Text style={{ color: labelColor, fontSize: 11, marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
const SOS_TOTAL = 10;
const CHAIN_STEPS = [
  { id: 'sms',      icon: '📱', label: 'Family SMS' },
  { id: 'ambulance',icon: '🚑', label: '108 Ambulance' },
  { id: 'police',   icon: '🚔', label: '112 Emergency' },
];

export default function SOSScreen() {
  const [phase, setPhase] = useState('idle'); // idle | countdown | firing | done | cancelled
  const [countdown, setCountdown] = useState(SOS_TOTAL);
  const [chainStatus, setChainStatus] = useState({});
  const [isOnline, setIsOnline] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [location, setLocation] = useState(null);
  const [autoDetect, setAutoDetect] = useState(false);
  const [impactAlert, setImpactAlert] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Network status ───────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => setIsOnline(state.isConnected));
    return unsub;
  }, []);

  // ── Load contacts & location ─────────────────────────────────────────────
  useEffect(() => {
    getContacts().then(setContacts);
    getCurrentLocation().then(setLocation);
    Notifications.requestPermissionsAsync();
  }, []);

  // ── SOS event listener ────────────────────────────────────────────────────
  useEffect(() => {
    return addSOSListener((event, data) => {
      if (event === 'sos_step') {
        setChainStatus(prev => ({ ...prev, [data.step]: 'active' }));
      }
    });
  }, []);

  // ── Pulse animation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'idle') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [phase]);

  // ── Auto-detect (impact + stationary) ────────────────────────────────────
  useEffect(() => {
    if (!autoDetect) {
      stopImpactDetection();
      stopStationaryMonitor();
      return;
    }

    startImpactDetection(({ magnitude }) => {
      setImpactAlert(`⚠️ Impact detected (${magnitude.toFixed(1)}G). Are you OK?`);
      // Show alert, user can dismiss or trigger SOS
      Alert.alert(
        '⚠️ Impact Detected',
        `A sudden impact was detected (${magnitude.toFixed(1)}G). Are you in an accident?`,
        [
          { text: 'I\'m OK', style: 'cancel', onPress: () => setImpactAlert(null) },
          { text: '🚨 Trigger SOS', style: 'destructive', onPress: handleSOSPress },
        ]
      );
    });

    startStationaryMonitor(({ duration }) => {
      const mins = Math.round(duration / 60000);
      Alert.alert(
        '⚠️ Stationary Detected',
        `You haven't moved for ${mins} minute(s). Do you need help?`,
        [
          { text: 'I\'m OK', style: 'cancel' },
          { text: '🚨 Trigger SOS', style: 'destructive', onPress: handleSOSPress },
        ]
      );
    });

    return () => {
      stopImpactDetection();
      stopStationaryMonitor();
    };
  }, [autoDetect]);

  // ── Start SOS countdown ──────────────────────────────────────────────────
  async function handleSOSPress() {
    if (phase === 'countdown') {
      handleCancel();
      return;
    }
    if (phase !== 'idle') return;

    setPhase('countdown');
    setCountdown(SOS_TOTAL);
    setChainStatus({});

    await startSOSCountdown(
      (secs) => setCountdown(secs),
      async () => {
        setPhase('firing');
        // Update chain steps as they fire
        for (const step of CHAIN_STEPS) {
          setChainStatus(prev => ({ ...prev, [step.id]: 'active' }));
          await new Promise(r => setTimeout(r, 1500));
          setChainStatus(prev => ({ ...prev, [step.id]: 'done' }));
        }
        setPhase('done');
      },
      () => setPhase('cancelled'),
    );
  }

  function handleCancel() {
    cancelSOS();
    setPhase('cancelled');
    setTimeout(() => setPhase('idle'), 2000);
  }

  // ── Direct emergency call (skip countdown) ───────────────────────────────
  async function handleDirectCall(number) {
    await callEmergencyNumber(number);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const isCountdown = phase === 'countdown';
  const isFiring    = phase === 'firing';
  const isDone      = phase === 'done';
  const isCancelled = phase === 'cancelled';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />

      {/* Offline banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            📡 Offline — SOS still works via cellular calls & SMS
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🚨 Emergency SOS</Text>
          <Text style={styles.headerSub}>
            {isCountdown ? `Triggering in ${countdown}s — tap to cancel` :
             isFiring    ? 'Contacting emergency services…' :
             isDone      ? 'Emergency services alerted ✓' :
             isCancelled ? 'SOS Cancelled' :
             'Press and hold to trigger SOS'}
          </Text>
        </View>

        {/* Location chip */}
        {location && (
          <View style={styles.locationChip}>
            <Text style={styles.locationText}>
              📍 {typeof location.lat !== 'undefined'
                ? `${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E`
                : `${location.latitude?.toFixed(4)}°N, ${location.longitude?.toFixed(4)}°E`}
            </Text>
          </View>
        )}

        {/* ── Big SOS Orb ── */}
        <View style={styles.orbSection}>
          {isCountdown && (
            <CountdownRing seconds={countdown} total={SOS_TOTAL} />
          )}

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={handleSOSPress}
              activeOpacity={0.85}
              style={[
                styles.sosOrb,
                isCountdown && styles.sosOrbCountdown,
                isFiring    && styles.sosOrbFiring,
                isDone      && styles.sosOrbDone,
              ]}
            >
              <Text style={styles.sosOrbIcon}>
                {isDone ? '✓' : isCancelled ? '✕' : '🚨'}
              </Text>
              <Text style={styles.sosOrbLabel}>
                {isCountdown ? `${countdown}s` :
                 isFiring    ? 'FIRING…' :
                 isDone      ? 'DONE' :
                 isCancelled ? 'CANCELLED' : 'SOS'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {isCountdown && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>✕ CANCEL SOS</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Emergency chain */}
        {(isCountdown || isFiring || isDone) && (
          <View style={styles.chain}>
            <Text style={styles.chainTitle}>Emergency Chain</Text>
            <View style={styles.chainRow}>
              {CHAIN_STEPS.map((step, i) => (
                <React.Fragment key={step.id}>
                  <ChainStep
                    icon={step.icon}
                    label={step.label}
                    status={chainStatus[step.id] || 'wait'}
                  />
                  {i < CHAIN_STEPS.length - 1 && (
                    <View style={[styles.chainConnector, { backgroundColor: chainStatus[CHAIN_STEPS[i+1].id] ? colors.amber : colors.border }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* Quick call buttons */}
        {phase === 'idle' && (
          <View style={styles.quickCalls}>
            <Text style={styles.sectionTitle}>Quick Emergency Calls</Text>
            <Text style={styles.sectionSub}>These calls work offline via cellular network</Text>
            <View style={styles.quickCallRow}>
              {[['🚑','108','Ambulance'],['🚔','112','Emergency'],['🏥','100','Police']].map(([icon, num, label]) => (
                <TouchableOpacity key={num} style={styles.quickCallBtn} onPress={() => handleDirectCall(num)}>
                  <Text style={styles.quickCallIcon}>{icon}</Text>
                  <Text style={styles.quickCallNum}>{num}</Text>
                  <Text style={styles.quickCallLabel}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Auto-detection toggle */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>🤖 Auto-Detection</Text>
              <Text style={styles.cardDesc}>
                Monitor for impacts and stationary periods to auto-prompt SOS
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, autoDetect && styles.toggleOn]}
              onPress={() => setAutoDetect(v => !v)}
            >
              <View style={[styles.toggleThumb, autoDetect && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
          {autoDetect && (
            <View style={styles.detectionInfo}>
              <Text style={styles.detectionItem}>✓ Impact detection active (accelerometer)</Text>
              <Text style={styles.detectionItem}>✓ Stationary monitor active (2 min threshold)</Text>
            </View>
          )}
        </View>

        {/* Contact summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            📱 Emergency Contacts ({contacts.length})
          </Text>
          {contacts.length === 0 ? (
            <Text style={[styles.cardDesc, { marginTop: 6 }]}>
              No contacts added. Go to Settings to add emergency contacts.
            </Text>
          ) : (
            contacts.slice(0, 3).map(c => (
              <View key={c.id} style={styles.contactRow}>
                <View style={[styles.contactAvatar, { backgroundColor: colors.amberGlow }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.amber }}>
                    {c.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.contactPhone}>{c.phone}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Offline capability note */}
        <View style={[styles.card, { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.05)' }]}>
          <Text style={[styles.cardTitle, { color: colors.green }]}>✅ Offline Capabilities</Text>
          <View style={{ marginTop: 8, gap: 4 }}>
            {[
              'Emergency calls via cellular (no internet)',
              'SMS to contacts via cellular (no internet)',
              'Native emergency dialer (no internet)',
              'GPS location (cached if unavailable)',
              'Local countdown notifications',
            ].map(t => (
              <Text key={t} style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>✓ {t}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: colors.bgPrimary },
  offlineBanner:     { backgroundColor: 'rgba(245,158,11,0.15)', borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.3)', padding: 8, alignItems: 'center' },
  offlineText:       { color: colors.amber, fontSize: 12, fontWeight: '600' },
  scroll:            { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing['4xl'] },
  header:            { alignItems: 'center', marginBottom: spacing.xl },
  headerTitle:       { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  headerSub:         { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  locationChip:      { alignSelf: 'center', backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 6, marginBottom: spacing.xl },
  locationText:      { color: colors.green, fontSize: 12, fontFamily: 'Courier New' },
  orbSection:        { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl, height: 280, position: 'relative' },
  sosOrb:            { width: 160, height: 160, borderRadius: 80, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', shadowColor: colors.red, shadowOpacity: 0.6, shadowRadius: 30, shadowOffset: { width: 0, height: 0 }, elevation: 20 },
  sosOrbCountdown:   { backgroundColor: '#b91c1c' },
  sosOrbFiring:      { backgroundColor: '#7f1d1d' },
  sosOrbDone:        { backgroundColor: colors.green },
  sosOrbIcon:        { fontSize: 48, lineHeight: 56 },
  sosOrbLabel:       { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 2, marginTop: 4 },
  cancelBtn:         { marginTop: 24, paddingHorizontal: 32, paddingVertical: 12, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.red, backgroundColor: 'rgba(239,68,68,0.1)' },
  cancelBtnText:     { color: colors.red, fontWeight: '700', fontSize: 14, letterSpacing: 1 },
  chain:             { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg },
  chainTitle:        { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  chainRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  chainStep:         { alignItems: 'center', width: 70 },
  chainDot:          { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  chainInnerDot:     { width: 10, height: 10, borderRadius: 5 },
  chainConnector:    { flex: 1, height: 2, marginTop: -20 },
  quickCalls:        { marginBottom: spacing.lg },
  sectionTitle:      { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  sectionSub:        { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },
  quickCallRow:      { flexDirection: 'row', gap: spacing.md },
  quickCallBtn:      { flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 4 },
  quickCallIcon:     { fontSize: 24 },
  quickCallNum:      { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  quickCallLabel:    { fontSize: 11, color: colors.textMuted },
  card:              { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  cardRow:           { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle:         { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  cardDesc:          { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  toggle:            { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.bgCardHover, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', padding: 2 },
  toggleOn:          { backgroundColor: colors.amber, borderColor: colors.amber },
  toggleThumb:       { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.textFaint },
  toggleThumbOn:     { backgroundColor: '#0a0e1a', alignSelf: 'flex-end' },
  detectionInfo:     { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  detectionItem:     { fontSize: 12, color: colors.green, marginTop: 4 },
  contactRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  contactAvatar:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  contactName:       { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  contactPhone:      { fontSize: 11, color: colors.textMuted, fontFamily: 'Courier New' },
});
