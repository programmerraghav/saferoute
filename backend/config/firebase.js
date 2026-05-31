'use strict';
/**
 * backend/config/firebase.js
 * Central Firebase initialization for Firebase Admin SDK (Firestore & Messaging).
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const env = require('./env');

let db = null;
let messaging = null;
let initialized = false;

try {
  let credential = null;

  // 1. Try loading from inline env variables first (ideal for easy env configuration)
  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    credential = admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  } 
  // 2. Fall back to the service account JSON file path if configured
  else if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.resolve(__dirname, '../../', env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      credential = admin.credential.cert(serviceAccount);
    }
  }

  if (credential) {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential,
      });
    }
    db = admin.firestore();
    messaging = admin.messaging();
    initialized = true;
    console.log('[Firebase] Admin SDK initialized successfully (Firestore & Messaging).');
  } else {
    console.warn('[Firebase] ⚠️ No valid Firebase credentials found (JSON file or env variables). running in mock/log-only mode.');
  }
} catch (err) {
  console.error('[Firebase] ❌ Failed to initialize Firebase Admin SDK:', err.message);
}

module.exports = {
  admin,
  db,
  messaging,
  initialized,
};
