/**
 * frontend/src/pages/SOS.js
 * Emergency SOS page — full dark screen with pulsing SOS button,
 * countdown, cancel, and EmergencyChain visualization.
 */

import { createSOSButton, startSOSCountdown } from '../components/SOSButton.js';
import { createEmergencyChain } from '../components/EmergencyChain.js';

export function renderSOS() {
  const page = document.createElement('div');
  page.id = 'sos-page';

  page.innerHTML = `
    <div class="sos-page-root">
      <div class="sos-page-inner container">
        <!-- Left column: Main SOS controls -->
        <div class="sos-main-col">
          <div class="sos-top-badge">
            <span class="sos-status-dot"></span>
            Emergency SOS System — Active
          </div>

          <h1 class="sos-heading">
            One tap.<br/>
            <span class="text-gradient-red">Instant help.</span>
          </h1>
          <p class="sos-sub text-muted">
            Hold to activate · Will auto-trigger if device is stationary for
            <strong style="color:var(--accent-amber)" id="sos-threshold">2</strong> minutes after impact.
          </p>

          <!-- SOS button injected here -->
          <div id="sos-btn-slot" class="sos-btn-area"></div>

          <!-- After trigger: countdown injected here -->
          <div id="sos-countdown-slot"></div>

          <!-- After countdown: chain injected here -->
          <div id="sos-chain-slot"></div>

          <!-- GPS status -->
          <div class="sos-gps-row" id="sos-gps-row">
            <div class="gps-chip" id="sos-gps-chip">
              <span>🔄</span> <span id="sos-gps-text">Detecting location...</span>
            </div>
            <span class="text-xs text-muted">Shared with emergency services on trigger</span>
          </div>

          <!-- Contact input (collapsible) -->
          <details class="sos-contact-details">
            <summary class="sos-contact-toggle">
              📞 Set emergency contact number
            </summary>
            <div class="sos-contact-form">
              <div class="input-group">
                <label class="input-label" for="sos-contact-input">Family Contact Phone (E.164 format)</label>
                <input class="input" id="sos-contact-input" type="tel" placeholder="+91XXXXXXXXXX" value="" />
              </div>
              <div class="input-group">
                <label class="input-label" for="sos-name-input">Your Name</label>
                <input class="input" id="sos-name-input" type="text" placeholder="Full name" />
              </div>
            </div>
          </details>

          <div class="sos-help-text">
            <p class="text-sm text-muted">🛡️ Your location will be shared only when SOS is triggered.</p>
            <p class="text-sm text-muted">All data is encrypted and DPDP-compliant.</p>
          </div>
        </div>

        <!-- Right column: Info cards -->
        <div class="sos-info-col">
          <div class="sos-info-card card">
            <h3 class="sos-info-title">🔗 Emergency Call Chain</h3>
            <div class="sos-chain-preview">
              ${[
                ['👨‍👩‍👦', 'Family Contact', 'Immediate SMS + voice call', '0s'],
                ['🚑', '108 Ambulance', 'Emergency medical services', '3s'],
                ['🚔', '100 Police', 'Law enforcement alert', '6s'],
              ].map(([icon, label, desc, delay]) => `
                <div class="sos-chain-row">
                  <span class="sos-chain-icon">${icon}</span>
                  <div class="sos-chain-info">
                    <span class="sos-chain-label">${label}</span>
                    <span class="sos-chain-desc text-xs text-muted">${desc}</span>
                  </div>
                  <span class="sos-chain-delay">+${delay}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="sos-info-card card card-red" style="margin-top:var(--space-4)">
            <h3 class="sos-info-title">📍 What Gets Shared</h3>
            <ul class="sos-share-list">
              <li>✅ Precise GPS coordinates</li>
              <li>✅ Google Maps link</li>
              <li>✅ Your name</li>
              <li>✅ Vehicle type</li>
              <li>✅ Timestamp of incident</li>
              <li>❌ No audio recording</li>
            </ul>
          </div>

          <div class="sos-info-card card" style="margin-top:var(--space-4)">
            <h3 class="sos-info-title">⚙️ Auto-Trigger Logic</h3>
            <p class="text-sm text-muted" style="line-height:1.7">
              The SafeRoute app monitors accelerometer data.
              If your device registers a sudden impact followed by
              <strong id="sos-auto-minutes" style="color:var(--accent-amber)">2 minutes</strong> of being stationary,
              it automatically initiates the SOS sequence with a 10-second cancel window.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  injectSOSPageStyles();
  initSOSPage(page);
  return page;
}

function initSOSPage(page) {
  let gpsCoords = null;
  let sosId = null;

  // GPS detection
  const gpsText = page.querySelector('#sos-gps-text');
  const gpsChip = page.querySelector('#sos-gps-chip');

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gpsCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        gpsText.textContent = `📍 ${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}`;
        gpsChip.style.borderColor = 'var(--accent-green)';
      },
      () => {
        gpsCoords = { lat: 20.3893, lng: 72.9106 };
        gpsText.textContent = '📍 Using default location (Vapi)';
        gpsChip.style.borderColor = 'var(--accent-amber)';
      }
    );
  }

  // SOS Button
  const btnSlot = page.querySelector('#sos-btn-slot');
  const countdownSlot = page.querySelector('#sos-countdown-slot');
  const chainSlot = page.querySelector('#sos-chain-slot');

  const sosBtn = createSOSButton({
    onTrigger: async () => {
      await handleSOSTrigger();
    },
  });
  btnSlot.appendChild(sosBtn);

  async function handleSOSTrigger() {
    const contactPhone = page.querySelector('#sos-contact-input')?.value || '+919999999999';
    const userName = page.querySelector('#sos-name-input')?.value || 'Anonymous User';
    const location = gpsCoords || { lat: 20.3893, lng: 72.9106 };

    // Start visual countdown immediately
    const { stop } = startSOSCountdown(
      countdownSlot,
      10,
      async () => {
        // Cancel clicked
        if (sosId) {
          await handleSOSCancel(sosId);
        }
        countdownSlot.innerHTML = '<div class="sos-cancelled-msg animate-fade-in">✅ SOS Cancelled.</div>';
        // Re-enable SOS button
        const newBtn = createSOSButton({ onTrigger: handleSOSTrigger });
        btnSlot.innerHTML = '';
        btnSlot.appendChild(newBtn);
      },
      async () => {
        // Countdown complete — show chain
        countdownSlot.innerHTML = '';
        chainSlot.appendChild(createEmergencyChain());
      }
    );

    // API call
    try {
      const res = await fetch('/api/sos/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: userName,
          location_coords: location,
          vehicle_type: 'car',
          contact_phone: contactPhone,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        sosId = data.sos_id;
      }
    } catch (err) {
      console.error('[SOS] Trigger API error:', err);
      // Countdown and chain still run visually
    }
  }

  async function handleSOSCancel(id) {
    try {
      await fetch('/api/sos/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sos_id: id }),
      });
    } catch (err) {
      console.error('[SOS] Cancel API error:', err);
    }
  }
}

function injectSOSPageStyles() {
  if (document.getElementById('sos-page-styles')) return;
  const style = document.createElement('style');
  style.id = 'sos-page-styles';
  style.textContent = `
    .sos-page-root {
      min-height: 100vh;
      padding-top: 68px;
      background: radial-gradient(ellipse 80% 50% at 30% 40%, rgba(239,68,68,0.06) 0%, transparent 70%), var(--bg-primary);
    }
    .sos-page-inner {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: var(--space-10);
      padding-block: var(--space-12);
      align-items: flex-start;
    }
    .sos-main-col { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-8); }
    .sos-top-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-1) var(--space-4);
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--accent-red);
      letter-spacing: 0.05em;
    }
    .sos-status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--accent-red);
      animation: sos-pulse 1.5s ease-in-out infinite;
    }
    .sos-heading {
      font-family: var(--font-heading);
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 800;
      line-height: 1.1;
    }
    .sos-sub { max-width: 420px; line-height: 1.7; }
    .sos-btn-area { width: 100%; display: flex; align-items: center; justify-content: center; }
    .sos-gps-row { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
    .sos-contact-details {
      width: 100%;
      max-width: 420px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-4) var(--space-5);
    }
    .sos-contact-toggle {
      cursor: pointer;
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--text-muted);
      list-style: none;
    }
    .sos-contact-toggle::-webkit-details-marker { display: none; }
    .sos-contact-form { display: flex; flex-direction: column; gap: var(--space-4); margin-top: var(--space-4); }
    .sos-help-text { display: flex; flex-direction: column; gap: var(--space-1); text-align: center; }
    .sos-cancelled-msg {
      padding: var(--space-4);
      background: rgba(34,197,94,0.1);
      border: 1px solid rgba(34,197,94,0.3);
      border-radius: var(--radius);
      color: var(--accent-green);
      font-weight: 600;
    }
    .sos-info-col { display: flex; flex-direction: column; gap: 0; }
    .sos-info-card { padding: var(--space-5); }
    .sos-info-title { font-family: var(--font-heading); font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-4); }
    .sos-chain-preview { display: flex; flex-direction: column; gap: var(--space-3); }
    .sos-chain-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; border-bottom: 1px solid var(--border); }
    .sos-chain-row:last-child { border-bottom: none; }
    .sos-chain-icon { font-size: 1.4rem; width: 32px; text-align: center; flex-shrink: 0; }
    .sos-chain-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .sos-chain-label { font-size: var(--text-sm); font-weight: 600; }
    .sos-chain-delay { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--accent-amber); font-weight: 600; }
    .sos-share-list { display: flex; flex-direction: column; gap: var(--space-2); }
    .sos-share-list li { font-size: var(--text-sm); color: var(--text-muted); }
    @media (max-width: 1024px) {
      .sos-page-inner { grid-template-columns: 1fr; }
      .sos-info-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
    }
    @media (max-width: 640px) {
      .sos-info-col { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
}
