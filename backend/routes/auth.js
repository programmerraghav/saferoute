'use strict';
/**
 * backend/routes/auth.js
 * Authentication REST routes.
 *
 * Public:
 *   POST /api/auth/register       — create user account
 *   POST /api/auth/login          — login (all roles)
 *   POST /api/auth/refresh        — refresh access token
 *
 * Authenticated:
 *   GET  /api/auth/me             — get own profile
 *
 * Admin only:
 *   POST   /api/auth/admin/create-employee
 *   GET    /api/auth/admin/users
 *   PATCH  /api/auth/admin/users/:id/role
 *   PATCH  /api/auth/admin/users/:id/active
 *   PATCH  /api/auth/admin/users/:id/reset-password
 *   GET    /api/auth/admin/employee-analytics
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);

// ── Authenticated ──────────────────────────────────────────────────────────────
router.get('/me', authenticate, ctrl.me);
router.patch('/profile', authenticate, ctrl.updateProfile);
router.get('/my-complaints', authenticate, ctrl.myComplaints);

// ── Admin only ─────────────────────────────────────────────────────────────────
router.post('/admin/create-employee', authenticate, requireAdmin, ctrl.createEmployee);
router.get('/admin/users', authenticate, requireAdmin, ctrl.listUsers);
router.patch('/admin/users/:id/role', authenticate, requireAdmin, ctrl.updateRole);
router.patch('/admin/users/:id/active', authenticate, requireAdmin, ctrl.setActive);
router.patch('/admin/users/:id/reset-password', authenticate, requireAdmin, ctrl.adminResetPassword);
router.get('/admin/employee-analytics', authenticate, requireAdmin, ctrl.employeeAnalytics);

module.exports = router;
