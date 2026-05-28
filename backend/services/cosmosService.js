'use strict';
/**
 * backend/services/cosmosService.js
 * Azure CosmosDB service — wraps all read/write operations for the app.
 */

const { CosmosClient } = require('@azure/cosmos');
const env = require('../config/env');

let _client = null;
let _db = null;
let _containers = {};

/**
 * Lazy-initialise the CosmosDB client and cache containers.
 */
async function getContainers() {
  if (_db) return _containers;

  _client = new CosmosClient({
    endpoint: env.COSMOS_ENDPOINT,
    key: env.COSMOS_KEY,
  });

  _db = _client.database(env.COSMOS_DATABASE);

  _containers.complaints = _db.container(env.COSMOS_CONTAINER_COMPLAINTS);
  _containers.sos = _db.container(env.COSMOS_CONTAINER_SOS);
  _containers.users = _db.container(env.COSMOS_CONTAINER_USERS);

  return _containers;
}

// ── COMPLAINTS ────────────────────────────────────────────────────────────────

async function createComplaint(complaintDoc) {
  const { complaints } = await getContainers();
  const { resource } = await complaints.items.create(complaintDoc);
  return resource;
}

async function getComplaint(complaint_id) {
  const { complaints } = await getContainers();
  const querySpec = {
    query: 'SELECT * FROM c WHERE c.complaint_id = @id',
    parameters: [{ name: '@id', value: complaint_id }],
  };
  const { resources } = await complaints.items.query(querySpec).fetchAll();
  return resources[0] || null;
}

async function updateComplaintStatus(complaint_id, status) {
  const { complaints } = await getContainers();
  const existing = await getComplaint(complaint_id);
  if (!existing) throw new Error(`Complaint ${complaint_id} not found`);
  const updated = { ...existing, status, updated_at: new Date().toISOString() };
  const { resource } = await complaints.item(existing.id, existing.id).replace(updated);
  return resource;
}

async function getComplaintsByRadius(lat, lng, radiusMeters) {
  const { complaints } = await getContainers();
  // CosmosDB geospatial queries require a spatial index;
  // fall back to application-level haversine filter.
  const { resources } = await complaints.items
    .query('SELECT * FROM c WHERE c.status != "deleted"')
    .fetchAll();

  return resources.filter((c) => {
    if (!c.location_coords) return false;
    const d = haversineMeters(lat, lng, c.location_coords.lat, c.location_coords.lng);
    return d <= radiusMeters;
  });
}

async function getAllComplaints(filters = {}) {
  const { complaints } = await getContainers();
  let query = 'SELECT * FROM c WHERE 1=1';
  const params = [];

  if (filters.status) {
    query += ' AND c.status = @status';
    params.push({ name: '@status', value: filters.status });
  }
  if (filters.severity_min !== undefined) {
    query += ' AND c.severity >= @sev';
    params.push({ name: '@sev', value: Number(filters.severity_min) });
  }

  const { resources } = await complaints.items.query({ query, parameters: params }).fetchAll();
  return resources;
}

async function getHotspots() {
  const all = await getAllComplaints();
  // Cluster by 0.01° grid cell (~1 km)
  const grid = {};
  for (const c of all) {
    if (!c.location_coords) continue;
    const key = `${Math.round(c.location_coords.lat / 0.01) * 0.01}_${Math.round(c.location_coords.lng / 0.01) * 0.01}`;
    if (!grid[key]) grid[key] = { lat: c.location_coords.lat, lng: c.location_coords.lng, complaints: [] };
    grid[key].complaints.push(c);
  }

  const hotspots = Object.values(grid)
    .map((cell) => ({
      lat: cell.lat,
      lng: cell.lng,
      complaint_count: cell.complaints.length,
      avg_severity: +(cell.complaints.reduce((s, c) => s + (c.severity || 0), 0) / cell.complaints.length).toFixed(1),
      road_name: cell.complaints[0]?.road_name || 'Unknown Road',
    }))
    .sort((a, b) => b.avg_severity - a.avg_severity || b.complaint_count - a.complaint_count)
    .slice(0, 10);

  return hotspots;
}

async function getStats() {
  const all = await getAllComplaints();
  const sosCont = (await getContainers()).sos;
  const { resources: sosEvents } = await sosCont.items.query('SELECT * FROM c').fetchAll();

  const total = all.length;
  const resolved = all.filter((c) => c.status === 'resolved').length;
  const pending = all.filter((c) => c.status === 'pending').length;
  const in_progress = all.filter((c) => c.status === 'in_progress').length;
  const avg_severity = total ? +(all.reduce((s, c) => s + (c.severity || 0), 0) / total).toFixed(1) : 0;

  // Top affected area by complaint count in grid
  const grid = {};
  for (const c of all) {
    const area = c.location_coords?.city || c.road_name || 'Unknown';
    grid[area] = (grid[area] || 0) + 1;
  }
  const top_affected_area = Object.entries(grid).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  return { total_complaints: total, resolved, pending, in_progress, total_sos_events: sosEvents.length, avg_severity, top_affected_area };
}

// ── SOS EVENTS ────────────────────────────────────────────────────────────────

async function createSOSEvent(sosDoc) {
  const { sos } = await getContainers();
  const { resource } = await sos.items.create(sosDoc);
  return resource;
}

async function getSOSEvent(sos_id) {
  const { sos } = await getContainers();
  const { resources } = await sos.items
    .query({ query: 'SELECT * FROM c WHERE c.sos_id = @id', parameters: [{ name: '@id', value: sos_id }] })
    .fetchAll();
  return resources[0] || null;
}

async function cancelSOS(sos_id) {
  const { sos } = await getContainers();
  const existing = await getSOSEvent(sos_id);
  if (!existing) throw new Error(`SOS event ${sos_id} not found`);

  const now = Date.now();
  const triggered_at = new Date(existing.triggered_at).getTime();
  const windowMs = env.SOS_CANCEL_WINDOW_SECONDS * 1000;

  if (now - triggered_at > windowMs) {
    const err = new Error(`Cancel window expired. SOS can only be cancelled within ${env.SOS_CANCEL_WINDOW_SECONDS} seconds of trigger.`);
    err.code = 'CANCEL_WINDOW_EXPIRED';
    throw err;
  }

  const updated = { ...existing, status: 'cancelled', cancelled_at: new Date().toISOString() };
  const { resource } = await sos.item(existing.id, existing.id).replace(updated);
  return resource;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = {
  createComplaint,
  getComplaint,
  updateComplaintStatus,
  getComplaintsByRadius,
  getAllComplaints,
  getHotspots,
  getStats,
  createSOSEvent,
  getSOSEvent,
  cancelSOS,
};
