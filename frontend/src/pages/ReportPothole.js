/**
 * frontend/src/pages/ReportPothole.js
 * Wraps the ComplaintForm component in a full page layout.
 */

import { createComplaintForm } from '../components/ComplaintForm.js';

export function renderReportPothole() {
  const page = document.createElement('div');
  page.id = 'report-page';
  page.className = 'report-page-root';

  page.innerHTML = `
    <div class="report-hero">
      <div class="container">
        <div class="report-hero-inner">
          <div>
            <span class="section-tag">🕳️ Pothole Reporting</span>
            <h1 class="heading-lg report-title">Report a Pothole</h1>
            <p class="text-muted report-sub">
              Upload a photo — our YOLOv8 AI will analyze the pothole severity,
              register your complaint, and alert the municipality within seconds.
            </p>
          </div>
          <div class="report-stats">
            <div class="report-stat">
              <span class="report-stat-num">⚡ 10s</span>
              <span class="report-stat-label">AI Analysis Time</span>
            </div>
            <div class="report-stat">
              <span class="report-stat-num">📋 1-10</span>
              <span class="report-stat-label">Severity Scale</span>
            </div>
            <div class="report-stat">
              <span class="report-stat-num">🔔 Auto</span>
              <span class="report-stat-label">Nearby Alerts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="report-body">
      <div class="container">
        <div class="report-layout">
          <div class="report-form-col" id="report-form-slot">
            <!-- ComplaintForm injected here -->
          </div>
          <div class="report-info-col">
            <div class="report-info-card card">
              <h3 class="report-info-title">📷 Photo Tips</h3>
              <ul class="report-tips">
                <li>🌞 Use good lighting — avoid night photos without flash</li>
                <li>📐 Capture the full pothole with some road context</li>
                <li>📏 Include something for scale if possible</li>
                <li>✅ JPEG, PNG, or WebP — max 10 MB</li>
              </ul>
            </div>
            <div class="report-info-card card card-amber" style="margin-top:var(--space-4)">
              <h3 class="report-info-title">🤖 AI Severity Scale</h3>
              <div class="sev-scale-list">
                <div class="sev-scale-item">
                  <span class="badge badge-green">1-3</span>
                  <span class="text-sm">Small — surface crack or shallow depression</span>
                </div>
                <div class="sev-scale-item">
                  <span class="badge badge-amber">4-6</span>
                  <span class="text-sm">Medium — noticeable pothole, potential tire damage</span>
                </div>
                <div class="sev-scale-item">
                  <span class="badge badge-red">7-10</span>
                  <span class="text-sm">Large — deep/wide, high accident risk</span>
                </div>
              </div>
            </div>
            <div class="report-info-card card" style="margin-top:var(--space-4)">
              <h3 class="report-info-title">⏱️ What Happens Next</h3>
              <ol class="report-next-steps">
                <li>AI analysis runs — <strong>severity scored 1-10</strong></li>
                <li>Complaint saved with unique ID</li>
                <li>Municipality webhook triggered</li>
                <li>Drivers within ${document.getElementById('app')?.dataset.alertRadiusCar || '80'}m notified</li>
                <li>Expected resolution: <strong>24 hours SLA</strong></li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Inject complaint form
  const formSlot = page.querySelector('#report-form-slot');
  formSlot.appendChild(createComplaintForm());

  injectReportStyles();
  return page;
}

function injectReportStyles() {
  if (document.getElementById('report-styles')) return;
  const style = document.createElement('style');
  style.id = 'report-styles';
  style.textContent = `
    .report-page-root { min-height: 100vh; padding-top: 68px; }
    .report-hero {
      background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
      border-bottom: 1px solid var(--border);
      padding-block: var(--space-12) var(--space-8);
    }
    .report-hero-inner {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-8);
      flex-wrap: wrap;
    }
    .report-title { margin: var(--space-3) 0; }
    .report-sub { max-width: 480px; line-height: 1.7; }
    .report-stats { display: flex; gap: var(--space-6); flex-wrap: wrap; }
    .report-stat { text-align: center; }
    .report-stat-num { display: block; font-family: var(--font-heading); font-size: var(--text-2xl); font-weight: 800; color: var(--accent-amber); margin-bottom: 2px; }
    .report-stat-label { font-size: var(--text-xs); color: var(--text-muted); }
    .report-body { padding-block: var(--space-12); }
    .report-layout { display: grid; grid-template-columns: 1fr 380px; gap: var(--space-8); align-items: flex-start; }
    .report-info-card { padding: var(--space-5); }
    .report-info-title { font-family: var(--font-heading); font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-4); }
    .report-tips { display: flex; flex-direction: column; gap: var(--space-3); }
    .report-tips li { font-size: var(--text-sm); color: var(--text-muted); display: flex; gap: var(--space-2); }
    .sev-scale-list { display: flex; flex-direction: column; gap: var(--space-3); }
    .sev-scale-item { display: flex; align-items: center; gap: var(--space-3); }
    .report-next-steps { display: flex; flex-direction: column; gap: var(--space-2); counter-reset: steps; }
    .report-next-steps li {
      font-size: var(--text-sm);
      color: var(--text-muted);
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      padding: var(--space-2) 0;
      border-bottom: 1px solid var(--border);
    }
    .report-next-steps li:last-child { border-bottom: none; }
    .report-next-steps li strong { color: var(--text-secondary); }
    @media (max-width: 1024px) {
      .report-layout { grid-template-columns: 1fr; }
      .report-info-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
      .report-info-col > *:first-child { grid-column: span 2; }
    }
    @media (max-width: 640px) {
      .report-info-col { grid-template-columns: 1fr; }
      .report-info-col > *:first-child { grid-column: span 1; }
    }
  `;
  document.head.appendChild(style);
}
