/**
 * mobile-app/src/services/sos.js
 * ═══════════════════════════════════════════════════════════
 * Core SOS Engine — fully offline-capable.
 *
 * Works via:
 *  • Cellular phone calls (tel: links) — no internet needed
 *  • SMS via expo-sms                  — no internet needed
 *  • Android emergency dialer intent   — no internet needed
 *  • Local notifications               — no internet needed
 *  • GPS queued offline, synced later  — best-effort
 * ═══════════════════════════════════════════════════════════
 */
import { Linking, Platform, Vibration } from 'react-native';
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import { Accelerometer } from 'expo-sensors';
import { getContacts, getSettings, storeLocation } from './storage';

// ── State ─────────────────────────────────────────────────────────────────
let _countdownTimer    = null;
let _stationaryTimer   = null;
let _accelSubscription = null;
let _lastMotionTime    = Date.now();
let _sosListeners      = [];

export function addSOSListener(fn) {
  _sosListeners.push(fn);
  return () => { _sosListeners = _sosListeners.filter(f => f !== fn); };
}
function _emit(event, data) {
  _sosListeners.forEach(fn => fn(event, data));
}

// ── 1. Get current GPS (with offline fallback) ───────────────────────────
export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeout: 5000,
    });
    await storeLocation({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      timestamp: Date.now(),
    });
    return loc.coords;
  } catch {
    // Return last stored location if GPS fails offline
    const { getLastLocation } = await import('./storage');
    return await getLastLocation();
  }
}

// ── 2. Format location for SMS ────────────────────────────────────────────
function formatLocationSMS(coords) {
  if (!coords) return 'Location unavailable';
  const lat = typeof coords.lat !== 'undefined' ? coords.lat : coords.latitude;
  const lng = typeof coords.lng !== 'undefined' ? coords.lng : coords.longitude;
  return `https://maps.google.com/?q=${lat},${lng}`;
}

// ── 3. Send SMS to all emergency contacts (offline-capable via cellular) ──
export async function sendEmergencySMS(coords, message) {
  const contacts = await getContacts();
  const phones   = contacts.map(c => c.phone).filter(Boolean);

  if (phones.length === 0) return { success: false, reason: 'no_contacts' };

  const isAvailable = await SMS.isAvailableAsync();
  if (!isAvailable) return { success: false, reason: 'sms_unavailable' };

  const locationText = formatLocationSMS(coords);
  const body = message ||
    `🚨 EMERGENCY SOS — SafeRoute\n\nI may be in an accident and need help.\n\nMy location: ${locationText}\n\nPlease call me or contact emergency services immediately.\n\n— SafeRoute Emergency Alert`;

  const { result } = await SMS.sendSMSAsync(phones, body);
  return { success: result === 'sent', result };
}

// ── 4. Trigger native phone call (cellular, no internet needed) ───────────
export async function callEmergencyNumber(number) {
  const settings = await getSettings();
  const num = number || settings.emergencyNumber || '112';
  const url = `tel:${num}`;

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) return false;

  await Linking.openURL(url);
  return true;
}

// ── 5. Open Android emergency dialer (system-level) ──────────────────────
export async function openNativeSOSDialer() {
  if (Platform.OS === 'android') {
    try {
      await IntentLauncher.startActivityAsync(
        'android.phone.action.EMERGENCY_DIALER',
        {}
      );
      return true;
    } catch {
      // Fallback to direct call
      return callEmergencyNumber();
    }
  } else {
    // iOS — open the SOS url (will prompt native emergency call)
    const url = 'tel:112';
    await Linking.openURL(url);
    return true;
  }
}

// ── 6. Local notification (visible even when app is backgrounded) ─────────
async function showSOSNotification(secs) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title:    '🚨 SOS Alert Triggering',
      body:     `Emergency SOS will fire in ${secs} seconds. Open app to cancel.`,
      sound:    true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      color:    '#ef4444',
    },
    trigger: null, // immediate
  });
}

async function showSOSFiredNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 SOS Triggered',
      body:  'Emergency services and contacts have been alerted.',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: '#ef4444',
    },
    trigger: null,
  });
}

// ── 7. Main SOS countdown + fire ─────────────────────────────────────────
let _countdownSecs = 10;
let _currentTick   = 0;

export async function startSOSCountdown(onTick, onFired, onCancelled) {
  const settings = await getSettings();
  _countdownSecs = settings.sosCountdownSecs || 10;
  _currentTick   = _countdownSecs;

  // Vibrate triple burst to alert user
  Vibration.vibrate([0, 300, 200, 300, 200, 300]);

  // Show notification
  await showSOSNotification(_countdownSecs);

  _emit('countdown_start', { seconds: _countdownSecs });
  onTick?.(_currentTick);

  _countdownTimer = setInterval(async () => {
    _currentTick--;
    onTick?.(_currentTick);
    _emit('countdown_tick', { seconds: _currentTick });

    if (_currentTick <= 0) {
      clearInterval(_countdownTimer);
      _countdownTimer = null;
      await _fireSOSSequence();
      onFired?.();
      _emit('sos_fired', {});
    }
  }, 1000);
}

export function cancelSOS() {
  if (_countdownTimer) {
    clearInterval(_countdownTimer);
    _countdownTimer = null;
    Vibration.cancel();
    Vibration.vibrate([0, 100]);
    _emit('sos_cancelled', {});
  }
}

// ── 8. Fire the full SOS sequence ─────────────────────────────────────────
async function _fireSOSSequence() {
  Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500]);
  const coords = await getCurrentLocation();

  // Step 1: SMS family contacts (cellular, offline)
  _emit('sos_step', { step: 'sms', label: 'Alerting family…' });
  await sendEmergencySMS(coords).catch(() => {});

  // Step 2: Call 108 ambulance (cellular, offline)
  _emit('sos_step', { step: 'ambulance', label: 'Calling 108…' });
  await callEmergencyNumber('108').catch(() => {});

  // Step 3: Fire local SOS notification
  await showSOSFiredNotification().catch(() => {});

  // Step 4: Android emergency dialer (will call 112)
  await new Promise(r => setTimeout(r, 3000)); // allow call to connect first
  _emit('sos_step', { step: 'police', label: 'Opening emergency dialer…' });
  await openNativeSOSDialer().catch(() => {});

  // Step 5: Queue location report to server (synced when online)
  try {
    const { storeJSON, getJSON } = await import('./storage');
    const queue = await getJSON('sr_sos_queue', []);
    queue.push({ coords, timestamp: Date.now(), synced: false });
    await storeJSON('sr_sos_queue', queue);
  } catch {}
}

// ── 9. Impact detection (accelerometer) ───────────────────────────────────
export async function startImpactDetection(onImpact) {
  const settings = await getSettings();
  const threshold = settings.impactThreshold || 2.5;

  Accelerometer.setUpdateInterval(200);
  _accelSubscription = Accelerometer.addListener(({ x, y, z }) => {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    _lastMotionTime = Date.now();
    if (magnitude > threshold) {
      onImpact?.({ magnitude, x, y, z });
      _emit('impact_detected', { magnitude });
    }
  });
}

export function stopImpactDetection() {
  _accelSubscription?.remove();
  _accelSubscription = null;
}

// ── 10. Stationary detection (GPS + timer) ────────────────────────────────
export function startStationaryMonitor(onStationary) {
  const CHECK_INTERVAL = 30_000; // check every 30s
  const STATIONARY_MS  = 2 * 60 * 1000; // 2 minutes

  _stationaryTimer = setInterval(() => {
    const timeSinceMotion = Date.now() - _lastMotionTime;
    if (timeSinceMotion >= STATIONARY_MS) {
      onStationary?.({ duration: timeSinceMotion });
      _emit('stationary_detected', { duration: timeSinceMotion });
    }
  }, CHECK_INTERVAL);
}

export function stopStationaryMonitor() {
  if (_stationaryTimer) {
    clearInterval(_stationaryTimer);
    _stationaryTimer = null;
  }
}

// ── 11. Full cleanup ──────────────────────────────────────────────────────
export function stopAllSOSMonitoring() {
  cancelSOS();
  stopImpactDetection();
  stopStationaryMonitor();
}
