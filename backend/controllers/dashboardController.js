'use strict';
/**
 * backend/controllers/dashboardController.js
 * Municipality dashboard data endpoints.
 */

const cosmosService = require('../services/cosmosService');

/**
 * GET /api/dashboard/complaints
 * Query params: ?status=pending&severity_min=7
 */
async function getDashboardComplaints(req, res) {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.severity_min !== undefined) filters.severity_min = parseInt(req.query.severity_min, 10);

    const complaints = await cosmosService.getAllComplaints(filters);

    // Return only the fields needed for map rendering
    const mapped = complaints.map((c) => ({
      complaint_id: c.complaint_id,
      location_coords: c.location_coords,
      severity: c.severity,
      pothole_type: c.pothole_type,
      status: c.status,
      road_name: c.road_name,
      user_name: c.user_name,
      vehicle_type: c.vehicle_type,
      ai_summary: c.ai_summary,
      created_at: c.created_at,
      updated_at: c.updated_at,
      sla_deadline: c.sla_deadline,
      bbox: c.bbox,
    }));

    return res.json({ count: mapped.length, complaints: mapped });
  } catch (err) {
    console.error('[dashboardController] getDashboardComplaints error:', err);
    return res.status(500).json({ error: 'server_error', message: 'An internal error occurred.' });
  }
}

/**
 * GET /api/dashboard/hotspots
 * Returns top 10 worst road segments clustered by ~1 km grid cells.
 */
async function getHotspots(req, res) {
  try {
    const hotspots = await cosmosService.getHotspots();
    return res.json({ count: hotspots.length, hotspots });
  } catch (err) {
    console.error('[dashboardController] getHotspots error:', err);
    return res.status(500).json({ error: 'server_error', message: 'An internal error occurred.' });
  }
}

/**
 * GET /api/dashboard/stats
 */
async function getStats(req, res) {
  try {
    const stats = await cosmosService.getStats();
    return res.json(stats);
  } catch (err) {
    console.error('[dashboardController] getStats error:', err);
    return res.status(500).json({ error: 'server_error', message: 'An internal error occurred.' });
  }
}

module.exports = { getDashboardComplaints, getHotspots, getStats };
