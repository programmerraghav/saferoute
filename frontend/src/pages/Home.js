/**
 * frontend/src/pages/Home.js
 * Landing page — 7 sections: Hero, How It Works, Features, Phones, Tech Stack, Team, Footer.
 */

import { createTeamSection } from '../components/TeamSection.js';

const TECH_PILLS = [
  'Vapi', 'YOLOv8', 'GPT-4o', 'Azure CosmosDB', 'Azure Event Hub',
  'Azure Sentinel', 'Twilio', 'Firebase', 'FastAPI', 'Express.js',
  'Google Maps API', 'JWT', 'TLS 1.3', 'DPDP Compliant', 'Multer',
  'OpenCV', 'Python', 'Node.js', 'Ultralytics',
];

export function renderHome() {
  const page = document.createElement('div');
  page.id = 'home-page';

  page.innerHTML = `
    <!-- ═══════════════════════════════════════════════════
         SECTION 1 — HERO
    ═══════════════════════════════════════════════════ -->
    <section class="hero-section" id="hero">
      <div class="hero-bg">
        <canvas id="hero-canvas"></canvas>
      </div>
      <div class="container hero-content">
        <div class="hero-badge animate-fade-in">
          <span class="hero-badge-dot"></span>
          Live road safety monitoring · Vapi, Gujarat
        </div>
        <h1 class="heading-xl hero-title animate-fade-in delay-100">
          Smarter Roads.<br/>
          <span class="text-gradient-amber">Safer Lives.</span>
        </h1>
        <p class="hero-sub animate-fade-in delay-200">
          AI-powered pothole detection and real-time SOS emergency alerts —<br/>
          built for India's roads, powered by YOLOv8 and Azure.
        </p>
        <div class="hero-btns animate-fade-in delay-300">
          <a href="/report" class="btn btn-amber btn-lg animate-amber-pulse" data-route="/report" id="hero-report-btn">
            📷 Report a Pothole
          </a>
          <a href="/sos" class="btn btn-red btn-lg" data-route="/sos" id="hero-sos-btn">
            🚨 Trigger SOS Demo
          </a>
        </div>
        <div class="hero-stats animate-fade-in delay-400">
          <div class="hero-stat">
            <span class="hero-stat-num" data-target="10" data-suffix="s">0</span>
            <span class="hero-stat-label">SOS Response Time</span>
          </div>
          <div class="hero-stat-div"></div>
          <div class="hero-stat">
            <span class="hero-stat-num" data-target="8" data-prefix="YOLOv">0</span>
            <span class="hero-stat-label">AI Detection Engine</span>
          </div>
          <div class="hero-stat-div"></div>
          <div class="hero-stat">
            <span class="hero-stat-num" data-target="3" data-suffix="-Step">0</span>
            <span class="hero-stat-label">Emergency Call Chain</span>
          </div>
        </div>
      </div>
      <div class="hero-scroll-indicator">
        <div class="hero-scroll-mouse"><div class="hero-scroll-dot"></div></div>
        <span class="text-xs text-muted">Scroll to explore</span>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════
         SECTION 2 — HOW IT WORKS
    ═══════════════════════════════════════════════════ -->
    <section class="section how-section" id="how-it-works">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">⚙️ How It Works</span>
          <h2 class="heading-lg">Two Life-Saving Systems</h2>
        </div>
        <div class="how-grid">
          <!-- Pothole Track -->
          <div class="how-track how-track-amber">
            <div class="how-track-header">
              <span class="how-track-icon">🕳️</span>
              <div>
                <h3 class="how-track-title">Pothole Reporting</h3>
                <span class="badge badge-amber">YOLOv8 AI Track</span>
              </div>
            </div>
            ${[
              ['📱', 'Open App', 'Launch SafeRoute — available on mobile and web'],
              ['📷', 'Capture Photo', 'Take a photo · GPS coordinates auto-attached'],
              ['🤖', 'AI Analysis', 'YOLOv8 analyzes image · severity scored 1-10'],
              ['📋', 'Complaint Issued', 'Unique complaint ID generated, municipality notified'],
              ['🔔', 'Drivers Alerted', 'Nearby drivers notified within configured radius'],
            ].map(([icon, title, desc], i) => `
              <div class="how-step reveal" style="animation-delay:${i * 0.12}s">
                <div class="how-step-left">
                  <div class="step-number step-number-amber">${i + 1}</div>
                  ${i < 4 ? '<div class="how-connector how-connector-amber"></div>' : ''}
                </div>
                <div class="how-step-body">
                  <div class="how-step-title"><span>${icon}</span> ${title}</div>
                  <p class="how-step-desc text-sm text-muted">${desc}</p>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- SOS Track -->
          <div class="how-track how-track-red">
            <div class="how-track-header">
              <span class="how-track-icon">🚨</span>
              <div>
                <h3 class="how-track-title">SOS Emergency Alert</h3>
                <span class="badge badge-red">Auto-Trigger Track</span>
              </div>
            </div>
            ${[
              ['⚡', 'Accident Detected', 'Manual SOS press or auto-detect if stationary >2 min'],
              ['⏳', 'Cancel Window', '10-second countdown window to cancel false triggers'],
              ['📞', 'Call Chain Fires', 'Family SMS + call → 108 Ambulance → 100 Police'],
              ['📍', 'GPS Shared', 'Precise location shared with all emergency contacts'],
              ['🏥', 'Operator Handoff', 'Live emergency operator takes over coordination'],
            ].map(([icon, title, desc], i) => `
              <div class="how-step reveal" style="animation-delay:${i * 0.12 + 0.2}s">
                <div class="how-step-left">
                  <div class="step-number step-number-red">${i + 1}</div>
                  ${i < 4 ? '<div class="how-connector how-connector-red"></div>' : ''}
                </div>
                <div class="how-step-body">
                  <div class="how-step-title"><span>${icon}</span> ${title}</div>
                  <p class="how-step-desc text-sm text-muted">${desc}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════
         SECTION 3 — FEATURES GRID
    ═══════════════════════════════════════════════════ -->
    <section class="section features-section" id="features">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">✨ Features</span>
          <h2 class="heading-lg">Everything You Need</h2>
        </div>
        <div class="features-grid">
          ${[
            ['🎙️', 'Multilingual Voice Agent', 'Report potholes by voice in Hindi, English, and regional languages via Vapi integration.', 'amber'],
            ['🤖', 'YOLOv8 Pothole AI', 'Custom-trained model detects potholes with severity scoring from 1-10 based on bounding box area.', 'amber'],
            ['🚨', 'Auto-SOS System', 'Automatically triggers emergency alert if the device remains stationary for over 2 minutes post-impact.', 'red'],
            ['📍', 'Live GPS Sharing', 'Precise coordinates shared with family, ambulance, and police instantly on SOS trigger.', 'red'],
            ['🗺️', 'Municipality Dashboard', 'Real-time heatmap of pothole hotspots with complaint management for road authorities.', 'amber'],
            ['🔒', 'Azure Zero-Trust Security', 'TLS 1.3 encryption, JWT authentication, and DPDP-compliant data handling throughout.', 'red'],
          ].map(([icon, title, desc, color], i) => `
            <div class="feature-card card card-${color} reveal" style="animation-delay:${i * 0.1}s">
              <div class="feature-icon">${icon}</div>
              <h3 class="feature-title">${title}</h3>
              <p class="feature-desc text-sm text-muted">${desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════
         SECTION 4 — PHONE MOCKUPS
    ═══════════════════════════════════════════════════ -->
    <section class="section phones-section" id="phones">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">📱 App Preview</span>
          <h2 class="heading-lg">Designed for the Road</h2>
        </div>
        <div class="phones-wrapper">
          <!-- Left Phone: Pothole -->
          <div class="phone-mockup reveal delay-100">
            <div class="phone-frame">
              <div class="phone-notch"></div>
              <div class="phone-screen">
                <div class="phone-screen-header">
                  <span class="phone-app-name">SafeRoute</span>
                  <span class="phone-gps-dot">📍</span>
                </div>
                <div class="phone-camera-area">
                  <div class="phone-viewfinder">
                    <div class="phone-corner tl"></div>
                    <div class="phone-corner tr"></div>
                    <div class="phone-corner bl"></div>
                    <div class="phone-corner br"></div>
                    <div class="phone-pothole-indicator">
                      <div class="phone-bbox"></div>
                      <span class="phone-bbox-label">POTHOLE</span>
                    </div>
                  </div>
                </div>
                <div class="phone-gps-chip">📍 Lat: 20.3893 · Lng: 72.9106</div>
                <div class="phone-sev-row">
                  <span class="phone-sev-label">Severity:</span>
                  <div class="phone-sev-bar">
                    <div class="phone-sev-fill" style="width:70%;background:var(--accent-red)"></div>
                  </div>
                  <span class="badge badge-red" style="font-size:9px">7/10 HIGH</span>
                </div>
                <button class="phone-action-btn phone-amber-btn">Submit Complaint</button>
              </div>
              <div class="phone-home-bar"></div>
            </div>
            <p class="phone-caption">Pothole Complaint</p>
          </div>

          <!-- Right Phone: SOS -->
          <div class="phone-mockup reveal delay-200">
            <div class="phone-frame phone-frame-dark">
              <div class="phone-notch"></div>
              <div class="phone-screen phone-screen-dark">
                <div class="phone-screen-header">
                  <span class="phone-app-name" style="color:var(--accent-red)">EMERGENCY SOS</span>
                </div>
                <div class="phone-sos-area">
                  <div class="phone-sos-ring ring-1"></div>
                  <div class="phone-sos-ring ring-2"></div>
                  <div class="phone-sos-circle">
                    <span class="phone-sos-icon">🚨</span>
                    <span class="phone-sos-text">SOS</span>
                  </div>
                </div>
                <p class="phone-countdown">Calling in <strong style="color:var(--accent-red)">08s</strong></p>
                <button class="phone-action-btn phone-cancel-btn">✕ CANCEL</button>
                <div class="phone-chain-row">
                  <span class="phone-chain-item chain-done">Family ✓</span>
                  <span class="phone-chain-item chain-active">108 ⟳</span>
                  <span class="phone-chain-item chain-wait">100 ⟳</span>
                </div>
              </div>
              <div class="phone-home-bar"></div>
            </div>
            <p class="phone-caption">SOS Emergency</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════
         SECTION 5 — TECH STACK
    ═══════════════════════════════════════════════════ -->
    <section class="tech-section" id="tech-stack">
      <div class="tech-gradient-top"></div>
      <div class="tech-scroll-wrap">
        <div class="tech-scroll-track" id="tech-track">
          ${[...TECH_PILLS, ...TECH_PILLS].map((t) => `<span class="tech-pill">${t}</span>`).join('')}
        </div>
      </div>
      <div class="tech-gradient-bottom"></div>
    </section>

    <!-- ═══════════════════════════════════════════════════
         SECTION 6 — TEAM (injected below)
    ═══════════════════════════════════════════════════ -->
    <div id="team-slot"></div>

    <!-- ═══════════════════════════════════════════════════
         SECTION 7 — FOOTER
    ═══════════════════════════════════════════════════ -->
    <footer class="footer" id="footer">
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand">
            <div class="footer-logo">🚦 Safe<span class="text-gradient-amber">Route</span></div>
            <p class="footer-tagline text-muted text-sm">Road Safety AI System</p>
            <p class="footer-hackathon text-xs text-muted">Built for public safety · 2025</p>
          </div>
          <div class="footer-emergency">
            <p class="footer-emergency-title text-sm font-mono">Emergency Numbers</p>
            <div class="footer-emergency-nums">
              <a class="footer-emergency-num" href="tel:108">🚑 108</a>
              <a class="footer-emergency-num" href="tel:100">🚔 100</a>
            </div>
          </div>
          <div class="footer-nav">
            <a href="/" class="footer-link" data-route="/">Home</a>
            <a href="/report" class="footer-link" data-route="/report">Report Pothole</a>
            <a href="/sos" class="footer-link" data-route="/sos">SOS</a>
            <a href="/dashboard" class="footer-link" data-route="/dashboard">Dashboard</a>
          </div>
        </div>
        <div class="footer-bottom">
          <p class="text-xs text-muted">© 2025 SafeRoute. Built with ❤️ for road safety in India.</p>
          <p class="text-xs text-muted">YOLOv8 · GPT-4o · Azure · Twilio · Firebase</p>
        </div>
      </div>
    </footer>
  `;

  // Inject Team section
  const teamSlot = page.querySelector('#team-slot');
  teamSlot.appendChild(createTeamSection());

  injectHomeStyles();

  // Setup animations after mount
  requestAnimationFrame(() => {
    setupHeroCanvas(page.querySelector('#hero-canvas'));
    setupCounters(page.querySelectorAll('.hero-stat-num'));
    setupRevealObserver(page.querySelectorAll('.reveal'));
    setupTechScroll(page.querySelector('#tech-track'));
  });

  return page;
}

// ── Hero Canvas: Animated dot-grid background ──────────────
function setupHeroCanvas(canvas) {
  if (!canvas) return;
  const parent = canvas.parentElement;
  let w = parent.offsetWidth;
  let h = parent.offsetHeight;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  const SPACING = 32;
  let tick = 0;

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const cols = Math.ceil(w / SPACING) + 1;
    const rows = Math.ceil(h / SPACING) + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * SPACING;
        const y = r * SPACING;
        const dist = Math.sqrt((x - w / 2) ** 2 + (y - h / 2) ** 2);
        const wave = Math.sin(dist / 60 - tick / 40) * 0.5 + 0.5;
        const alpha = 0.08 + wave * 0.12;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,158,11,${alpha})`;
        ctx.fill();
      }
    }
    tick++;
    requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('resize', () => {
    w = parent.offsetWidth; h = parent.offsetHeight;
    canvas.width = w; canvas.height = h;
  });
}

// ── Count-up animation ────────────────────────────────────
function setupCounters(elements) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      let current = 0;
      const step = Math.max(1, Math.floor(target / 40));
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = `${prefix}${current}${suffix}`;
        if (current >= target) clearInterval(interval);
      }, 40);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  elements.forEach((el) => observer.observe(el));
}

// ── IntersectionObserver for .reveal elements ─────────────
function setupRevealObserver(elements) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  elements.forEach((el) => observer.observe(el));
}

// ── Horizontal tech scroll marquee ───────────────────────
function setupTechScroll(track) {
  if (!track) return;
  track.style.animation = 'tech-scroll 30s linear infinite';
  track.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
  track.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
}

function injectHomeStyles() {
  if (document.getElementById('home-styles')) return;
  const style = document.createElement('style');
  style.id = 'home-styles';
  style.textContent = `
    /* ── Hero ─────────────────────────────────────── */
    .hero-section {
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding-top: 68px;
    }
    .hero-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
    }
    .hero-bg::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,158,11,0.06) 0%, transparent 70%);
    }
    #hero-canvas { width: 100%; height: 100%; }
    .hero-content {
      position: relative;
      z-index: 1;
      text-align: center;
      padding-block: var(--space-20);
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-1) var(--space-4);
      background: rgba(245,158,11,0.08);
      border: 1px solid rgba(245,158,11,0.2);
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: 500;
      color: var(--accent-amber);
      margin-bottom: var(--space-6);
    }
    .hero-badge-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--accent-green);
      animation: sos-pulse 2s ease-in-out infinite;
    }
    .hero-title { margin-bottom: var(--space-6); }
    .hero-sub {
      font-size: clamp(var(--text-base), 2vw, var(--text-xl));
      color: var(--text-muted);
      max-width: 560px;
      margin: 0 auto var(--space-8);
      line-height: 1.7;
    }
    .hero-btns {
      display: flex;
      gap: var(--space-4);
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: var(--space-12);
    }
    .hero-stats {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-8);
      flex-wrap: wrap;
    }
    .hero-stat { text-align: center; }
    .hero-stat-num {
      display: block;
      font-family: var(--font-heading);
      font-size: var(--text-4xl);
      font-weight: 800;
      color: var(--accent-amber);
      line-height: 1;
      margin-bottom: var(--space-1);
    }
    .hero-stat-label { font-size: var(--text-sm); color: var(--text-muted); }
    .hero-stat-div { width: 1px; height: 48px; background: var(--border); }
    .hero-scroll-indicator {
      position: absolute;
      bottom: var(--space-8);
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      z-index: 1;
      animation: bounce-subtle 2s ease-in-out infinite;
    }
    .hero-scroll-mouse {
      width: 24px; height: 38px;
      border: 2px solid var(--border-hover);
      border-radius: 12px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 4px;
    }
    .hero-scroll-dot {
      width: 4px; height: 8px;
      background: var(--accent-amber);
      border-radius: 2px;
      animation: bounce-subtle 1.5s ease-in-out infinite;
    }

    /* ── How It Works ──────────────────────────────── */
    .how-section { background: var(--bg-secondary); }
    .how-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-8); }
    .how-track {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: var(--space-8);
    }
    .how-track-amber { border-top: 3px solid var(--accent-amber); }
    .how-track-red { border-top: 3px solid var(--accent-red); }
    .how-track-header {
      display: flex; align-items: center; gap: var(--space-4);
      margin-bottom: var(--space-6);
    }
    .how-track-icon { font-size: 2rem; }
    .how-track-title { font-family: var(--font-heading); font-size: var(--text-xl); font-weight: 700; margin-bottom: var(--space-1); }
    .how-step { display: flex; gap: var(--space-4); margin-bottom: var(--space-2); }
    .how-step-left { display: flex; flex-direction: column; align-items: center; gap: 0; }
    .how-connector { width: 2px; flex: 1; min-height: 20px; margin: 4px 0; }
    .how-connector-amber { background: linear-gradient(to bottom, var(--accent-amber), transparent); }
    .how-connector-red { background: linear-gradient(to bottom, var(--accent-red), transparent); }
    .how-step-body { padding-top: var(--space-2); padding-bottom: var(--space-3); }
    .how-step-title { font-weight: 600; font-size: var(--text-sm); margin-bottom: 2px; display: flex; align-items: center; gap: var(--space-2); }
    .how-step-desc { line-height: 1.55; }

    /* ── Features ──────────────────────────────────── */
    .features-section { background: var(--bg-primary); }
    .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-6); }
    .feature-card { display: flex; flex-direction: column; gap: var(--space-3); }
    .feature-icon { font-size: 2rem; }
    .feature-title { font-family: var(--font-heading); font-size: var(--text-lg); font-weight: 700; }
    .feature-desc { line-height: 1.6; }

    /* ── Phone Mockups ─────────────────────────────── */
    .phones-section { background: var(--bg-secondary); }
    .phones-wrapper { display: flex; align-items: flex-start; justify-content: center; gap: var(--space-12); flex-wrap: wrap; }
    .phone-mockup { display: flex; flex-direction: column; align-items: center; gap: var(--space-4); }
    .phone-frame {
      width: 240px;
      background: linear-gradient(145deg, #1a2236, #0d1220);
      border: 2px solid rgba(255,255,255,0.12);
      border-radius: 36px;
      padding: 12px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08);
      position: relative;
    }
    .phone-frame-dark { background: linear-gradient(145deg, #1a0a0a, #0d0505); border-color: rgba(239,68,68,0.2); }
    .phone-notch { width: 80px; height: 20px; background: #0a0e1a; border-radius: 10px; margin: 0 auto 8px; }
    .phone-screen { background: var(--bg-card); border-radius: 24px; padding: var(--space-3); min-height: 400px; display: flex; flex-direction: column; gap: var(--space-2); }
    .phone-screen-dark { background: #0d0505; }
    .phone-screen-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2); }
    .phone-app-name { font-family: var(--font-heading); font-size: 11px; font-weight: 700; color: var(--text-primary); }
    .phone-camera-area { flex: 1; background: #070b14; border-radius: 12px; min-height: 140px; position: relative; overflow: hidden; }
    .phone-viewfinder { position: absolute; inset: 12px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; }
    .phone-corner { position: absolute; width: 12px; height: 12px; border-color: var(--accent-amber); border-style: solid; }
    .phone-corner.tl { top: 0; left: 0; border-width: 2px 0 0 2px; border-radius: 3px 0 0 0; }
    .phone-corner.tr { top: 0; right: 0; border-width: 2px 2px 0 0; border-radius: 0 3px 0 0; }
    .phone-corner.bl { bottom: 0; left: 0; border-width: 0 0 2px 2px; border-radius: 0 0 0 3px; }
    .phone-corner.br { bottom: 0; right: 0; border-width: 0 2px 2px 0; border-radius: 0 0 3px 0; }
    .phone-pothole-indicator { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; }
    .phone-bbox { width: 60px; height: 45px; border: 2px solid var(--accent-amber); border-radius: 4px; background: rgba(245,158,11,0.1); margin: 0 auto 4px; }
    .phone-bbox-label { font-size: 8px; color: var(--accent-amber); font-weight: 700; letter-spacing: 1px; }
    .phone-gps-chip { font-size: 8px; color: var(--accent-green); background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); border-radius: 20px; padding: 2px 6px; text-align: center; font-family: var(--font-mono); }
    .phone-sev-row { display: flex; align-items: center; gap: 4px; }
    .phone-sev-label { font-size: 8px; color: var(--text-muted); white-space: nowrap; }
    .phone-sev-bar { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
    .phone-sev-fill { height: 100%; border-radius: 2px; }
    .phone-action-btn { width: 100%; padding: 8px; border-radius: 12px; font-size: 10px; font-weight: 700; text-align: center; cursor: default; }
    .phone-amber-btn { background: linear-gradient(135deg,var(--accent-amber),var(--accent-amber-dark)); color: #0a0e1a; }
    .phone-cancel-btn { background: transparent; border: 1px solid rgba(239,68,68,0.4); color: var(--accent-red); }
    .phone-home-bar { width: 60px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin: 8px auto 0; }
    .phone-caption { font-size: var(--text-sm); color: var(--text-muted); font-weight: 500; }
    .phone-sos-area { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; }
    .phone-sos-ring {
      position: absolute;
      border-radius: 50%;
      border: 1.5px solid rgba(239,68,68,0.3);
      animation: sos-ring 2.5s ease-out infinite;
    }
    .ring-1 { width: 100px; height: 100px; }
    .ring-2 { width: 100px; height: 100px; animation-delay: 1.25s; }
    .phone-sos-circle {
      width: 70px; height: 70px; border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #ff6b6b, var(--accent-red-dark));
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      border: 2px solid var(--accent-red);
      animation: sos-pulse 1.8s ease-in-out infinite;
      z-index: 1;
    }
    .phone-sos-icon { font-size: 1.4rem; }
    .phone-sos-text { font-family: var(--font-heading); font-size: 12px; font-weight: 800; color: white; letter-spacing: 2px; }
    .phone-countdown { text-align: center; font-size: 10px; color: var(--text-muted); }
    .phone-chain-row { display: flex; justify-content: center; gap: 8px; }
    .phone-chain-item { font-size: 8px; padding: 2px 6px; border-radius: 10px; font-weight: 600; }
    .chain-done { background: rgba(34,197,94,0.15); color: var(--accent-green); }
    .chain-active { background: rgba(245,158,11,0.15); color: var(--accent-amber); }
    .chain-wait { background: rgba(255,255,255,0.05); color: var(--text-muted); }

    /* ── Tech Scroll ───────────────────────────────── */
    .tech-section { position: relative; padding-block: var(--space-8); overflow: hidden; background: var(--bg-primary); }
    .tech-gradient-top, .tech-gradient-bottom {
      position: absolute; left: 0; right: 0; height: 60px; z-index: 2; pointer-events: none;
    }
    .tech-gradient-top { top: 0; background: linear-gradient(to bottom, var(--bg-primary), transparent); }
    .tech-gradient-bottom { bottom: 0; background: linear-gradient(to top, var(--bg-primary), transparent); }
    .tech-scroll-wrap { overflow: hidden; padding-block: var(--space-2); }
    .tech-scroll-track { display: flex; gap: var(--space-4); width: max-content; white-space: nowrap; }
    .tech-pill {
      display: inline-flex;
      align-items: center;
      padding: var(--space-2) var(--space-5);
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-full);
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--text-muted);
      transition: var(--transition);
    }
    .tech-pill:hover { border-color: var(--accent-amber); color: var(--accent-amber); }

    /* ── Footer ────────────────────────────────────── */
    .footer { background: #070a12; border-top: 1px solid var(--border); padding-block: var(--space-12) var(--space-8); }
    .footer-top { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: var(--space-8); margin-bottom: var(--space-8); }
    .footer-logo { font-family: var(--font-heading); font-size: var(--text-2xl); font-weight: 800; margin-bottom: var(--space-2); }
    .footer-tagline { margin-bottom: var(--space-1); }
    .footer-emergency-title { color: var(--text-secondary); margin-bottom: var(--space-3); }
    .footer-emergency-nums { display: flex; gap: var(--space-4); }
    .footer-emergency-num {
      font-family: var(--font-heading); font-size: var(--text-xl); font-weight: 800;
      color: var(--accent-amber); transition: var(--transition);
    }
    .footer-emergency-num:hover { color: var(--accent-amber-light); }
    .footer-nav { display: flex; flex-direction: column; gap: var(--space-3); }
    .footer-link { font-size: var(--text-sm); color: var(--text-muted); transition: var(--transition); }
    .footer-link:hover { color: var(--text-primary); }
    .footer-bottom { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); padding-top: var(--space-6); border-top: 1px solid var(--border); }

    /* ── Responsive ─────────────────────────────────── */
    @media (max-width: 1024px) {
      .features-grid { grid-template-columns: repeat(2, 1fr); }
      .footer-top { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 768px) {
      .how-grid { grid-template-columns: 1fr; }
      .features-grid { grid-template-columns: 1fr; }
      .hero-stats { gap: var(--space-6); }
      .hero-stat-div { display: none; }
      .footer-top { grid-template-columns: 1fr; }
      .footer-bottom { flex-direction: column; }
      .phones-wrapper { gap: var(--space-8); }
    }
  `;
  document.head.appendChild(style);
}
