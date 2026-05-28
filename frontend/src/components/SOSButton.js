/**
 * frontend/src/components/SOSButton.js
 * Large pulsing SOS button with ring animation and countdown.
 */

export function createSOSButton({ onTrigger, onCancel } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'sos-wrapper';

  wrapper.innerHTML = `
    <div class="sos-outer-ring" id="sos-ring-1"></div>
    <div class="sos-outer-ring sos-ring-2" id="sos-ring-2"></div>
    <button class="sos-btn" id="sos-main-btn" aria-label="Trigger SOS Emergency Alert">
      <span class="sos-icon">🚨</span>
      <span class="sos-label">SOS</span>
    </button>
  `;

  injectSOSStyles();

  const btn = wrapper.querySelector('#sos-main-btn');
  let triggered = false;

  btn.addEventListener('click', () => {
    if (triggered) return;
    triggered = true;
    if (typeof onTrigger === 'function') onTrigger();
  });

  return wrapper;
}

/**
 * Show countdown + cancel button after SOS trigger.
 * @param {HTMLElement} container - Parent element to append countdown into.
 * @param {number} seconds - Countdown duration.
 * @param {Function} onCancel - Called when user clicks Cancel.
 * @param {Function} onComplete - Called when countdown reaches 0.
 */
export function startSOSCountdown(container, seconds, onCancel, onComplete) {
  // Remove any existing countdown
  container.querySelector('.sos-countdown-block')?.remove();

  const block = document.createElement('div');
  block.className = 'sos-countdown-block animate-fade-in';
  block.innerHTML = `
    <div class="sos-countdown-ring">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(239,68,68,0.2)" stroke-width="4"/>
        <circle id="sos-progress-circle" cx="60" cy="60" r="52" fill="none"
          stroke="var(--accent-red)" stroke-width="4"
          stroke-dasharray="326.73" stroke-dashoffset="0"
          stroke-linecap="round"
          transform="rotate(-90 60 60)"/>
      </svg>
      <div class="sos-countdown-center">
        <span class="sos-countdown-num" id="sos-countdown-num">${seconds}</span>
        <span class="sos-countdown-label">seconds</span>
      </div>
    </div>
    <p class="sos-countdown-text">Contacting emergency services in <strong id="sos-s-num">${seconds}s</strong></p>
    <button class="btn btn-outline sos-cancel-btn" id="sos-cancel-btn">✕ Cancel SOS</button>
  `;

  container.appendChild(block);

  const numEl = block.querySelector('#sos-countdown-num');
  const sNumEl = block.querySelector('#sos-s-num');
  const circle = block.querySelector('#sos-progress-circle');
  const circumference = 326.73;
  let remaining = seconds;

  const interval = setInterval(() => {
    remaining--;
    numEl.textContent = remaining;
    sNumEl.textContent = `${remaining}s`;
    const offset = circumference * (1 - remaining / seconds);
    circle.style.strokeDashoffset = offset;

    if (remaining <= 0) {
      clearInterval(interval);
      block.querySelector('#sos-cancel-btn').disabled = true;
      block.querySelector('#sos-cancel-btn').textContent = 'Window Expired';
      if (typeof onComplete === 'function') onComplete();
    }
  }, 1000);

  block.querySelector('#sos-cancel-btn')?.addEventListener('click', () => {
    clearInterval(interval);
    block.remove();
    if (typeof onCancel === 'function') onCancel();
  });

  return { stop: () => clearInterval(interval) };
}

function injectSOSStyles() {
  if (document.getElementById('sos-btn-styles')) return;
  const style = document.createElement('style');
  style.id = 'sos-btn-styles';
  style.textContent = `
    .sos-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 200px;
      height: 200px;
      margin: 0 auto;
    }
    .sos-outer-ring {
      position: absolute;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      border: 2px solid var(--accent-red-glow);
      animation: sos-ring 2.5s ease-out infinite;
      pointer-events: none;
    }
    .sos-ring-2 { animation-delay: 1.25s; }
    .sos-btn {
      position: relative;
      width: 160px;
      height: 160px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #ff6b6b, var(--accent-red-dark));
      border: 3px solid var(--accent-red);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
      transition: var(--transition-cubic);
      animation: sos-pulse 1.8s ease-in-out infinite, sos-glow 2.5s ease-in-out infinite;
      z-index: 2;
    }
    .sos-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 0 0 16px rgba(239, 68, 68, 0.2), 0 0 60px rgba(239, 68, 68, 0.4);
    }
    .sos-btn:active { transform: scale(0.96); }
    .sos-icon { font-size: 2rem; line-height: 1; }
    .sos-label {
      font-family: var(--font-heading);
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      line-height: 1;
    }
    .sos-countdown-block {
      text-align: center;
      margin-top: var(--space-8);
    }
    .sos-countdown-ring {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-4);
    }
    .sos-countdown-center {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .sos-countdown-num {
      font-family: var(--font-heading);
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--accent-red);
      line-height: 1;
    }
    .sos-countdown-label {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }
    .sos-countdown-text {
      color: var(--text-muted);
      font-size: var(--text-sm);
      margin-bottom: var(--space-4);
    }
    .sos-countdown-text strong { color: var(--accent-red); }
    .sos-cancel-btn {
      border-color: var(--accent-red) !important;
      color: var(--accent-red) !important;
    }
    .sos-cancel-btn:hover {
      background: var(--accent-red-glow-xl) !important;
    }
    .sos-cancel-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(style);
}
