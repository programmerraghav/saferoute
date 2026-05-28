'use strict';
/**
 * backend/services/firebaseService.js
 * Firebase Cloud Messaging (FCM) push notification service.
 * Uses the legacy FCM HTTP API v1 with the FIREBASE_SERVER_KEY.
 */

const axios = require('axios');
const env = require('../config/env');

const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

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

  const payload = {
    registration_ids: tokens,
    notification: {
      title,
      body,
      icon: '/public/assets/icon-192.png',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
    priority: 'high',
  };

  try {
    const response = await axios.post(FCM_URL, payload, {
      headers: {
        Authorization: `key=${env.FIREBASE_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const { success, failure } = response.data;
    console.log(`[firebaseService] Sent ${success} notifications, ${failure} failed.`);
    return { notified_count: success, failed_count: failure };
  } catch (err) {
    console.error('[firebaseService] FCM request failed:', err.message);
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
