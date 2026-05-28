'use strict';
/**
 * backend/server.js
 * SafeRoute Express application entry point.
 */

// Load and validate environment first — exits with error if vars are missing
const env = require('./config/env');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const complaintRoutes = require('./routes/complaints');
const sosRoutes = require('./routes/sos');
const alertRoutes = require('./routes/alerts');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// ── Security & Logging Middleware ─────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // relaxed for dev; tighten in prod
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many requests. Please wait and try again.' },
});
app.use('/api', apiLimiter);

// ── Static Frontend Serving ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: env.APP_NAME,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    yolo_url: env.YOLO_API_URL,
    maps_default: { city: env.MAPS_DEFAULT_CITY, lat: env.MAPS_DEFAULT_LAT, lng: env.MAPS_DEFAULT_LNG },
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/complaints', complaintRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Frontend SPA Catch-all ────────────────────────────────────────────────────
// Serve index.html with server-side config injection
app.get('*', (req, res) => {
  const fs = require('fs');
  const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');
  try {
    let html = fs.readFileSync(indexPath, 'utf8');
    // Inject environment config into data-* attributes and script tag
    html = html
      .replace(/%%GOOGLE_MAPS_API_KEY%%/g, env.GOOGLE_MAPS_API_KEY)
      .replace(/%%MAPS_DEFAULT_LAT%%/g, String(env.MAPS_DEFAULT_LAT))
      .replace(/%%MAPS_DEFAULT_LNG%%/g, String(env.MAPS_DEFAULT_LNG))
      .replace(/%%NEARBY_ALERT_RADIUS_CAR%%/g, String(env.NEARBY_ALERT_RADIUS_CAR))
      .replace(/%%NEARBY_ALERT_RADIUS_BIKE%%/g, String(env.NEARBY_ALERT_RADIUS_BIKE));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[SafeRoute] Could not serve index.html:', err.message);
    res.status(500).send('Frontend not found. Run the app from the saferoute/ directory.');
  }
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[SafeRoute] Unhandled error:', err);
  res.status(500).json({
    error: 'server_error',
    message: env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.',
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const server = app.listen(env.APP_PORT, () => {
  console.log(`\n🚦 SafeRoute backend running at http://localhost:${env.APP_PORT}`);
  console.log(`   YOLO ML server expected at: ${env.YOLO_API_URL}`);
  console.log(`   CosmosDB database:          ${env.COSMOS_DATABASE}`);
  console.log(`   Maps default city:          ${env.MAPS_DEFAULT_CITY}\n`);
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[SafeRoute] Received ${signal} — shutting down gracefully...`);
  server.close(() => {
    console.log('[SafeRoute] HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
