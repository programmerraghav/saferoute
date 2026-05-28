/**
 * frontend/src/components/SeverityMeter.js
 * Animated horizontal severity bar — green → amber → red.
 */

/**
 * @param {number} severity - Score from 1 to 10.
 * @param {string} [potholeType] - 'small' | 'medium' | 'large'
 * @returns {HTMLElement}
 */
export function createSeverityMeter(severity, potholeType = '') {
  const el = document.createElement('div');
  el.className = 'severity-meter';

  const pct = Math.max(0, Math.min(100, (severity / 10) * 100));
  const color = severity >= 7 ? 'red' : severity >= 4 ? 'amber' : 'green';
  const colorHex = severity >= 7 ? 'var(--accent-red)' : severity >= 4 ? 'var(--accent-amber)' : 'var(--accent-green)';
  const glowColor = severity >= 7 ? 'var(--accent-red-glow)' : severity >= 4 ? 'var(--accent-amber-glow)' : 'var(--accent-green-glow)';
  const label = severity >= 7 ? 'HIGH' : severity >= 4 ? 'MEDIUM' : 'LOW';
  const typeLabel = potholeType ? ` · ${potholeType.charAt(0).toUpperCase() + potholeType.slice(1)} Pothole` : '';

  el.innerHTML = `
    <div class="severity-header">
      <div class="severity-score-block">
        <span class="severity-score" style="color:${colorHex}">${severity}</span>
        <span class="severity-denom">/10</span>
      </div>
      <span class="badge badge-${color === 'red' ? 'red' : color === 'amber' ? 'amber' : 'green'} severity-badge">
        ${label}${typeLabel}
      </span>
    </div>
    <div class="severity-track">
      <div class="severity-fill"
           style="--fill-target:${pct}%; background: linear-gradient(90deg, var(--accent-green), ${colorHex}); box-shadow: 0 0 12px ${glowColor};"
           data-width="${pct}">
      </div>
    </div>
    <div class="severity-scale">
      <span class="severity-scale-label" style="color:var(--accent-green)">1 Low</span>
      <span class="severity-scale-label" style="color:var(--accent-amber)">5 Medium</span>
      <span class="severity-scale-label" style="color:var(--accent-red)">10 High</span>
    </div>
  `;

  injectMeterStyles();

  // Animate on mount (requestAnimationFrame ensures the element is in DOM)
  requestAnimationFrame(() => {
    const fill = el.querySelector('.severity-fill');
    if (fill) {
      fill.style.width = '0';
      requestAnimationFrame(() => {
        fill.style.transition = 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
        fill.style.width = `${pct}%`;
      });
    }
  });

  return el;
}

function injectMeterStyles() {
  if (document.getElementById('severity-meter-styles')) return;
  const style = document.createElement('style');
  style.id = 'severity-meter-styles';
  style.textContent = `
    .severity-meter {
      width: 100%;
    }
    .severity-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-3);
    }
    .severity-score-block {
      display: flex;
      align-items: baseline;
      gap: 2px;
    }
    .severity-score {
      font-family: var(--font-heading);
      font-size: var(--text-4xl);
      font-weight: 800;
      line-height: 1;
    }
    .severity-denom {
      font-size: var(--text-lg);
      color: var(--text-muted);
      font-weight: 500;
    }
    .severity-badge { font-size: var(--text-xs); }
    .severity-track {
      width: 100%;
      height: 10px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-bottom: var(--space-2);
    }
    .severity-fill {
      height: 100%;
      border-radius: var(--radius-full);
      width: 0;
    }
    .severity-scale {
      display: flex;
      justify-content: space-between;
    }
    .severity-scale-label {
      font-size: var(--text-xs);
      font-weight: 500;
      opacity: 0.7;
    }
  `;
  document.head.appendChild(style);
}
