/**
 * frontend/src/pages/Dashboard.js
 * Municipality dashboard with stats bar, Google Map, TicketList, and HeatmapPanel.
 */

import { createMapView } from '../components/MapView.js';
import { createTicketList } from '../components/TicketList.js';
import { createHeatmapPanel } from '../components/HeatmapPanel.js';

export function renderDashboard() {
  const page = document.createElement('div');
  page.id = 'dashboard-page';

  page.innerHTML = `
    <div class="dashboard-root">
      <!-- Page header -->
      <div class="dashboard-header">
        <div class="container">
          <div class="dashboard-header-inner">
            <div>
              <span class="section-tag">🗺️ Municipality Dashboard</span>
              <h1 class="heading-md dashboard-title">Road Safety Overview</h1>
            </div>
            <button class="btn btn-outline btn-sm" id="dash-refresh-btn">↺ Refresh Data</button>
          </div>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="dashboard-stats-bar">
        <div class="container">
          <div class="dash-stats-row" id="dash-stats-row">
            ${['total_complaints','resolved','pending','in_progress','total_sos_events','avg_severity'].map((k) => `
              <div class="dash-stat-item" id="dash-stat-${k}">
                <span class="dash-stat-num text-muted">—</span>
                <span class="dash-stat-label text-xs text-muted">${formatStatLabel(k)}</span>
              </div>
            `).join('<div class="dash-stat-div"></div>')}
          </div>
        </div>
      </div>

      <!-- Map + Tickets -->
      <div class="container">
        <div class="dashboard-main-grid">
          <!-- Map panel -->
          <div class="dash-map-panel">
            <div class="dash-map-toolbar">
              <span class="dash-map-label">🗺️ Pothole Map</span>
              <div class="dash-map-controls">
                <button class="btn btn-ghost btn-sm" id="heatmap-toggle-btn">🔥 Toggle Heatmap</button>
                <div class="dash-legend">
                  <span class="dash-legend-dot" style="background:var(--accent-red)"></span><span class="text-xs">High (7-10)</span>
                  <span class="dash-legend-dot" style="background:var(--accent-amber)"></span><span class="text-xs">Med (4-6)</span>
                  <span class="dash-legend-dot" style="background:var(--accent-green)"></span><span class="text-xs">Low (1-3)</span>
                </div>
              </div>
            </div>
            <div id="map-container" class="dash-map-container">
              <div class="map-loading">
                <div class="spinner spinner-lg" style="border-top-color:var(--accent-amber)"></div>
                <p class="text-muted text-sm">Loading map...</p>
              </div>
            </div>
          </div>

          <!-- Ticket list panel -->
          <div class="dash-ticket-panel" id="dash-ticket-slot">
            <!-- TicketList injected here -->
          </div>
        </div>

        <!-- Heatmap panel -->
        <div class="dash-heatmap-section" id="dash-heatmap-slot">
          <!-- HeatmapPanel injected here -->
        </div>
      </div>
    </div>
  `;

  injectDashboardStyles();

  // Inject components
  const ticketSlot = page.querySelector('#dash-ticket-slot');
  const { el: ticketEl, reload: reloadTickets } = createTicketList();
  ticketSlot.appendChild(ticketEl);

  const heatmapSlot = page.querySelector('#dash-heatmap-slot');
  heatmapSlot.appendChild(createHeatmapPanel());

  // Load stats and map
  let mapInstance = null;
  const defaultCenter = {
    lat: parseFloat(document.getElementById('app')?.dataset.defaultLat || '20.3893'),
    lng: parseFloat(document.getElementById('app')?.dataset.defaultLng || '72.9106'),
  };

  async function loadStats() {
    try {
      const res = await fetch('/api/dashboard/stats');
      const stats = await res.json();
      const keys = ['total_complaints','resolved','pending','in_progress','total_sos_events','avg_severity'];
      keys.forEach((k) => {
        const el = page.querySelector(`#dash-stat-${k} .dash-stat-num`);
        if (el) {
          el.textContent = stats[k] ?? '—';
          el.style.color = k === 'avg_severity'
            ? (stats[k] >= 7 ? 'var(--accent-red)' : stats[k] >= 4 ? 'var(--accent-amber)' : 'var(--accent-green)')
            : k === 'resolved' ? 'var(--accent-green)'
            : k === 'pending' ? 'var(--accent-amber)'
            : 'var(--text-primary)';
        }
      });
    } catch (err) {
      console.error('[Dashboard] Stats error:', err);
    }
  }

  async function loadMap() {
    const mapContainer = page.querySelector('#map-container');
    try {
      const res = await fetch('/api/dashboard/complaints');
      const data = await res.json();
      const complaints = data.complaints || [];

      mapContainer.innerHTML = '';
      const inst = await createMapView(mapContainer, complaints, defaultCenter);
      mapInstance = inst;

      // Heatmap toggle
      page.querySelector('#heatmap-toggle-btn')?.addEventListener('click', () => {
        inst.toggleHeatmap();
      });
    } catch (err) {
      mapContainer.innerHTML = `<div class="map-loading"><p class="text-muted">Map unavailable: ${err.message}</p></div>`;
    }
  }

  // Refresh button
  page.querySelector('#dash-refresh-btn')?.addEventListener('click', async () => {
    await Promise.all([loadStats(), loadMap(), reloadTickets()]);
  });

  // Initial load
  loadStats();
  loadMap();

  return page;
}

function formatStatLabel(key) {
  return {
    total_complaints: 'Total Complaints',
    resolved: 'Resolved',
    pending: 'Pending',
    in_progress: 'In Progress',
    total_sos_events: 'SOS Events',
    avg_severity: 'Avg Severity',
  }[key] || key;
}

function injectDashboardStyles() {
  if (document.getElementById('dashboard-styles')) return;
  const style = document.createElement('style');
  style.id = 'dashboard-styles';
  style.textContent = `
    .dashboard-root { min-height: 100vh; padding-top: 68px; }
    .dashboard-header {
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      padding-block: var(--space-6);
    }
    .dashboard-header-inner { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--space-4); }
    .dashboard-title { margin-top: var(--space-3); }
    .dashboard-stats-bar {
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      padding-block: var(--space-4);
      position: sticky;
      top: 68px;
      z-index: var(--z-above);
    }
    .dash-stats-row { display: flex; align-items: center; justify-content: center; gap: var(--space-6); flex-wrap: wrap; }
    .dash-stat-item { text-align: center; }
    .dash-stat-num { display: block; font-family: var(--font-heading); font-size: var(--text-2xl); font-weight: 800; line-height: 1; margin-bottom: 2px; }
    .dash-stat-label { text-transform: uppercase; letter-spacing: 0.06em; }
    .dash-stat-div { width: 1px; height: 40px; background: var(--border); }
    .dashboard-main-grid {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: var(--space-6);
      padding-block: var(--space-6);
    }
    .dash-map-panel {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .dash-map-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-5);
      border-bottom: 1px solid var(--border);
      background: var(--bg-card-hover);
      flex-wrap: wrap;
      gap: var(--space-3);
    }
    .dash-map-label { font-weight: 700; font-size: var(--text-sm); }
    .dash-map-controls { display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
    .dash-legend { display: flex; align-items: center; gap: var(--space-2); }
    .dash-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .dash-map-container { height: 520px; position: relative; }
    .map-loading {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: var(--space-4);
    }
    .dash-ticket-panel {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .dash-heatmap-section { padding-bottom: var(--space-12); }
    @media (max-width: 1024px) {
      .dashboard-main-grid { grid-template-columns: 1fr; }
      .dash-map-container { height: 360px; }
      .dash-stats-row { justify-content: flex-start; overflow-x: auto; padding-bottom: var(--space-2); }
    }
  `;
  document.head.appendChild(style);
}
