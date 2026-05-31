'use strict';
/**
 * backend/server.js
 * SafeRoute Express + WebSocket application entry point.
 *
 * WebSocket endpoint: ws://localhost:3000/ws/potholes
 *   - Clients subscribe by sending: { type: 'subscribe', lat, lng, radius_km }
 *   - Server pushes:               { type: 'new_pothole', complaint }
 *   - Server pings every 30s to keep alive
 */

// Load and validate environment first — exits with error if vars are missing
const env = require('./config/env');

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const WebSocket = require('ws');

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const sosRoutes = require('./routes/sos');
const alertRoutes = require('./routes/alerts');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const server = http.createServer(app);

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
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: env.APP_NAME,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    websocket: `ws://localhost:${env.APP_PORT}/ws/potholes`,
    yolo_url: env.YOLO_API_URL,
    maps_default: { city: env.MAPS_DEFAULT_CITY, lat: env.MAPS_DEFAULT_LAT, lng: env.MAPS_DEFAULT_LNG },
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Frontend SPA Catch-all ────────────────────────────────────────────────────
// Serve index.html (Vite built version)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('[SafeRoute] Could not serve index.html:', err.message);
      res.status(500).send('Frontend build not found. Run "npm run build" in the frontend/ directory.');
    }
  });
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

// ── WebSocket Server: Real-time Pothole Map ───────────────────────────────────
const wss = new WebSocket.Server({ server, path: '/ws/potholes' });

// Haversine distance in km
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Each connected client stores its subscription: { lat, lng, radius_km }
const clients = new Map(); // ws → { lat, lng, radius_km }

wss.on('connection', (ws, req) => {
  console.log(`[WS] Client connected from ${req.socket.remoteAddress}`);
  clients.set(ws, null); // subscription pending

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'subscribe') {
        const { lat, lng, radius_km = 1 } = msg;
        if (typeof lat !== 'number' || typeof lng !== 'number') {
          ws.send(JSON.stringify({ type: 'error', message: 'lat and lng required as numbers.' }));
          return;
        }
        clients.set(ws, { lat, lng, radius_km: Math.min(radius_km, 10) });
        ws.send(JSON.stringify({ type: 'subscribed', lat, lng, radius_km: Math.min(radius_km, 10) }));
        console.log(`[WS] Client subscribed @ ${lat},${lng} r=${radius_km}km`);
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON.' }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('[WS] Client disconnected.');
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
    clients.delete(ws);
  });

  // Send initial ping
  ws.send(JSON.stringify({ type: 'connected', message: 'SafeRoute live pothole feed. Send subscribe message.' }));
});

// Keep-alive pings every 30s
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
    }
  });
}, 30000);

wss.on('close', () => clearInterval(pingInterval));

/**
 * Broadcast a new pothole complaint to all subscribed clients within range.
 * Called by complaintController after a successful registration.
 * @param {object} complaint - Full complaint object with location_coords.
 */
function broadcastPothole(complaint) {
  if (!complaint?.location_coords?.lat) return;
  const { lat, lng } = complaint.location_coords;

  let sent = 0;
  clients.forEach((sub, ws) => {
    if (!sub || ws.readyState !== WebSocket.OPEN) return;
    const dist = haversineKm(sub.lat, sub.lng, lat, lng);
    if (dist <= sub.radius_km) {
      ws.send(JSON.stringify({ type: 'new_pothole', complaint, distance_km: Math.round(dist * 100) / 100 }));
      sent++;
    }
  });
  if (sent > 0) console.log(`[WS] Broadcast new pothole to ${sent} client(s).`);
}

// ── Start Server ──────────────────────────────────────────────────────────────

let currentPort = env.APP_PORT || 3000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`\n⚠️  Port ${currentPort} is in use, trying ${currentPort + 1}...`);
    currentPort++;
    server.listen(currentPort);
  } else {
    console.error('[SafeRoute] Server error:', err.message);
    process.exit(1);
  }
});

server.listen(currentPort, () => {
  const originalPort = env.APP_PORT || 3000;
  env.APP_PORT = currentPort; // Update env for health check
  console.log(`\n🚦 SafeRoute backend running at http://localhost:${currentPort}`);
  console.log(`   WebSocket feed:             ws://localhost:${currentPort}/ws/potholes`);
  console.log(`   YOLO ML server expected at: ${env.YOLO_API_URL}`);
  console.log(`   Firebase Database:          ${env.FIREBASE_PROJECT_ID || 'Unknown Project'}`);
  console.log(`   Maps default city:          ${env.MAPS_DEFAULT_CITY}\n`);
  if (currentPort !== originalPort) {
    console.log(`\nℹ️  Note: Backend port changed to ${currentPort}. You may need to update vite.config.js proxy!`);
  }
});


// ── Graceful Shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[SafeRoute] Received ${signal} — shutting down gracefully...`);
  clearInterval(pingInterval);
  wss.close(() => console.log('[SafeRoute] WebSocket server closed.'));
  server.close(() => {
    console.log('[SafeRoute] HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, broadcastPothole };
