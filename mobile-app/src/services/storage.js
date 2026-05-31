/**
 * mobile-app/src/services/storage.js
 * AsyncStorage wrappers — all SOS-critical data stored locally.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER:      'sr_user',
  TOKEN:     'sr_token',
  CONTACTS:  'sr_emergency_contacts',
  COMPLAINTS:'sr_complaints_cache',
  SETTINGS:  'sr_settings',
  LOCATION:  'sr_last_location',
};

// ── Generic helpers ────────────────────────────────────────────────────────
export async function storeJSON(key, value) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export async function getJSON(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export async function removeKey(key) {
  try { await AsyncStorage.removeItem(key); } catch {}
}

// ── Auth ───────────────────────────────────────────────────────────────────
export const storeUser  = (u) => storeJSON(KEYS.USER, u);
export const getUser    = ()  => getJSON(KEYS.USER);
export const storeToken = (t) => storeJSON(KEYS.TOKEN, t);
export const getToken   = ()  => getJSON(KEYS.TOKEN, null);
export const clearAuth  = async () => {
  await removeKey(KEYS.USER);
  await removeKey(KEYS.TOKEN);
};

// ── Emergency contacts (offline-first) ────────────────────────────────────
export const getContacts   = () => getJSON(KEYS.CONTACTS, []);
export const storeContacts = (c) => storeJSON(KEYS.CONTACTS, c);

export async function addContact(contact) {
  const existing = await getContacts();
  const updated = [...existing, { ...contact, id: Date.now().toString() }];
  await storeContacts(updated);
  return updated;
}

export async function removeContact(id) {
  const existing = await getContacts();
  const updated = existing.filter(c => c.id !== id);
  await storeContacts(updated);
  return updated;
}

// ── Complaints cache (for offline browsing) ───────────────────────────────
export const getComplaintsCache = () => getJSON(KEYS.COMPLAINTS, []);
export const setComplaintsCache = (c) => storeJSON(KEYS.COMPLAINTS, c);

// ── Last known location ────────────────────────────────────────────────────
export const storeLocation = (loc) => storeJSON(KEYS.LOCATION, loc);
export const getLastLocation = () => getJSON(KEYS.LOCATION, null);

// ── Settings ───────────────────────────────────────────────────────────────
export const getSettings = () => getJSON(KEYS.SETTINGS, {
  autoSOSEnabled:   true,
  stationaryMinutes: 2,
  impactThreshold:  2.5,
  sosCountdownSecs: 10,
  emergencyNumber:  '112',
});
export const updateSettings = async (patch) => {
  const current = await getSettings();
  await storeJSON(KEYS.SETTINGS, { ...current, ...patch });
};
