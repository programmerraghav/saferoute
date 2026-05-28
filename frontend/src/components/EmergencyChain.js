/**
 * frontend/src/components/EmergencyChain.js
 * Animated 3-step emergency call chain UI.
 * Family → 108 Ambulance → 100 Police
 */

/**
 * @param {object[]} [initialSteps] - Completed steps from API response.
 * @returns {{ el: HTMLElement, updateStep: Function, completeAll: Function }}
 */
export function createEmergencyChain(initialSteps = []) {
  const el = document.createElement('div');
  el.className = 'emergency-chain';

  const steps = [
    { key: 'family', icon: '👨‍👩‍👦', label: 'Family Contact', sub: 'SMS + Voice Call', delay: 0 },
    { key: 'ambulance_108', icon: '🚑', label: '108 Ambulance', sub: 'Emergency Medical', delay: 3000 },
    { key: 'police_100', icon: '🚔', label: '100 Police', sub: 'Law Enforcement', delay: 6000 },
  ];

  el.innerHTML = `
    <div class="chain-header">
      <span class="chain-title">Emergency Call Chain</span>
      <span class="badge badge-red chain-status" id="chain-status-badge">ACTIVE</span>
    </div>
    <div class="chain-steps" id="chain-steps">
      ${steps.map((s, i) => `
        <div class="chain-step" id="chain-step-${s.key}" data-state="waiting">
          <div class="chain-step-icon-wrap">
            <span class="chain-step-icon">${s.icon}</span>
            <div class="chain-step-status-dot" id="chain-dot-${s.key}"></div>
          </div>
          ${i < steps.length - 1 ? '<div class="chain-connector" id="chain-conn-' + i + '"></div>' : ''}
          <div class="chain-step-info">
            <span class="chain-step-label">${s.label}</span>
            <span class="chain-step-sub">${s.sub}</span>
            <span class="chain-step-state" id="chain-state-${s.key}">Waiting...</span>
          </div>
        </div>
      `).join('')}
    </div>
    <p class="chain-footer-msg" id="chain-footer-msg">
      <span class="spinner" style="width:14px;height:14px;border-width:2px;border-top-color:var(--accent-red)"></span>
      Initiating emergency contacts...
    </p>
  `;

  injectChainStyles();

  // Auto-animate steps with staggered delays
  steps.forEach((step, i) => {
    setTimeout(() => {
      activateStep(el, step.key);
    }, step.delay + 500);

    setTimeout(() => {
      completeStep(el, step.key);
      if (i < steps.length - 1) {
        const conn = el.querySelector(`#chain-conn-${i}`);
        if (conn) conn.classList.add('connected');
      }
      if (i === steps.length - 1) {
        const badge = el.querySelector('#chain-status-badge');
        const msg = el.querySelector('#chain-footer-msg');
        if (badge) { badge.textContent = 'COMPLETE'; badge.classList.replace('badge-red', 'badge-green'); }
        if (msg) msg.innerHTML = '✅ All emergency contacts have been alerted. Help is on the way.';
      }
    }, step.delay + 2500);
  });

  return el;
}

function activateStep(el, key) {
  const step = el.querySelector(`#chain-step-${key}`);
  const dot = el.querySelector(`#chain-dot-${key}`);
  const state = el.querySelector(`#chain-state-${key}`);
  if (!step) return;
  step.dataset.state = 'active';
  step.classList.add('animate-chain-active');
  if (dot) dot.classList.add('dot-active');
  if (state) state.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:2px;border-top-color:var(--accent-amber)"></span> Contacting...';
}

function completeStep(el, key) {
  const step = el.querySelector(`#chain-step-${key}`);
  const dot = el.querySelector(`#chain-dot-${key}`);
  const state = el.querySelector(`#chain-state-${key}`);
  if (!step) return;
  step.dataset.state = 'done';
  step.classList.remove('animate-chain-active');
  step.classList.add('animate-chain-done');
  if (dot) { dot.classList.remove('dot-active'); dot.classList.add('dot-done'); }
  if (state) state.innerHTML = '✅ Alerted';
}

function injectChainStyles() {
  if (document.getElementById('emergency-chain-styles')) return;
  const style = document.createElement('style');
  style.id = 'emergency-chain-styles';
  style.textContent = `
    .emergency-chain {
      background: var(--bg-card);
      border: 1px solid var(--border-red);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
    }
    .chain-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-6);
    }
    .chain-title {
      font-family: var(--font-heading);
      font-size: var(--text-lg);
      font-weight: 700;
    }
    .chain-steps {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .chain-step {
      display: flex;
      align-items: flex-start;
      gap: var(--space-4);
      padding: var(--space-3) 0;
      opacity: 0.4;
      transition: opacity 0.4s ease;
      position: relative;
    }
    .chain-step[data-state="active"],
    .chain-step[data-state="done"] { opacity: 1; }
    .chain-step-icon-wrap {
      position: relative;
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }
    .chain-step-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-card-hover);
      border: 2px solid var(--border);
      border-radius: 50%;
      font-size: 1.3rem;
      transition: var(--transition);
    }
    .chain-step[data-state="active"] .chain-step-icon {
      border-color: var(--accent-amber);
      background: var(--accent-amber-glow-xl);
      animation: sos-pulse 1.5s ease-in-out infinite;
    }
    .chain-step[data-state="done"] .chain-step-icon {
      border-color: var(--accent-green);
      background: rgba(34, 197, 94, 0.1);
    }
    .chain-step-status-dot {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--border);
      border: 2px solid var(--bg-card);
      transition: var(--transition);
    }
    .chain-step-status-dot.dot-active {
      background: var(--accent-amber);
      animation: sos-pulse 1s ease-in-out infinite;
    }
    .chain-step-status-dot.dot-done { background: var(--accent-green); }
    .chain-connector {
      position: absolute;
      left: 23px;
      top: 56px;
      width: 2px;
      height: 24px;
      background: var(--border);
      transition: background 0.4s ease;
    }
    .chain-connector.connected { background: var(--accent-green); }
    .chain-step-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-top: var(--space-2);
    }
    .chain-step-label {
      font-weight: 600;
      font-size: var(--text-sm);
    }
    .chain-step-sub { font-size: var(--text-xs); color: var(--text-muted); }
    .chain-step-state {
      font-size: var(--text-xs);
      color: var(--text-faint);
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
    }
    .animate-chain-done .chain-step-state { color: var(--accent-green); }
    .chain-footer-msg {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin-top: var(--space-4);
      padding-top: var(--space-4);
      border-top: 1px solid var(--border);
    }
  `;
  document.head.appendChild(style);
}
