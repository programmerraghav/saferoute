'use strict';
/**
 * backend/middleware/auth.js
 * JWT authentication + role-based access control middleware.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Middleware: verify Bearer JWT in Authorization header.
 * Attaches decoded payload to req.user on success.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Bearer token required.' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'token_expired', message: 'Access token expired. Refresh it.' });
    }
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token.' });
  }
}

/**
 * Optional authentication — does not block if no token present.
 * Attaches req.user if a valid token is provided.
 */
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      req.user = jwt.verify(token, env.JWT_SECRET);
    } catch {
      // ignore invalid optional token
    }
  }
  return next();
}

/**
 * Role-based access control middleware factory.
 * Usage: router.get('/admin-only', authenticate, requireRole('admin'), handler)
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'municipality_employee')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of these roles: ${roles.join(', ')}. Your role: ${req.user.role}.`,
      });
    }
    return next();
  };
}

/**
 * Convenience shortcuts for common role guards.
 */
const requireAdmin = requireRole('admin');
const requireMunicipality = requireRole('admin', 'municipality_employee');

module.exports = { authenticate, optionalAuthenticate, requireRole, requireAdmin, requireMunicipality };
