'use strict';
/**
 * backend/config/env.js
 * Loads, validates, and exports all environment variables.
 * Throws a clear error at startup if any required variable is missing.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const required = [
  'APP_PORT',
  'YOLO_API_URL',
  'YOLO_CONFIDENCE_THRESHOLD',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  // GOOGLE_MAPS_API_KEY removed — Leaflet/OpenStreetMap needs no API key
  'NEARBY_ALERT_RADIUS_BIKE',
  'NEARBY_ALERT_RADIUS_CAR',
  'EMERGENCY_AMBULANCE',
  'EMERGENCY_POLICE',
  'SOS_CANCEL_WINDOW_SECONDS',
  'SOS_STATIONARY_THRESHOLD_MINUTES',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_SECRET',
  'COMPLAINT_RESOLUTION_SLA_HOURS',
];

const missing = required.filter((key) => !process.env[key]);

// Custom check for Firebase credentials:
// Must have either FIREBASE_SERVICE_ACCOUNT_PATH or the three direct credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
const hasJsonPath = !!process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const hasDirectKeys = !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

if (!hasJsonPath && !hasDirectKeys) {
  missing.push('FIREBASE_SERVICE_ACCOUNT_PATH or (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)');
}

if (missing.length > 0) {
  console.error(
    `[SafeRoute] ❌ Missing required environment variables:\n  ${missing.join('\n  ')}\n\n` +
      `Copy .env.example to .env and fill in all values before starting.`
  );
  process.exit(1);
}

const env = {
  // App
  APP_NAME: process.env.APP_NAME || 'SafeRoute',
  APP_PORT: parseInt(process.env.APP_PORT, 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // YOLO
  YOLO_MODEL_PATH: process.env.YOLO_MODEL_PATH,
  YOLO_API_URL: process.env.YOLO_API_URL,
  YOLO_CONFIDENCE_THRESHOLD: parseFloat(process.env.YOLO_CONFIDENCE_THRESHOLD),

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,

  // Maps
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  MAPS_DEFAULT_CITY: process.env.MAPS_DEFAULT_CITY || 'Vapi',
  MAPS_DEFAULT_LAT: parseFloat(process.env.MAPS_DEFAULT_LAT || '20.3893'),
  MAPS_DEFAULT_LNG: parseFloat(process.env.MAPS_DEFAULT_LNG || '72.9106'),

  // Firebase
  FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || null,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || null,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || null,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || null,
  NEARBY_ALERT_RADIUS_BIKE: parseInt(process.env.NEARBY_ALERT_RADIUS_BIKE, 10),
  NEARBY_ALERT_RADIUS_CAR: parseInt(process.env.NEARBY_ALERT_RADIUS_CAR, 10),

  // Emergency
  EMERGENCY_AMBULANCE: process.env.EMERGENCY_AMBULANCE,
  EMERGENCY_POLICE: process.env.EMERGENCY_POLICE,
  SOS_CANCEL_WINDOW_SECONDS: parseInt(process.env.SOS_CANCEL_WINDOW_SECONDS, 10),
  SOS_STATIONARY_THRESHOLD_MINUTES: parseInt(process.env.SOS_STATIONARY_THRESHOLD_MINUTES, 10),

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  EMPLOYEE_INVITE_CODE: process.env.EMPLOYEE_INVITE_CODE || '',

  // Municipality
  MUNICIPALITY_WEBHOOK_URL: process.env.MUNICIPALITY_WEBHOOK_URL,
  COMPLAINT_RESOLUTION_SLA_HOURS: parseInt(process.env.COMPLAINT_RESOLUTION_SLA_HOURS, 10),
};

console.log(`[SafeRoute] ✅ Environment loaded — ${env.APP_NAME} (${env.NODE_ENV})`);

module.exports = env;
