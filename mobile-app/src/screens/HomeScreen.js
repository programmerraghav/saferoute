/**
 * mobile-app/src/screens/HomeScreen.js
 * Landing screen — stats, quick-action cards, offline banner.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, RefreshControl,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { authFetch } from '../services/auth';
import { getComplaintsCache } from '../services/storage';
import { colors, spacing, radius } from '../constants/theme';

const QUICK_ACTIONS = [
  { icon: '🕳️', label: 'Report Pothole', route: 'ReportPothole', color: colors.amber },
  { icon: '🚨', label: 'SOS Emergency',  route: 'SOS',           color: colors.red  },
  { icon: '🗺️', label: 'Nearby Map',     route: 'NearbyMap',     color: colors.blue },
  { icon: '📊', label: 'Dashboard',      route: 'Dashboard',     color: colors.green },
];

export default function HomeScreen({ navigation }) {
  const [stats, setStats]       = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(s => setIsOnline(s.isConnected));
    loadStats();
    return unsub;
  }, []);

  async function loadStats() {
    setRefreshing(true);
    try {
      const res  = await authFetch('/api/dashboard/stats');
      const data = await res.json();
      setStats(data);
    } catch {
      // Offline: show cached complaint count
      const cached = await getComplaintsCache();
      setStats({ total_complaints: cached.length, cached: true });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />

      {/* Offline banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📡 Offline — SOS still works via cellular</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadStats} tintColor={colors.amber} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>🚦 Safe<Text style={{ color: colors.amber }}>Route</Text></Text>
          <Text style={styles.heroSub}>AI Road Safety & Emergency System</Text>
          <View style={[styles.liveBadge]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>Live monitoring · Vapi, Gujarat</Text>
          </View>
        </View>

        {/* Stats row */}
        {stats && (
          <View style={styles.statsRow}>
            {[
              { label: 'Complaints', val: stats.total_complaints ?? '—', color: colors.textPrimary },
              { label: 'Resolved',   val: stats.resolved         ?? '—', color: colors.green },
              { label: 'SOS Events', val: stats.total_sos_events ?? '—', color: colors.red },
            ].map(s => (
              <View key={s.label} style={styles.statCard}>
                <Text style={[styles.statNum, { color: s.color }]}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}
        {stats?.cached && (
          <Text style={styles.cachedNote}>Showing cached data · Connect to refresh</Text>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {QUICK_ACTIONS.map(a => (
            <TouchableOpacity
              key={a.route}
              style={[styles.actionCard, { borderColor: a.color + '44' }]}
              onPress={() => navigation.navigate(a.route)}
              activeOpacity={0.75}
            >
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About SafeRoute</Text>
          <Text style={styles.cardBody}>
            AI-powered pothole detection and real-time SOS emergency alerts — built for India's roads,
            powered by YOLOv8 and Azure.
          </Text>
        </View>

        {/* Emergency numbers */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚨 Emergency Numbers</Text>
          <View style={styles.emerRow}>
            {[['🚑','108','Ambulance'],['🚔','100','Police'],['🔥','101','Fire']].map(([icon,num,label]) => (
              <View key={num} style={styles.emerItem}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={styles.emerNum}>{num}</Text>
                <Text style={styles.emerLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.bgPrimary },
  offlineBanner:{ backgroundColor:'rgba(245,158,11,0.15)', borderBottomWidth:1, borderBottomColor:'rgba(245,158,11,0.3)', padding:8, alignItems:'center' },
  offlineText:  { color:colors.amber, fontSize:12, fontWeight:'600' },
  scroll:       { padding:spacing.lg, paddingBottom: 80 },
  hero:         { alignItems:'center', paddingVertical: spacing['2xl'], marginBottom: spacing.lg },
  heroTitle:    { fontSize:36, fontWeight:'800', color:colors.textPrimary, letterSpacing:-1 },
  heroSub:      { fontSize:14, color:colors.textMuted, marginTop:6 },
  liveBadge:    { flexDirection:'row', alignItems:'center', gap:8, marginTop:12, paddingHorizontal:14, paddingVertical:6, backgroundColor:'rgba(245,158,11,0.08)', borderWidth:1, borderColor:'rgba(245,158,11,0.2)', borderRadius:radius.full },
  liveDot:      { width:8, height:8, borderRadius:4, backgroundColor:colors.green },
  liveBadgeText:{ fontSize:12, color:colors.amber, fontWeight:'500' },
  statsRow:     { flexDirection:'row', gap:spacing.md, marginBottom:spacing.xs },
  statCard:     { flex:1, backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:spacing.md, alignItems:'center' },
  statNum:      { fontSize:24, fontWeight:'800', lineHeight:28 },
  statLabel:    { fontSize:11, color:colors.textMuted, marginTop:4, textTransform:'uppercase', letterSpacing:0.5 },
  cachedNote:   { textAlign:'center', fontSize:11, color:colors.textFaint, marginBottom:spacing.lg },
  sectionTitle: { fontSize:16, fontWeight:'700', color:colors.textPrimary, marginBottom:spacing.md, marginTop:spacing.lg },
  actionGrid:   { flexDirection:'row', flexWrap:'wrap', gap:spacing.md, marginBottom:spacing.lg },
  actionCard:   { width:'47%', backgroundColor:colors.bgCard, borderWidth:1, borderRadius:radius.lg, padding:spacing.lg, alignItems:'center', gap:spacing.sm },
  actionIcon:   { fontSize:32 },
  actionLabel:  { fontSize:13, fontWeight:'700' },
  card:         { backgroundColor:colors.bgCard, borderRadius:radius.lg, borderWidth:1, borderColor:colors.border, padding:spacing.lg, marginBottom:spacing.md },
  cardTitle:    { fontSize:14, fontWeight:'700', color:colors.textPrimary, marginBottom:6 },
  cardBody:     { fontSize:13, color:colors.textMuted, lineHeight:20 },
  emerRow:      { flexDirection:'row', justifyContent:'space-around', marginTop:spacing.md },
  emerItem:     { alignItems:'center', gap:4 },
  emerNum:      { fontSize:24, fontWeight:'800', color:colors.amber },
  emerLabel:    { fontSize:11, color:colors.textMuted },
});
