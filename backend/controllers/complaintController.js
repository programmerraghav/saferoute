'use strict';
/**
 * backend/controllers/complaintController.js
 * Handles all pothole complaint logic.
 */

const { v4: uuidv4 } = require('uuid');
const yoloService = require('../services/yoloService');
const cosmosService = require('../services/cosmosService');
const eventHubService = require('../services/eventHubService');
const firebaseService = require('../services/firebaseService');
const gptService = require('../services/gptService');

/**
 * POST /api/complaints/register
 * multipart/form-data: image file + user_name + location_coords + vehicle_type
 */
async function registerComplaint(req, res) {
  try {
    // Validate inputs
    const { user_name, vehicle_type, description, road_name } = req.body;
    let location_coords;

    try {
      location_coords = JSON.parse(req.body.location_coords || '{}');
    } catch {
      return res.status(422).json({ error: 'invalid_input', message: 'location_coords must be valid JSON: {"lat":0,"lng":0}' });
    }

    if (!user_name || typeof user_name !== 'string') {
      return res.status(422).json({ error: 'invalid_input', message: 'user_name is required.' });
    }
    if (!location_coords.lat || !location_coords.lng) {
      return res.status(422).json({ error: 'invalid_input', message: 'location_coords must contain lat and lng.' });
    }
    if (!req.file) {
      return res.status(422).json({ error: 'invalid_input', message: 'An image file is required.' });
    }

    // Call YOLO service
    const yoloResult = await yoloService.analyzeImage(req.file.buffer, req.file.originalname, req.file.mimetype);

    if (yoloResult.error === 'model_unavailable') {
      return res.status(503).json({
        error: 'model_unavailable',
        message: 'The AI analysis server is currently unavailable. Please try again later.',
      });
    }

    // Generate AI summary (non-blocking — don't fail if GPT is down)
    let ai_summary = null;
    try {
      ai_summary = await gptService.generateComplaintSummary(
        yoloResult.severity,
        location_coords,
        description || '',
        yoloResult.pothole_type
      );
    } catch {
      // GPT failure is non-fatal
    }

    // Build complaint document
    const complaint_id = `CMP-${uuidv4().substring(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();
    const complaintDoc = {
      id: complaint_id,
      complaint_id,
      user_name,
      vehicle_type: vehicle_type || 'unknown',
      location_coords: {
        lat: parseFloat(location_coords.lat),
        lng: parseFloat(location_coords.lng),
      },
      road_name: road_name || null,
      description: description || null,
      ai_summary,
      confirmed: yoloResult.confirmed,
      severity: yoloResult.severity,
      confidence: yoloResult.confidence,
      pothole_type: yoloResult.pothole_type,
      bbox: yoloResult.bbox,
      status: 'pending',
      created_at: now,
      updated_at: now,
      sla_deadline: new Date(Date.now() + parseInt(process.env.COMPLAINT_RESOLUTION_SLA_HOURS || '24') * 3600000).toISOString(),
    };

    // Save to CosmosDB
    const saved = await cosmosService.createComplaint(complaintDoc);

    // Publish to Event Hub (fire-and-forget)
    eventHubService.publishEvent('complaint.created', { complaint_id, severity: yoloResult.severity, location_coords }).catch(console.error);

    // Send nearby driver alerts (fire-and-forget — tokens would come from user DB in prod)
    firebaseService.sendPotholeNearbyAlert({
      location_coords,
      vehicle_type: vehicle_type || 'car',
      complaint_id,
      severity: yoloResult.severity,
      tokens: [], // populate from registered device DB in production
    }).catch(console.error);

    return res.status(201).json({
      complaint_id,
      severity: yoloResult.severity,
      pothole_type: yoloResult.pothole_type,
      confidence: yoloResult.confidence,
      confirmed: yoloResult.confirmed,
      bbox: yoloResult.bbox,
      ai_summary,
      status: 'pending',
      message: `Complaint registered. Municipality alerted. Expected action within ${process.env.COMPLAINT_RESOLUTION_SLA_HOURS || 24} hours.`,
    });
  } catch (err) {
    console.error('[complaintController] registerComplaint error:', err);
    return res.status(500).json({ error: 'server_error', message: 'An internal error occurred.' });
  }
}

/**
 * GET /api/complaints/:id
 */
async function getComplaint(req, res) {
  try {
    const { id } = req.params;
    const complaint = await cosmosService.getComplaint(id);
    if (!complaint) {
      return res.status(404).json({ error: 'not_found', message: `Complaint ${id} not found.` });
    }
    return res.json(complaint);
  } catch (err) {
    console.error('[complaintController] getComplaint error:', err);
    return res.status(500).json({ error: 'server_error', message: 'An internal error occurred.' });
  }
}

/**
 * GET /api/complaints?lat=&lng=&radius=
 */
async function getComplaintsByLocation(req, res) {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) {
      return res.status(422).json({ error: 'invalid_input', message: 'lat and lng query params are required.' });
    }
    const radiusMeters = parseFloat(radius) || 1000;
    const complaints = await cosmosService.getComplaintsByRadius(parseFloat(lat), parseFloat(lng), radiusMeters);
    return res.json({ count: complaints.length, complaints });
  } catch (err) {
    console.error('[complaintController] getComplaintsByLocation error:', err);
    return res.status(500).json({ error: 'server_error', message: 'An internal error occurred.' });
  }
}

/**
 * PATCH /api/complaints/:id/status
 * Body: { status: 'pending' | 'in_progress' | 'resolved' }
 */
async function updateComplaintStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['pending', 'in_progress', 'resolved'];
    if (!allowed.includes(status)) {
      return res.status(422).json({ error: 'invalid_input', message: `status must be one of: ${allowed.join(', ')}` });
    }
    const updated = await cosmosService.updateComplaintStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: 'not_found', message: `Complaint ${id} not found.` });
    }
    return res.json({ complaint_id: id, status, updated_at: updated.updated_at });
  } catch (err) {
    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: 'not_found', message: err.message });
    }
    console.error('[complaintController] updateComplaintStatus error:', err);
    return res.status(500).json({ error: 'server_error', message: 'An internal error occurred.' });
  }
}

module.exports = { registerComplaint, getComplaint, getComplaintsByLocation, updateComplaintStatus };
