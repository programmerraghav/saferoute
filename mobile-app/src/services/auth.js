/**
 * mobile-app/src/services/auth.js
 * Auth service — JWT + AsyncStorage for offline persistence.
 */
import { storeUser, storeToken, getUser, getToken, clearAuth } from './storage';

const API_BASE = 'http://10.0.2.2:3001'; // Android emulator → localhost; change for real device

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  await storeToken(data.token);
  await storeUser(data.user);
  return data;
}

export async function register(name, email, password, phone) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, email, password, phone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Registration failed');
  await storeToken(data.token);
  await storeUser(data.user);
  return data;
}

export async function logout() {
  await clearAuth();
}

export const isLoggedIn = async () => !!(await getToken());
export const getCurrentUser = getUser;

export async function authFetch(path, opts = {}) {
  const token = await getToken();
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
}
