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
  'COSMOS_ENDPOINT',
  'COSMOS_KEY',
  'COSMOS_DATABASE',
  'COSMOS_CONTAINER_COMPLAINTS',
  'COSMOS_CONTAINER_SOS',
  'COSMOS_CONTAINER_USERS',
  'EVENTHUB_CONNECTION_STRING',
  'EVENTHUB_NAME',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'GOOGLE_MAPS_API_KEY',
  'FIREBASE_SERVER_KEY',
  'FIREBASE_PROJECT_ID',
  'NEARBY_ALERT_RADIUS_BIKE',
  'NEARBY_ALERT_RADIUS_CAR',
  'EMERGENCY_AMBULANCE',
  'EMERGENCY_POLICE',
  'SOS_CANCEL_WINDOW_SECONDS',
  'SOS_STATIONARY_THRESHOLD_MINUTES',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'COMPLAINT_RESOLUTION_SLA_HOURS',
];

const missing = required.filter((key) => !process.env[key]);
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

  // CosmosDB
  COSMOS_ENDPOINT: process.env.COSMOS_ENDPOINT,
  COSMOS_KEY: process.env.COSMOS_KEY,
  COSMOS_DATABASE: process.env.COSMOS_DATABASE,
  COSMOS_CONTAINER_COMPLAINTS: process.env.COSMOS_CONTAINER_COMPLAINTS,
  COSMOS_CONTAINER_SOS: process.env.COSMOS_CONTAINER_SOS,
  COSMOS_CONTAINER_USERS: process.env.COSMOS_CONTAINER_USERS,

  // Event Hub
  EVENTHUB_CONNECTION_STRING: process.env.EVENTHUB_CONNECTION_STRING,
  EVENTHUB_NAME: process.env.EVENTHUB_NAME,

  // Twilio
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,

  // Maps
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  MAPS_DEFAULT_CITY: process.env.MAPS_DEFAULT_CITY || 'Vapi',
  MAPS_DEFAULT_LAT: parseFloat(process.env.MAPS_DEFAULT_LAT || '20.3893'),
  MAPS_DEFAULT_LNG: parseFloat(process.env.MAPS_DEFAULT_LNG || '72.9106'),

  // Firebase
  FIREBASE_SERVER_KEY: process.env.FIREBASE_SERVER_KEY,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  NEARBY_ALERT_RADIUS_BIKE: parseInt(process.env.NEARBY_ALERT_RADIUS_BIKE, 10),
  NEARBY_ALERT_RADIUS_CAR: parseInt(process.env.NEARBY_ALERT_RADIUS_CAR, 10),

  // Emergency
  EMERGENCY_AMBULANCE: process.env.EMERGENCY_AMBULANCE,
  EMERGENCY_POLICE: process.env.EMERGENCY_POLICE,
  SOS_CANCEL_WINDOW_SECONDS: parseInt(process.env.SOS_CANCEL_WINDOW_SECONDS, 10),
  SOS_STATIONARY_THRESHOLD_MINUTES: parseInt(process.env.SOS_STATIONARY_THRESHOLD_MINUTES, 10),

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,

  // Municipality
  MUNICIPALITY_WEBHOOK_URL: process.env.MUNICIPALITY_WEBHOOK_URL,
  COMPLAINT_RESOLUTION_SLA_HOURS: parseInt(process.env.COMPLAINT_RESOLUTION_SLA_HOURS, 10),
};

console.log(`[SafeRoute] ✅ Environment loaded — ${env.APP_NAME} (${env.NODE_ENV})`);

module.exports = env;
