'use strict';
/**
 * backend/services/cosmosService.js
 * Firestore implementation of complaints & SOS database storage.
 */

const firebaseConfig = require('../config/firebase');
const env = require('../config/env');

const roadDetailsService = require('./roadDetailsService');

// Bounded in-memory mock databases for fallback
const mockComplaints = new Map();
const mockSOSEvents = new Map();

/**
 * Helper to get the Firestore database or return null if not initialized.
 */
function getFirestoreDb() {
  return firebaseConfig.db || null;
}

// ── COMPLAINTS ────────────────────────────────────────────────────────────────

async function createComplaint(complaintDoc) {
  const db = getFirestoreDb();
  if (db) {
    await db.collection('complaints').doc(complaintDoc.complaint_id).set(complaintDoc);
  } else {
    mockComplaints.set(complaintDoc.complaint_id, JSON.parse(JSON.stringify(complaintDoc)));
  }
  return complaintDoc;
}

async function getComplaint(complaint_id) {
  const db = getFirestoreDb();
  let c = null;
  if (db) {
    const doc = await db.collection('complaints').doc(complaint_id).get();
    if (doc.exists) c = doc.data();
  } else {
    const mockC = mockComplaints.get(complaint_id);
    if (mockC) c = JSON.parse(JSON.stringify(mockC));
  }
  if (c) {
    const rd = roadDetailsService.getRoadDetails(c.road_name);
    c.contractor_name = rd.contractor_name;
    c.tender_date = rd.tender_date;
    c.tender_amount = rd.tender_amount;
    c.warranty_period = rd.warranty_period;
  }
  return c;
}

async function updateComplaintStatus(complaint_id, status) {
  const existing = await getComplaint(complaint_id);
  if (!existing) throw new Error(`Complaint ${complaint_id} not found`);
  const now = new Date().toISOString();
  
  const db = getFirestoreDb();
  if (db) {
    await db.collection('complaints').doc(complaint_id).update({
      status,
      updated_at: now
    });
  } else {
    existing.status = status;
    existing.updated_at = now;
    mockComplaints.set(complaint_id, existing);
  }
  
  return { ...existing, status, updated_at: now };
}

async function getComplaintsByRadius(lat, lng, radiusMeters) {
  const all = await getAllComplaints();
  
  return all.filter((c) => {
    if (!c.location_coords) return false;
    const d = haversineMeters(lat, lng, c.location_coords.lat, c.location_coords.lng);
    return d <= radiusMeters;
  });
}

async function getAllComplaints(filters = {}) {
  const db = getFirestoreDb();
  
  let complaints = [];
  if (db) {
    let query = db.collection('complaints');
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.user_id) {
      query = query.where('user_id', '==', filters.user_id);
    }
    const snapshot = await query.get();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (filters.severity_min !== undefined) {
        if (data.severity >= Number(filters.severity_min)) {
          complaints.push(data);
        }
      } else {
        complaints.push(data);
      }
    });
  } else {
    for (const c of mockComplaints.values()) {
      if (filters.status && c.status !== filters.status) continue;
      if (filters.user_id && c.user_id !== filters.user_id) continue;
      if (filters.severity_min !== undefined && c.severity < Number(filters.severity_min)) continue;
      complaints.push(JSON.parse(JSON.stringify(c)));
    }
  }
  
  // Enrich each complaint with road contractor/tender details
  return complaints.map(c => {
    const rd = roadDetailsService.getRoadDetails(c.road_name);
    return {
      ...c,
      contractor_name: rd.contractor_name,
      tender_date: rd.tender_date,
      tender_amount: rd.tender_amount,
      warranty_period: rd.warranty_period
    };
  });
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
  const db = getFirestoreDb();
  
  let sosCount = 0;
  if (db) {
    const snapshot = await db.collection('sos_events').get();
    sosCount = snapshot.size;
  } else {
    sosCount = mockSOSEvents.size;
  }

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

  return { total_complaints: total, resolved, pending, in_progress, total_sos_events: sosCount, avg_severity, top_affected_area };
}

// ── SOS EVENTS ────────────────────────────────────────────────────────────────

async function createSOSEvent(sosDoc) {
  const db = getFirestoreDb();
  if (db) {
    await db.collection('sos_events').doc(sosDoc.sos_id).set(sosDoc);
  } else {
    mockSOSEvents.set(sosDoc.sos_id, JSON.parse(JSON.stringify(sosDoc)));
  }
  return sosDoc;
}

async function getSOSEvent(sos_id) {
  const db = getFirestoreDb();
  if (db) {
    const doc = await db.collection('sos_events').doc(sos_id).get();
    if (!doc.exists) return null;
    return doc.data();
  } else {
    const s = mockSOSEvents.get(sos_id);
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }
}

async function updateSOSEvent(sos_id, fields) {
  const existing = await getSOSEvent(sos_id);
  if (!existing) throw new Error(`SOS event ${sos_id} not found`);

  const updated = { ...existing, ...fields };

  const db = getFirestoreDb();
  if (db) {
    await db.collection('sos_events').doc(sos_id).update(fields);
  } else {
    mockSOSEvents.set(sos_id, updated);
  }
  return updated;
}

async function cancelSOS(sos_id) {
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

  const cancelled_at = new Date().toISOString();
  
  const db = getFirestoreDb();
  if (db) {
    await db.collection('sos_events').doc(sos_id).update({
      status: 'cancelled',
      cancelled_at
    });
  } else {
    existing.status = 'cancelled';
    existing.cancelled_at = cancelled_at;
    mockSOSEvents.set(sos_id, existing);
  }

  return { ...existing, status: 'cancelled', cancelled_at };
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
  updateSOSEvent,
  cancelSOS,
};
