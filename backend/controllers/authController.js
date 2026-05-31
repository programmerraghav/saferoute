'use strict';
/**
 * backend/controllers/authController.js
 * Authentication: register (users only), login, logout, token refresh, profile.
 * Employees are created ONLY by admin via POST /api/auth/admin/create-employee.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userService = require('../services/userService');

// ─── Helpers ───────────────────────────────────────────────────────────────

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name, employee_id: user.employee_id || null },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function signRefreshToken(userId) {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
}

function safeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Public — creates USER role only. Employees created by admin.
 */
async function register(req, res) {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'validation_error', message: 'name, email, and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'validation_error', message: 'Password must be at least 8 characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'validation_error', message: 'Invalid email address.' });
  }

  try {
    const user = await userService.createUser({ name, email, password, phone, role: 'user' });
    const access_token = signAccessToken(user);
    const refresh_token = signRefreshToken(user.id);

    return res.status(201).json({
      message: 'Account created successfully.',
      user: safeUser(user),
      access_token,
      refresh_token,
    });
  } catch (err) {
    if (err.code === 'EMAIL_EXISTS') {
      return res.status(409).json({ error: 'email_exists', message: err.message });
    }
    console.error('[Auth] Register error:', err);
    return res.status(500).json({ error: 'server_error', message: 'Registration failed.' });
  }
}

/**
 * POST /api/auth/login
 * All roles — email + password.
 */
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'validation_error', message: 'email and password are required.' });
  }

  try {
    const user = await userService.validateCredentials(email, password);
    if (!user) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'Email or password is incorrect.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'account_disabled', message: 'Your account has been deactivated. Contact admin.' });
    }

    const access_token = signAccessToken(user);
    const refresh_token = signRefreshToken(user.id);

    return res.json({
      message: 'Login successful.',
      user: safeUser(user),
      access_token,
      refresh_token,
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ error: 'server_error', message: 'Login failed.' });
  }
}

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh token for a new access token.
 */
async function refresh(req, res) {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: 'missing_token', message: 'refresh_token is required.' });
  }

  try {
    const decoded = jwt.verify(refresh_token, env.JWT_REFRESH_SECRET);
    const user = await userService.findUserById(decoded.sub);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'invalid_token', message: 'User not found or deactivated.' });
    }

    const access_token = signAccessToken(user);
    return res.json({ access_token });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'refresh_expired', message: 'Refresh token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'invalid_token', message: 'Invalid refresh token.' });
  }
}

/**
 * GET /api/auth/me
 * Returns current user's profile (requires auth).
 */
async function me(req, res) {
  try {
    const user = await userService.findUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'not_found', message: 'User not found.' });
    const { password_hash, ...safe } = user;
    return res.json({ user: safe });
  } catch (err) {
    console.error('[Auth] Me error:', err);
    return res.status(500).json({ error: 'server_error', message: 'Could not fetch profile.' });
  }
}

/**
 * GET /api/auth/my-complaints
 * Returns current user's submitted complaints.
 */
async function myComplaints(req, res) {
  try {
    const cosmosService = require('../services/cosmosService');
    const complaints = await cosmosService.getAllComplaints({ user_id: req.user.sub });
    return res.json({ count: complaints.length, complaints });
  } catch (err) {
    console.error('[Auth] myComplaints error:', err);
    return res.status(500).json({ error: 'server_error', message: 'Could not fetch complaints.' });
  }
}

/**
 * POST /api/auth/admin/create-employee
 * Admin only — creates a municipality_employee account with a generated Employee ID.
 */
async function createEmployee(req, res) {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'validation_error', message: 'name, email, and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'validation_error', message: 'Password must be at least 8 characters.' });
  }

  try {
    const employee = await userService.createUser({
      name,
      email,
      password,
      phone,
      role: 'municipality_employee',
      created_by: req.user.sub,
    });

    return res.status(201).json({
      message: 'Municipality employee account created.',
      employee,
      employee_id: employee.employee_id,
    });
  } catch (err) {
    if (err.code === 'EMAIL_EXISTS') {
      return res.status(409).json({ error: 'email_exists', message: err.message });
    }
    console.error('[Auth] Create employee error:', err);
    return res.status(500).json({ error: 'server_error', message: 'Failed to create employee.' });
  }
}

/**
 * GET /api/auth/admin/users
 * Admin only — list all users with optional ?role= filter.
 */
async function listUsers(req, res) {
  try {
    const users = await userService.listUsers({ role: req.query.role });
    return res.json({ count: users.length, users });
  } catch (err) {
    console.error('[Auth] List users error:', err);
    return res.status(500).json({ error: 'server_error', message: 'Failed to list users.' });
  }
}

/**
 * PATCH /api/auth/admin/users/:id/role
 * Admin only — update a user's role.
 */
async function updateRole(req, res) {
  const { id } = req.params;
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'validation_error', message: 'role is required.' });

  // Admin cannot demote themselves
  if (id === req.user.sub && role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'You cannot change your own admin role.' });
  }

  try {
    const updated = await userService.updateUserRole(id, role);
    return res.json({ message: `Role updated to ${role}.`, user: updated });
  } catch (err) {
    return res.status(400).json({ error: 'update_error', message: err.message });
  }
}

/**
 * PATCH /api/auth/admin/users/:id/active
 * Admin only — activate or deactivate a user.
 */
async function setActive(req, res) {
  const { id } = req.params;
  const { is_active } = req.body;
  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'validation_error', message: 'is_active (boolean) required.' });
  }
  if (id === req.user.sub) {
    return res.status(403).json({ error: 'forbidden', message: 'You cannot deactivate your own account.' });
  }
  try {
    const updated = await userService.setUserActive(id, is_active);
    return res.json({ message: `Account ${is_active ? 'activated' : 'deactivated'}.`, user: updated });
  } catch (err) {
    return res.status(400).json({ error: 'update_error', message: err.message });
  }
}

/**
 * PATCH /api/auth/admin/users/:id/reset-password
 * Admin only — force-reset a user's password.
 */
async function adminResetPassword(req, res) {
  const { id } = req.params;
  const { new_password } = req.body;
  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'validation_error', message: 'new_password (≥8 chars) required.' });
  }
  try {
    await userService.resetPassword(id, new_password);
    return res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    return res.status(400).json({ error: 'update_error', message: err.message });
  }
}

/**
 * GET /api/auth/admin/employee-analytics
 * Admin only — employee performance analytics.
 */
async function employeeAnalytics(req, res) {
  try {
    const data = await userService.getEmployeeAnalytics();
    return res.json(data);
  } catch (err) {
    console.error('[Auth] Employee analytics error:', err);
    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch analytics.' });
  }
}

/**
 * PATCH /api/auth/profile
 * Authenticated — update own profile fields (phone, emergency contacts).
 */
async function updateProfile(req, res) {
  try {
    const { name, phone, emergency_contact_name, emergency_contact_phone } = req.body;
    const userId = req.user.sub;
    const fieldsToUpdate = {
      phone: phone || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null
    };
    if (name && typeof name === 'string' && name.trim()) {
      fieldsToUpdate.name = name.trim();
    }
    const updated = await userService.updateUserFields(userId, fieldsToUpdate);
    return res.json({ message: 'Profile updated successfully.', user: updated });
  } catch (err) {
    console.error('[Auth] updateProfile error:', err);
    return res.status(400).json({ error: 'update_error', message: err.message });
  }
}

module.exports = {
  register,
  login,
  refresh,
  me,
  myComplaints,
  createEmployee,
  listUsers,
  updateRole,
  setActive,
  adminResetPassword,
  employeeAnalytics,
  updateProfile,
};
