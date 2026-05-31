'use strict';
/**
 * backend/services/userService.js
 * Firestore user CRUD — create, read, update users across 3 roles.
 * Roles: 'user' | 'municipality_employee' | 'admin'
 */

const bcrypt = require('bcryptjs');
const firebaseConfig = require('../config/firebase');

// Bounded in-memory mock database for fallback
const mockUsers = new Map();

/**
 * Helper to get the Firestore database or return null if not initialized.
 */
function getFirestoreDb() {
  return firebaseConfig.db || null;
}

/**
 * Generate a unique employee ID  → EMP-XXXXXX
 */
function generateEmployeeId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'EMP-';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/**
 * Generate a unique user ID  → USR-XXXXXXXX
 */
function generateUserId() {
  return 'USR-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/**
 * Create a new user record.
 * @param {{ name, email, password, role, phone?, created_by? }} data
 * @returns {object} Created user (without password_hash)
 */
async function createUser(data) {
  // Check if email already exists
  const existing = await findUserByEmail(data.email);
  if (existing) {
    const err = new Error('A user with this email already exists.');
    err.code = 'EMAIL_EXISTS';
    throw err;
  }

  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(data.password, salt);

  const isEmployee = data.role === 'municipality_employee';
  const now = new Date().toISOString();

  const user = {
    id: generateUserId(),
    employee_id: isEmployee ? generateEmployeeId() : null,
    name: data.name,
    email: data.email.toLowerCase().trim(),
    password_hash,
    role: data.role || 'user',
    phone: data.phone || null,
    is_active: true,
    created_at: now,
    updated_at: now,
    created_by: data.created_by || null,
    last_login: null,
    stats: {
      complaints_submitted: 0,
      complaints_resolved: 0,
      avg_resolution_hours: null,
      last_activity: null,
    },
  };

  const db = getFirestoreDb();
  if (db) {
    await db.collection('users').doc(user.id).set(user);
  } else {
    mockUsers.set(user.id, JSON.parse(JSON.stringify(user)));
  }

  const { password_hash: _, ...safe } = user;
  return safe;
}

/**
 * Find user by email (case-insensitive).
 */
async function findUserByEmail(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const db = getFirestoreDb();

  if (db) {
    const snapshot = await db.collection('users')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
  } else {
    for (const u of mockUsers.values()) {
      if (u.email === normalizedEmail) {
        return JSON.parse(JSON.stringify(u));
      }
    }
    return null;
  }
}

/**
 * Find user by ID.
 */
async function findUserById(id) {
  const db = getFirestoreDb();

  if (db) {
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return null;
    return doc.data();
  } else {
    const u = mockUsers.get(id);
    return u ? JSON.parse(JSON.stringify(u)) : null;
  }
}

/**
 * Validate credentials — returns safe user or null.
 */
async function validateCredentials(email, password) {
  const user = await findUserByEmail(email);
  if (!user || !user.is_active) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  // Update last_login
  await updateUserFields(user.id, { last_login: new Date().toISOString() });

  const { password_hash: _, ...safe } = user;
  return safe;
}

/**
 * Update arbitrary fields on a user document.
 */
async function updateUserFields(userId, fields) {
  const user = await findUserById(userId);
  if (!user) throw new Error('User not found.');

  // Handle nested stats object merging if provided
  const mergedStats = fields.stats ? { ...user.stats, ...fields.stats } : user.stats;
  const updated = { 
    ...user, 
    ...fields, 
    stats: mergedStats,
    updated_at: new Date().toISOString() 
  };

  const db = getFirestoreDb();
  if (db) {
    await db.collection('users').doc(userId).set(updated, { merge: true });
  } else {
    mockUsers.set(userId, JSON.parse(JSON.stringify(updated)));
  }

  const { password_hash: _, ...safe } = updated;
  return safe;
}

/**
 * Update a user's role (admin only).
 */
async function updateUserRole(userId, role) {
  const validRoles = ['user', 'municipality_employee', 'admin'];
  if (!validRoles.includes(role)) throw new Error(`Invalid role: ${role}`);
  return updateUserFields(userId, { role });
}

/**
 * Activate/deactivate a user (admin only).
 */
async function setUserActive(userId, isActive) {
  return updateUserFields(userId, { is_active: isActive });
}

/**
 * Reset a user's password (admin only).
 */
async function resetPassword(userId, newPassword) {
  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(newPassword, salt);
  return updateUserFields(userId, { password_hash });
}

/**
 * List all users — optionally filtered by role.
 * Returns users without password_hash.
 */
async function listUsers(filters = {}) {
  const db = getFirestoreDb();

  let userList = [];
  if (db) {
    let query = db.collection('users');
    if (filters.role) {
      query = query.where('role', '==', filters.role);
    }
    const snapshot = await query.get();
    snapshot.forEach(doc => {
      userList.push(doc.data());
    });
  } else {
    for (const u of mockUsers.values()) {
      if (!filters.role || u.role === filters.role) {
        userList.push(JSON.parse(JSON.stringify(u)));
      }
    }
  }

  // Sort by created_at DESC in code
  userList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return userList.map(u => {
    const { password_hash: _, ...safe } = u;
    return safe;
  });
}

/**
 * Get analytics summary for all municipality employees.
 * Returns per-employee stats + aggregate metrics.
 */
async function getEmployeeAnalytics() {
  const employees = await listUsers({ role: 'municipality_employee' });
  const now = Date.now();

  const enriched = employees.map((emp) => {
    const s = emp.stats || {};
    const daysJoined = emp.created_at
      ? Math.floor((now - new Date(emp.created_at).getTime()) / 86400000)
      : 0;
    const daysActive = emp.last_login
      ? Math.floor((now - new Date(emp.last_login).getTime()) / 86400000)
      : null;

    return {
      ...emp,
      days_since_joined: daysJoined,
      days_since_last_login: daysActive,
      resolution_rate:
        s.complaints_submitted > 0
          ? Math.round((s.complaints_resolved / s.complaints_submitted) * 100)
          : 0,
    };
  });

  const totalResolved = enriched.reduce((acc, e) => acc + (e.stats?.complaints_resolved || 0), 0);
  const totalSubmitted = enriched.reduce((acc, e) => acc + (e.stats?.complaints_submitted || 0), 0);
  const avgRes = enriched.filter((e) => e.stats?.avg_resolution_hours != null);
  const globalAvgHours =
    avgRes.length > 0
      ? Math.round(avgRes.reduce((acc, e) => acc + e.stats.avg_resolution_hours, 0) / avgRes.length)
      : null;

  return {
    employees: enriched,
    aggregate: {
      total_employees: enriched.length,
      active_employees: enriched.filter((e) => e.is_active).length,
      total_resolved: totalResolved,
      total_submitted: totalSubmitted,
      overall_resolution_rate:
        totalSubmitted > 0 ? Math.round((totalResolved / totalSubmitted) * 100) : 0,
      avg_resolution_hours: globalAvgHours,
    },
  };
}

/**
 * Increment an employee's resolved complaint count and recalculate avg resolution time.
 */
async function recordResolution(userId, resolutionHours) {
  const user = await findUserById(userId);
  if (!user) return;
  const s = user.stats || { complaints_submitted: 0, complaints_resolved: 0, avg_resolution_hours: null };
  s.complaints_resolved += 1;
  s.last_activity = new Date().toISOString();
  if (resolutionHours != null) {
    s.avg_resolution_hours =
      s.avg_resolution_hours != null
        ? Math.round((s.avg_resolution_hours + resolutionHours) / 2)
        : resolutionHours;
  }
  await updateUserFields(userId, { stats: s });
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  validateCredentials,
  updateUserFields,
  updateUserRole,
  setUserActive,
  resetPassword,
  listUsers,
  getEmployeeAnalytics,
  recordResolution,
  generateEmployeeId,
};
