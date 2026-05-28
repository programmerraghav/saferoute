'use strict';
/**
 * backend/middleware/auth.js
 * JWT authentication middleware.
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
      return res.status(401).json({ error: 'Unauthorized', message: 'Token expired.' });
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

module.exports = { authenticate, optionalAuthenticate };
