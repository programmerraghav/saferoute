/**
 * frontend/src/components/PotholeCard.js
 * Complaint card with severity badge and status indicator.
 */

import { createSeverityMeter } from './SeverityMeter.js';

/**
 * @param {object} complaint - Complaint object from API.
 * @param {Function} [onStatusChange] - Callback when status dropdown changes.
 * @returns {HTMLElement}
 */
export function createPotholeCard(complaint, onStatusChange) {
  const {
    complaint_id,
    severity = 0,
    pothole_type = 'unknown',
    status = 'pending',
    location_coords,
    road_name,
    user_name,
    created_at,
    ai_summary,
    vehicle_type,
  } = complaint;

  const el = document.createElement('div');
  const color = severity >= 7 ? 'red' : severity >= 4 ? 'amber' : 'green';
  const statusColor = status === 'resolved' ? 'green' : status === 'in_progress' ? 'amber' : 'muted';
  const date = created_at ? new Date(created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown date';

  el.className = `card card-${color} pothole-card`;
  el.innerHTML = `
    <div class="pothole-card-header">
      <div>
        <span class="pothole-card-id font-mono text-xs text-muted">${complaint_id}</span>
        <h3 class="pothole-card-title">${road_name || 'Unknown Road'}</h3>
      </div>
      <span class="badge badge-${color} pothole-sev-badge">${severity}/10 ${color.toUpperCase()}</span>
    </div>

    <div class="pothole-card-meter">
      <!-- severity meter injected below -->
    </div>

    ${ai_summary ? `<p class="pothole-card-summary text-sm text-muted">"${ai_summary}"</p>` : ''}

    <div class="pothole-card-meta">
      <span class="pothole-meta-item">
        <span class="pothole-meta-icon">📍</span>
        ${location_coords ? `${location_coords.lat.toFixed(4)}, ${location_coords.lng.toFixed(4)}` : 'No GPS'}
      </span>
      <span class="pothole-meta-item">
        <span class="pothole-meta-icon">🧑</span>
        ${user_name}
      </span>
      <span class="pothole-meta-item">
        <span class="pothole-meta-icon">${vehicle_type === 'bike' ? '🏍️' : '🚗'}</span>
        ${vehicle_type || 'vehicle'}
      </span>
      <span class="pothole-meta-item">
        <span class="pothole-meta-icon">📅</span>
        ${date}
      </span>
    </div>

    <div class="pothole-card-footer">
      <span class="badge badge-${statusColor}">${status.replace('_', ' ')}</span>
      ${onStatusChange ? `
        <select class="pothole-status-select" data-id="${complaint_id}" aria-label="Change status">
          <option value="pending"     ${status === 'pending'     ? 'selected' : ''}>Pending</option>
          <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="resolved"    ${status === 'resolved'    ? 'selected' : ''}>Resolved</option>
        </select>
      ` : ''}
    </div>
  `;

  // Inject severity meter
  const meterSlot = el.querySelector('.pothole-card-meter');
  meterSlot.appendChild(createSeverityMeter(severity, pothole_type));

  // Status change handler
  if (onStatusChange) {
    const select = el.querySelector('.pothole-status-select');
    select?.addEventListener('change', async (e) => {
      const newStatus = e.target.value;
      await onStatusChange(complaint_id, newStatus);
    });
  }

  injectPotholeCardStyles();
  return el;
}

function injectPotholeCardStyles() {
  if (document.getElementById('pothole-card-styles')) return;
  const style = document.createElement('style');
  style.id = 'pothole-card-styles';
  style.textContent = `
    .pothole-card { padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-4); }
    .pothole-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); }
    .pothole-card-id { display: block; margin-bottom: 2px; }
    .pothole-card-title { font-size: var(--text-base); font-weight: 600; }
    .pothole-card-summary {
      font-style: italic;
      background: rgba(255,255,255,0.03);
      border-left: 2px solid var(--border-amber);
      padding: var(--space-2) var(--space-3);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      line-height: 1.5;
    }
    .pothole-card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
    .pothole-meta-item {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
    .pothole-meta-icon { font-size: 0.9rem; }
    .pothole-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: var(--space-3);
      border-top: 1px solid var(--border);
    }
    .pothole-status-select {
      background: var(--bg-card-hover);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
      cursor: pointer;
      transition: var(--transition);
    }
    .pothole-status-select:hover { border-color: var(--accent-amber); }
  `;
  document.head.appendChild(style);
}
