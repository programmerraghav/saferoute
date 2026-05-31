'use strict';
/**
 * backend/services/firebaseService.js
 * Firebase Cloud Messaging (FCM) push notification service.
 * Uses the shared initialized admin instance from central firebase config.
 */

const firebaseConfig = require('../config/firebase');
const env = require('../config/env');

/**
 * Send a push notification to a list of FCM device tokens.
 *
 * @param {object} params
 * @param {string}   params.title        - Notification title.
 * @param {string}   params.body         - Notification body.
 * @param {object}   [params.data]       - Optional key-value data payload.
 * @param {string[]} params.tokens       - Array of FCM registration tokens.
 * @returns {Promise<{notified_count:number, failed_count:number}>}
 */
async function sendNearbyAlert({ title, body, data = {}, tokens }) {
  if (!tokens || tokens.length === 0) {
    return { notified_count: 0, failed_count: 0 };
  }

  // Ensure all data values are string types (required by FCM V1)
  const stringData = {};
  for (const [key, value] of Object.entries(data)) {
    stringData[key] = String(value);
  }

  const messaging = firebaseConfig.messaging;

  // Mock / Log-only mode if SDK is not initialized
  if (!messaging) {
    console.log(`[firebaseService] [MOCK] Sending push to ${tokens.length} tokens: "${title}" - ${body}`);
    return { notified_count: tokens.length, failed_count: 0 };
  }

  try {
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      data: stringData,
    });

    console.log(`[firebaseService] Sent ${response.successCount} notifications, ${response.failureCount} failed.`);
    return { notified_count: response.successCount, failed_count: response.failureCount };
  } catch (err) {
    console.error('[firebaseService] FCM send multicast failed:', err.message);
    return { notified_count: 0, failed_count: tokens.length, error: err.message };
  }
}

/**
 * Send a pothole nearby alert to all devices within a given radius.
 * In a real app, you would query registered device tokens from your user DB.
 * Here we send to a pre-registered topic channel.
 *
 * @param {object} params
 * @param {{lat:number,lng:number}} params.location_coords
 * @param {string}  params.vehicle_type  - 'bike' or 'car'
 * @param {string}  params.complaint_id
 * @param {number}  params.severity
 * @param {string[]} [params.tokens]     - Device tokens (from DB query in production).
 */
async function sendPotholeNearbyAlert({ location_coords, vehicle_type, complaint_id, severity, tokens = [] }) {
  const radius = vehicle_type === 'bike' ? env.NEARBY_ALERT_RADIUS_BIKE : env.NEARBY_ALERT_RADIUS_CAR;
  const severityLabel = severity >= 7 ? '🔴 HIGH' : severity >= 4 ? '🟡 MEDIUM' : '🟢 LOW';

  return sendNearbyAlert({
    title: `⚠️ Pothole Alert — ${severityLabel} severity`,
    body: `A pothole (severity ${severity}/10) has been reported ${radius}m ahead. Drive carefully.`,
    data: {
      type: 'pothole_nearby',
      complaint_id,
      severity: String(severity),
      lat: String(location_coords.lat),
      lng: String(location_coords.lng),
      radius: String(radius),
    },
    tokens,
  });
}

module.exports = { sendNearbyAlert, sendPotholeNearbyAlert };
