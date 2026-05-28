'use strict';
/**
 * backend/controllers/alertController.js
 * Sends nearby driver push notifications for pothole alerts.
 */

const firebaseService = require('../services/firebaseService');
const env = require('../config/env');

/**
 * POST /api/alerts/nearby
 * Body: { location_coords, vehicle_type, complaint_id, severity, tokens? }
 */
async function sendNearbyAlert(req, res) {
  try {
    const { vehicle_type, complaint_id, severity, tokens } = req.body;
    let location_coords;

    try {
      location_coords =
        typeof req.body.location_coords === 'string'
          ? JSON.parse(req.body.location_coords)
          : req.body.location_coords;
    } catch {
      return res.status(422).json({ error: 'invalid_input', message: 'location_coords must be valid JSON.' });
    }

    if (!location_coords?.lat || !location_coords?.lng) {
      return res.status(422).json({ error: 'invalid_input', message: 'location_coords with lat and lng is required.' });
    }
    if (!complaint_id) {
      return res.status(422).json({ error: 'invalid_input', message: 'complaint_id is required.' });
    }
    if (severity === undefined || severity === null) {
      return res.status(422).json({ error: 'invalid_input', message: 'severity is required.' });
    }

    const radius =
      vehicle_type === 'bike'
        ? env.NEARBY_ALERT_RADIUS_BIKE
        : env.NEARBY_ALERT_RADIUS_CAR;

    // In production, query the user DB for device tokens within `radius` metres.
    // The caller may supply explicit tokens for testing.
    const deviceTokens = Array.isArray(tokens) ? tokens : [];

    const result = await firebaseService.sendPotholeNearbyAlert({
      location_coords: {
        lat: parseFloat(location_coords.lat),
        lng: parseFloat(location_coords.lng),
      },
      vehicle_type: vehicle_type || 'car',
      complaint_id,
      severity: parseInt(severity, 10),
      tokens: deviceTokens,
    });

    return res.json({
      notified_count: result.notified_count,
      radius_meters: radius,
      vehicle_type: vehicle_type || 'car',
      complaint_id,
    });
  } catch (err) {
    console.error('[alertController] sendNearbyAlert error:', err);
    return res.status(500).json({ error: 'server_error', message: 'An internal error occurred.' });
  }
}

module.exports = { sendNearbyAlert };
