/**
 * frontend/src/components/HeatmapPanel.js
 * Ranked list of top road hotspots from the dashboard API.
 */

export function createHeatmapPanel() {
  const el = document.createElement('div');
  el.className = 'heatmap-panel';
  el.innerHTML = `
    <div class="heatmap-header">
      <h3 class="heatmap-title">🔥 Top 5 Worst Road Segments</h3>
      <button class="btn btn-ghost btn-sm" id="hotspot-refresh-btn">↺ Refresh</button>
    </div>
    <div class="heatmap-list" id="hotspot-list">
      <div class="heatmap-loading">
        <div class="spinner" style="border-top-color:var(--accent-amber)"></div>
        <span class="text-muted text-sm">Loading hotspots...</span>
      </div>
    </div>
  `;

  injectHeatmapStyles();

  async function loadHotspots() {
    const list = el.querySelector('#hotspot-list');
    list.innerHTML = `<div class="heatmap-loading"><div class="spinner" style="border-top-color:var(--accent-amber)"></div><span class="text-muted text-sm">Loading...</span></div>`;

    try {
      const res = await fetch('/api/dashboard/hotspots');
      const data = await res.json();
      const hotspots = (data.hotspots || []).slice(0, 5);

      if (hotspots.length === 0) {
        list.innerHTML = '<p class="heatmap-empty text-muted">No hotspot data available yet.</p>';
        return;
      }

      list.innerHTML = '';
      hotspots.forEach((h, i) => {
        const pct = Math.round((h.avg_severity / 10) * 100);
        const color = h.avg_severity >= 7 ? 'var(--accent-red)' : h.avg_severity >= 4 ? 'var(--accent-amber)' : 'var(--accent-green)';
        const rankBg = i === 0 ? 'linear-gradient(135deg,var(--accent-red),#c0392b)' : i === 1 ? 'linear-gradient(135deg,var(--accent-amber),var(--accent-amber-dark))' : 'var(--bg-card-hover)';

        const item = document.createElement('div');
        item.className = 'hotspot-item reveal';
        item.style.animationDelay = `${i * 0.1}s`;
        item.innerHTML = `
          <div class="hotspot-rank" style="background:${rankBg}">${i + 1}</div>
          <div class="hotspot-info">
            <div class="hotspot-name">${h.road_name}</div>
            <div class="hotspot-coords text-xs text-muted font-mono">${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}</div>
            <div class="hotspot-bar-track">
              <div class="hotspot-bar-fill" style="width:${pct}%; background:${color}"></div>
            </div>
          </div>
          <div class="hotspot-stats">
            <span class="hotspot-severity" style="color:${color}">${h.avg_severity}</span>
            <span class="hotspot-sev-label text-xs text-muted">avg sev.</span>
            <span class="hotspot-count text-xs">${h.complaint_count} reports</span>
          </div>
        `;
        list.appendChild(item);

        // Animate bar
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const bar = item.querySelector('.hotspot-bar-fill');
            if (bar) bar.style.transition = 'width 1s ease';
          });
        });
      });

      // Reveal animation
      setTimeout(() => {
        list.querySelectorAll('.hotspot-item').forEach((item) => item.classList.add('visible'));
      }, 50);
    } catch (err) {
      list.innerHTML = `<p class="heatmap-empty text-muted">Failed to load hotspots: ${err.message}</p>`;
    }
  }

  loadHotspots();
  el.querySelector('#hotspot-refresh-btn')?.addEventListener('click', loadHotspots);

  return el;
}

function injectHeatmapStyles() {
  if (document.getElementById('heatmap-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'heatmap-panel-styles';
  style.textContent = `
    .heatmap-panel {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
    }
    .heatmap-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-5);
    }
    .heatmap-title {
      font-family: var(--font-heading);
      font-size: var(--text-lg);
      font-weight: 700;
    }
    .heatmap-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      padding: var(--space-8) 0;
    }
    .heatmap-empty { text-align: center; padding: var(--space-6) 0; }
    .hotspot-item {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--border);
    }
    .hotspot-item:last-child { border-bottom: none; }
    .hotspot-rank {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: var(--text-sm);
      color: white;
      flex-shrink: 0;
      font-family: var(--font-heading);
    }
    .hotspot-info { flex: 1; min-width: 0; }
    .hotspot-name { font-weight: 600; font-size: var(--text-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hotspot-coords { margin-bottom: 4px; }
    .hotspot-bar-track {
      height: 4px;
      background: rgba(255,255,255,0.06);
      border-radius: var(--radius-full);
      overflow: hidden;
    }
    .hotspot-bar-fill {
      height: 100%;
      border-radius: var(--radius-full);
      width: 0;
    }
    .hotspot-stats {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      flex-shrink: 0;
    }
    .hotspot-severity {
      font-family: var(--font-heading);
      font-size: var(--text-2xl);
      font-weight: 800;
      line-height: 1;
    }
    .hotspot-sev-label { opacity: 0.6; }
    .hotspot-count { color: var(--text-muted); }
  `;
  document.head.appendChild(style);
}
