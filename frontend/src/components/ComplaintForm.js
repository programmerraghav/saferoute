/**
 * frontend/src/components/ComplaintForm.js
 * Multi-step photo upload + GPS complaint form.
 * Steps: 1 Photo → 2 AI Analysis → 3 Confirm → 4 Done
 */

import { createSeverityMeter } from './SeverityMeter.js';

export function createComplaintForm() {
  const el = document.createElement('div');
  el.className = 'complaint-form-root';
  el.innerHTML = `
    <div class="step-indicator" id="step-indicator">
      ${['Photo', 'AI Analysis', 'Confirm', 'Done'].map((label, i) => `
        <div class="step-item ${i === 0 ? 'active' : ''}" id="step-item-${i}">
          <div class="step-circle">${i + 1}</div>
          <span class="step-label">${label}</span>
        </div>
        ${i < 3 ? '<div class="step-line" id="step-line-' + i + '"></div>' : ''}
      `).join('')}
    </div>

    <!-- Step 1: Photo Upload -->
    <div class="form-step" id="step-1">
      <h2 class="step-heading">Upload Pothole Photo</h2>
      <div class="dropzone" id="dropzone" tabindex="0" role="button" aria-label="Click or drag to upload image">
        <div class="dropzone-inner" id="dropzone-inner">
          <div class="dropzone-icon">📷</div>
          <p class="dropzone-title">Drag & drop or click to upload</p>
          <p class="text-sm text-muted">JPEG, PNG, or WebP · Max 10 MB</p>
        </div>
        <img id="image-preview" class="dropzone-preview hidden" alt="Pothole preview"/>
        <input type="file" id="file-input" accept="image/*" class="file-input-hidden" />
      </div>
      <div class="gps-section">
        <div class="gps-chip" id="gps-chip">
          <span>🔄</span> <span id="gps-text">Detecting location...</span>
        </div>
        <button class="btn btn-ghost btn-sm" id="gps-refresh-btn" title="Refresh GPS">↺</button>
      </div>
      <button class="btn btn-amber btn-lg form-submit-btn" id="step1-next" disabled>
        Analyze Pothole →
      </button>
    </div>

    <!-- Step 2: AI Analysis -->
    <div class="form-step hidden" id="step-2">
      <h2 class="step-heading">AI Analysis</h2>
      <div class="analysis-loading" id="analysis-loading">
        <div class="spinner spinner-lg" style="border-top-color:var(--accent-amber)"></div>
        <p class="text-muted">YOLOv8 analyzing image...</p>
        <p class="text-xs text-muted">This may take a few seconds</p>
      </div>
      <div class="analysis-result hidden" id="analysis-result">
        <div class="canvas-wrapper">
          <canvas id="bbox-canvas"></canvas>
        </div>
        <div id="severity-meter-slot" class="severity-slot"></div>
        <div class="analysis-summary" id="analysis-summary"></div>
        <button class="btn btn-amber btn-lg form-submit-btn" id="step2-next">
          Confirm & Submit →
        </button>
      </div>
      <div class="analysis-error hidden" id="analysis-error">
        <p class="error-msg">⚠️ <span id="analysis-error-text">Analysis failed.</span></p>
        <button class="btn btn-outline" id="step2-retry">← Try Again</button>
      </div>
    </div>

    <!-- Step 3: Confirm -->
    <div class="form-step hidden" id="step-3">
      <h2 class="step-heading">Confirm Report</h2>
      <div class="confirm-summary card" id="confirm-summary"></div>
      <div class="confirm-fields">
        <div class="input-group">
          <label class="input-label" for="user-name-input">Your Name</label>
          <input class="input" id="user-name-input" type="text" placeholder="Enter your name" />
        </div>
        <div class="input-group">
          <label class="input-label" for="road-name-input">Road / Area Name (optional)</label>
          <input class="input" id="road-name-input" type="text" placeholder="e.g., NH-48 near Vapi Station" />
        </div>
        <div class="input-group">
          <label class="input-label" for="description-input">Description (optional)</label>
          <textarea class="input" id="description-input" rows="2" placeholder="Any additional details..."></textarea>
        </div>
        <div class="input-group">
          <label class="input-label">Vehicle Type</label>
          <div class="vehicle-toggle" id="vehicle-toggle">
            <button class="vehicle-btn active" data-value="car">🚗 Car</button>
            <button class="vehicle-btn" data-value="bike">🏍️ Bike</button>
          </div>
        </div>
      </div>
      <button class="btn btn-amber btn-lg form-submit-btn" id="step3-submit">
        Register Complaint 📋
      </button>
    </div>

    <!-- Step 4: Done -->
    <div class="form-step hidden" id="step-4">
      <div class="done-screen">
        <div class="done-icon">✅</div>
        <h2 class="done-title">Complaint Registered!</h2>
        <div class="done-id card" id="done-id-card"></div>
        <p class="done-msg text-muted">Municipality alerted. Expected action within 24 hours.<br/>Nearby drivers have been notified.</p>
        <div class="done-actions">
          <button class="btn btn-outline" id="done-report-another">Report Another</button>
          <a href="/dashboard" class="btn btn-amber" data-route="/dashboard">View Dashboard →</a>
        </div>
      </div>
    </div>
  `;

  injectFormStyles();
  initFormLogic(el);
  return el;
}

function initFormLogic(el) {
  let currentStep = 1;
  let gpsCoords = null;
  let selectedFile = null;
  let analysisResult = null;
  let vehicleType = 'car';

  // ── GPS ──────────────────────────────────────────────────
  const gpsText = el.querySelector('#gps-text');
  const gpsChip = el.querySelector('#gps-chip');

  function detectGPS() {
    gpsText.textContent = 'Detecting location...';
    gpsChip.style.borderColor = '';
    if (!navigator.geolocation) {
      gpsText.textContent = 'GPS not available in this browser';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gpsCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        gpsText.textContent = `📍 ${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}`;
        gpsChip.style.borderColor = 'var(--accent-green)';
        checkStep1Ready();
      },
      (err) => {
        gpsText.textContent = 'Location denied — using default';
        gpsCoords = { lat: 20.3893, lng: 72.9106 };
        gpsChip.style.borderColor = 'var(--accent-amber)';
        checkStep1Ready();
      }
    );
  }
  detectGPS();
  el.querySelector('#gps-refresh-btn')?.addEventListener('click', detectGPS);

  // ── Dropzone ─────────────────────────────────────────────
  const dropzone = el.querySelector('#dropzone');
  const fileInput = el.querySelector('#file-input');
  const preview = el.querySelector('#image-preview');
  const dropzoneInner = el.querySelector('#dropzone-inner');

  dropzone.addEventListener('click', (e) => {
    if (e.target !== fileInput) fileInput.click();
  });
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFileSelect(fileInput.files[0]);
  });

  function handleFileSelect(file) {
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
      dropzoneInner.classList.add('hidden');
    };
    reader.readAsDataURL(file);
    checkStep1Ready();
  }

  function checkStep1Ready() {
    const btn = el.querySelector('#step1-next');
    if (btn) btn.disabled = !(selectedFile && gpsCoords);
  }

  // ── Vehicle Toggle ────────────────────────────────────────
  el.querySelectorAll('.vehicle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.vehicle-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      vehicleType = btn.dataset.value;
    });
  });

  // ── Step Navigation ───────────────────────────────────────
  function goToStep(n) {
    el.querySelectorAll('.form-step').forEach((s) => s.classList.add('hidden'));
    el.querySelector(`#step-${n}`)?.classList.remove('hidden');
    el.querySelectorAll('.step-item').forEach((item, i) => {
      item.classList.toggle('active', i === n - 1);
      item.classList.toggle('done', i < n - 1);
    });
    el.querySelectorAll('.step-line').forEach((line, i) => {
      line.classList.toggle('filled', i < n - 1);
    });
    currentStep = n;
  }

  // Step 1 → 2: Analyze
  el.querySelector('#step1-next')?.addEventListener('click', async () => {
    goToStep(2);
    el.querySelector('#analysis-loading').classList.remove('hidden');
    el.querySelector('#analysis-result').classList.add('hidden');
    el.querySelector('#analysis-error').classList.add('hidden');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('user_name', 'Anonymous');
      formData.append('location_coords', JSON.stringify(gpsCoords));
      formData.append('vehicle_type', vehicleType);

      const response = await fetch('/api/complaints/register', { method: 'POST', body: formData });
      const data = await response.json();

      el.querySelector('#analysis-loading').classList.add('hidden');

      if (!response.ok) {
        el.querySelector('#analysis-error-text').textContent = data.message || 'Analysis failed.';
        el.querySelector('#analysis-error').classList.remove('hidden');
        return;
      }

      analysisResult = data;

      // Draw bbox on canvas
      const canvas = el.querySelector('#bbox-canvas');
      drawBBox(canvas, selectedFile, data.bbox);

      // Severity meter
      const meterSlot = el.querySelector('#severity-meter-slot');
      meterSlot.innerHTML = '';
      meterSlot.appendChild(createSeverityMeter(data.severity, data.pothole_type));

      // Summary
      el.querySelector('#analysis-summary').innerHTML = data.ai_summary
        ? `<p class="text-sm text-muted" style="font-style:italic">"${data.ai_summary}"</p>` : '';

      el.querySelector('#analysis-result').classList.remove('hidden');
    } catch (err) {
      el.querySelector('#analysis-loading').classList.add('hidden');
      el.querySelector('#analysis-error-text').textContent = err.message || 'Network error.';
      el.querySelector('#analysis-error').classList.remove('hidden');
    }
  });

  // Step 2 → 3: Confirm
  el.querySelector('#step2-next')?.addEventListener('click', () => {
    goToStep(3);
    const summary = el.querySelector('#confirm-summary');
    if (analysisResult) {
      summary.innerHTML = `
        <div class="confirm-row"><span>Complaint ID</span><span class="font-mono text-sm">${analysisResult.complaint_id}</span></div>
        <div class="confirm-row"><span>Severity</span><span class="badge badge-${analysisResult.severity >= 7 ? 'red' : analysisResult.severity >= 4 ? 'amber' : 'green'}">${analysisResult.severity}/10</span></div>
        <div class="confirm-row"><span>Type</span><span>${analysisResult.pothole_type}</span></div>
        <div class="confirm-row"><span>GPS</span><span class="font-mono text-xs">${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}</span></div>
        <div class="confirm-row"><span>Time</span><span>${new Date().toLocaleString('en-IN')}</span></div>
      `;
    }
  });

  el.querySelector('#step2-retry')?.addEventListener('click', () => goToStep(1));

  // Step 3 → 4: Register (complaint was already saved; just show done screen)
  el.querySelector('#step3-submit')?.addEventListener('click', () => {
    goToStep(4);
    const doneCard = el.querySelector('#done-id-card');
    if (analysisResult) {
      doneCard.innerHTML = `
        <p class="text-sm text-muted">Complaint ID</p>
        <p class="font-mono" style="font-size:1.25rem;color:var(--accent-amber);letter-spacing:0.05em">${analysisResult.complaint_id}</p>
      `;
    }
  });

  el.querySelector('#done-report-another')?.addEventListener('click', () => {
    selectedFile = null;
    analysisResult = null;
    el.querySelector('#file-input').value = '';
    el.querySelector('#image-preview').classList.add('hidden');
    el.querySelector('#dropzone-inner').classList.remove('hidden');
    el.querySelector('#step1-next').disabled = true;
    goToStep(1);
  });
}

function drawBBox(canvas, file, bbox) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    if (bbox && bbox.length === 4) {
      const [x1, y1, x2, y2] = bbox;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = Math.max(3, img.width / 200);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.fillStyle = 'rgba(245,158,11,0.15)';
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      // Label
      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.max(14, img.width / 40)}px sans-serif`;
      ctx.fillText('POTHOLE', x1 + 4, Math.max(y1 - 6, 16));
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function injectFormStyles() {
  if (document.getElementById('complaint-form-styles')) return;
  const style = document.createElement('style');
  style.id = 'complaint-form-styles';
  style.textContent = `
    .complaint-form-root { max-width: 640px; margin: 0 auto; }
    .step-indicator {
      display: flex;
      align-items: center;
      margin-bottom: var(--space-10);
    }
    .step-item { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); position: relative; }
    .step-circle {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--bg-card); border: 2px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: var(--text-sm); transition: var(--transition);
      font-family: var(--font-heading);
    }
    .step-item.active .step-circle { background: var(--accent-amber); border-color: var(--accent-amber); color: #0a0e1a; }
    .step-item.done .step-circle { background: var(--accent-green); border-color: var(--accent-green); color: #0a0e1a; }
    .step-label { font-size: var(--text-xs); color: var(--text-muted); white-space: nowrap; }
    .step-item.active .step-label { color: var(--accent-amber); font-weight: 600; }
    .step-item.done .step-label { color: var(--accent-green); }
    .step-line { flex: 1; height: 2px; background: var(--border); transition: background 0.4s ease; }
    .step-line.filled { background: var(--accent-green); }
    .form-step { animation: fade-in 0.3s ease; }
    .form-step.hidden { display: none; }
    .step-heading { font-family: var(--font-heading); font-size: var(--text-2xl); font-weight: 700; margin-bottom: var(--space-6); }
    .dropzone {
      border: 2px dashed var(--border); border-radius: var(--radius-lg);
      min-height: 220px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; cursor: pointer;
      transition: var(--transition); position: relative; overflow: hidden;
      background: var(--bg-card);
    }
    .dropzone:hover, .dropzone.drag-over { border-color: var(--accent-amber); background: var(--bg-card-hover); }
    .dropzone-inner { text-align: center; pointer-events: none; padding: var(--space-8); }
    .dropzone-icon { font-size: 3rem; margin-bottom: var(--space-3); }
    .dropzone-title { font-weight: 600; margin-bottom: var(--space-2); }
    .dropzone-preview { width: 100%; max-height: 320px; object-fit: cover; border-radius: var(--radius); }
    .file-input-hidden { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .gps-section {
      display: flex; align-items: center; gap: var(--space-3);
      margin: var(--space-4) 0;
    }
    .form-submit-btn { width: 100%; justify-content: center; margin-top: var(--space-4); }
    .canvas-wrapper { border-radius: var(--radius); overflow: hidden; margin-bottom: var(--space-4); background: var(--bg-card); }
    .canvas-wrapper canvas { display: block; width: 100%; height: auto; }
    .severity-slot { margin-bottom: var(--space-4); }
    .analysis-loading { display: flex; flex-direction: column; align-items: center; gap: var(--space-4); padding: var(--space-12) 0; }
    .analysis-error { text-align: center; padding: var(--space-8) 0; display: flex; flex-direction: column; align-items: center; gap: var(--space-4); }
    .error-msg { color: var(--accent-red); font-weight: 600; }
    .confirm-summary { padding: var(--space-4); margin-bottom: var(--space-6); }
    .confirm-row { display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) 0; border-bottom: 1px solid var(--border); font-size: var(--text-sm); }
    .confirm-row:last-child { border-bottom: none; }
    .confirm-fields { display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: var(--space-6); }
    .vehicle-toggle { display: flex; gap: var(--space-3); }
    .vehicle-btn {
      flex: 1; padding: var(--space-3); border-radius: var(--radius); border: 2px solid var(--border);
      background: var(--bg-card); color: var(--text-muted); font-weight: 600; font-size: var(--text-sm);
      transition: var(--transition); cursor: pointer;
    }
    .vehicle-btn.active { border-color: var(--accent-amber); background: var(--accent-amber-glow-xl); color: var(--accent-amber); }
    .done-screen { text-align: center; padding: var(--space-8) 0; }
    .done-icon { font-size: 4rem; margin-bottom: var(--space-4); }
    .done-title { font-family: var(--font-heading); font-size: var(--text-3xl); font-weight: 800; margin-bottom: var(--space-6); }
    .done-id.card { margin: 0 auto var(--space-6); max-width: 320px; }
    .done-msg { margin-bottom: var(--space-8); line-height: 1.7; }
    .done-actions { display: flex; gap: var(--space-4); justify-content: center; flex-wrap: wrap; }
    .hidden { display: none !important; }
  `;
  document.head.appendChild(style);
}
