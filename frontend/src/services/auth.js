/**
 * frontend/src/services/auth.js
 * Client-side authentication service.
 * Stores tokens in localStorage; exposes helpers used everywhere.
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'sr_access_token',
  REFRESH_TOKEN: 'sr_refresh_token',
  USER: 'sr_user',
};

// ─── Token Storage ───────────────────────────────────────────────────────────

export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

function storeAuth({ access_token, refresh_token, user }) {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
  if (refresh_token) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

// ─── JWT Decode (no verification — server validates) ─────────────────────────

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now() + 30000; // 30s buffer
}

// ─── User State ───────────────────────────────────────────────────────────────

export function getCurrentUser() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  const token = getAccessToken();
  return !!token && !isTokenExpired(token);
}

/**
 * Check if the current user has at least one of the given roles.
 * @param {...string} roles
 */
export function hasRole(...roles) {
  const user = getCurrentUser();
  return !!user && roles.includes(user.role);
}

export function isAdmin() { return hasRole('admin'); }
export function isMunicipality() { return hasRole('admin', 'municipality_employee'); }

// ─── Authed Fetch ─────────────────────────────────────────────────────────────

/**
 * fetch() wrapper that injects the Bearer token and handles 401 with auto-refresh.
 */
export async function authFetch(url, options = {}) {
  let token = getAccessToken();

  // Try refresh if access token is expired
  if (token && isTokenExpired(token)) {
    token = await refreshAccessToken();
  }

  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const response = await fetch(url, { ...options, headers });

  // If 401 after refresh attempt → logout
  if (response.status === 401) {
    clearAuth();
    window.dispatchEvent(new CustomEvent('sr:auth:logout'));
  }

  return response;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) { clearAuth(); return null; }
    const data = await res.json();
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
    return data.access_token;
  } catch {
    clearAuth();
    return null;
  }
}

// ─── Auth Actions ─────────────────────────────────────────────────────────────

/**
 * Register a new user account (role: 'user' only — employees created by admin).
 */
export async function register({ name, email, password, phone }) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, phone }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.message || 'Registration failed.'), { code: data.error, status: res.status });
  storeAuth(data);
  window.dispatchEvent(new CustomEvent('sr:auth:login', { detail: data.user }));
  return data;
}

/**
 * Login with email + password.
 */
export async function login({ email, password }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.message || 'Login failed.'), { code: data.error, status: res.status });
  storeAuth(data);
  window.dispatchEvent(new CustomEvent('sr:auth:login', { detail: data.user }));
  return data;
}

/**
 * Logout — clears local state.
 */
export function logout() {
  clearAuth();
  window.dispatchEvent(new CustomEvent('sr:auth:logout'));
}

/**
 * Fetch current user profile from API (always fresh).
 */
export async function fetchMe() {
  const res = await authFetch('/api/auth/me');
  if (!res.ok) return null;
  const data = await res.json();
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
  return data.user;
}
