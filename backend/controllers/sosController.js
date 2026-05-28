'use strict';
/**
 * backend/controllers/sosController.js
 * SOS trigger, cancel, and retrieval logic.
 */

const { v4: uuidv4 } = require('uuid');
const cosmosService = require('../services/cosmosService');
const twilioService = require('../services/twilioService');
const eventHubService = require('../services/eventHubService');
const gptService = require('../services/gptService');
const env = require('../config/env');

/**
 * POST /api/sos/trigger
 * Body: { user_name, location_coords, vehicle_type, contact_phone }
 */
async function triggerSOS(req, res) {
  try {
    const { user_name, vehicle_type, contact_phone } = req.body;
    let location_coords;

    try {
      location_coords =
        typeof req.body.location_coords === 'string'
          ? JSON.parse(req.body.location_coords)
          : req.body.location_coords;
    } catch {
      return res.status(422).json({ error: 'invalid_input', message: 'location_coords must be valid JSON: {"lat":0,"lng":0}' });
    }

    if (!user_name || typeof user_name !== 'string') {
      return res.status(422).json({ error: 'invalid_input', message: 'user_name is required.' });
    }
    if (!location_coords?.lat || !location_coords?.lng) {
      return res.status(422).json({ error: 'invalid_input', message: 'location_coords must contain lat and lng.' });
    }
    if (!contact_phone || typeof contact_phone !== 'string') {
      return res.status(422).json({ error: 'invalid_input', message: 'contact_phone is required.' });
    }

    // Create SOS document
    const sos_id = `SOS-${uuidv4().substring(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const sosDoc = {
      id: sos_id,
      sos_id,
      user_name,
      vehicle_type: vehicle_type || 'unknown',
      location_coords: {
        lat: parseFloat(location_coords.lat),
        lng: parseFloat(location_coords.lng),
      },
      contact_phone,
      status: 'triggered',
      triggered_at: now,
      cancel_window_expires: new Date(Date.now() + env.SOS_CANCEL_WINDOW_SECONDS * 1000).toISOString(),
      call_chain: [],
    };

    // Save initial SOS record immediately (before chain completes)
    await cosmosService.createSOSEvent(sosDoc);

    // Publish to Event Hub (fire-and-forget)
    eventHubService.publishEvent('sos.triggered', {
      sos_id,
      user_name,
      location_coords: sosDoc.location_coords,
    }).catch(console.error);

    // Return immediately so client can show cancel countdown
    // Trigger emergency chain asynchronously
    res.status(201).json({
      sos_id,
      status: 'triggered',
      cancel_window_seconds: env.SOS_CANCEL_WINDOW_SECONDS,
      cancel_window_expires: sosDoc.cancel_window_expires,
      contacts_alerted: [contact_phone, env.EMERGENCY_AMBULANCE, env.EMERGENCY_POLICE],
      message: `SOS activated. Emergency contacts being alerted. You have ${env.SOS_CANCEL_WINDOW_SECONDS} seconds to cancel.`,
    });

    // After responding, run the emergency chain asynchronously
    setImmediate(async () => {
      try {
        const { steps } = await twilioService.triggerEmergencyChain(
          contact_phone,
          sosDoc.location_coords,
          user_name
        );
        // Update the SOS record with call chain results
        const existing = await cosmosService.getSOSEvent(sos_id);
        if (existing && existing.status === 'triggered') {
          // Only update if not cancelled
          const { sos } = await cosmosService._getContainers
            ? await cosmosService._getContainers()
            : {};
          // Update via service — re-read and update
          const updatedDoc = { ...existing, call_chain: steps, chain_completed_at: new Date().toISOString() };
          // Direct cosmos update
          const { CosmosClient } = require('@azure/cosmos');
          const client = new CosmosClient({ endpoint: env.COSMOS_ENDPOINT, key: env.COSMOS_KEY });
          await client
            .database(env.COSMOS_DATABASE)
            .container(env.COSMOS_CONTAINER_SOS)
            .item(existing.id, existing.id)
            .replace(updatedDoc);
        }
      } catch (chainErr) {
        console.error('[sosController] Emergency chain error:', chainErr.message);
      }
    });
  } catch (err) {
    console.error('[sosController] triggerSOS error:', err);
    return res.status(500).json({ error: 'server_error', message: 'An internal error occurred.' });
  }
}

/**
 * POST /api/sos/cancel
 * Body: { sos_id }
 */
async function cancelSOS(req, res) {
  try {
    const { sos_id } = req.body;
    if (!sos_id) {
      return res.status(422).json({ error: 'invalid_input', message: 'sos_id is required.' });
    }

    const cancelled = await cosmosService.cancelSOS(sos_id);
    eventHubService.publishEvent('sos.cancelled', { sos_id }).catch(console.error);

    return res.json({
      cancelled: true,
      sos_id,
      cancelled_at: cancelled.cancelled_at,
      message: 'SOS cancelled successfully.',
    });
  } catch (err) {
    if (err.code === 'CANCEL_WINDOW_EXPIRED') {
      return res.status(409).json({ error: 'cancel_window_expired', message: err.message });
    }
    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: 'not_found', message: err.message });
    }
    console.error('[sosController] cancelSOS error:', err);
    return res.status(500).json({ error: 'server_error', message: 'An internal error occurred.' });
  }
}

/**
 * GET /api/sos/:id
 */
async function getSOSEvent(req, res) {
  try {
    const { id } = req.params;
    const event = await cosmosService.getSOSEvent(id);
    if (!event) {
      return res.status(404).json({ error: 'not_found', message: `SOS event ${id} not found.` });
    }
    return res.json(event);
  } catch (err) {
    console.error('[sosController] getSOSEvent error:', err);
    return res.status(500).json({ error: 'server_error', message: 'An internal error occurred.' });
  }
}

module.exports = { triggerSOS, cancelSOS, getSOSEvent };
