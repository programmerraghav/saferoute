import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch, isLoggedIn } from '../services/auth';

// ── Severity Meter (inline) ────────────────────────────────────────────────────
function SeverityMeter({ value }) {
  const sev = value || 0;
  const color = sev >= 7 ? '#ef4444' : sev >= 4 ? '#f59e0b' : '#22c55e';
  const label = sev >= 7 ? 'HIGH SEVERITY' : sev >= 4 ? 'MEDIUM SEVERITY' : sev > 0 ? 'LOW SEVERITY' : 'PENDING';
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'var(--space-2)' }}>
        <span style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-4xl)', fontWeight:800, color }}>{sev}</span>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:'var(--text-xs)', fontWeight:700, letterSpacing:'0.06em', color }}>{label}</div>
          <div className="text-xs text-muted">out of 10</div>
        </div>
      </div>
      <div style={{ height:8, borderRadius:4, background:'var(--bg-secondary)', overflow:'hidden', border:'1px solid var(--border)' }}>
        <div style={{ height:'100%', width:`${sev * 10}%`, background:`linear-gradient(90deg,${color}88,${color})`, borderRadius:4, transition:'width 0.8s ease' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(i => (
          <div key={i} style={{ width:6, height:6, borderRadius:'50%', background: i <= sev ? color : 'var(--border-hover)', transition:'background 0.3s' }} />
        ))}
      </div>
    </div>
  );
}

function drawBBoxOnCanvas(canvas, file, bbox) {
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
      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.max(14, img.width / 40)}px sans-serif`;
      ctx.fillText('POTHOLE', x1 + 4, Math.max(y1 - 6, 16));
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

const STEPS = ['Upload Photo', 'AI Analysis', 'Confirm', 'Done'];

export default function ReportPothole() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('detecting');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [roadName, setRoadName] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('ok'); },
        () => { setGpsCoords({ lat: 20.3893, lng: 72.9106 }); setGpsStatus('fallback'); }
      );
    } else {
      setGpsCoords({ lat: 20.3893, lng: 72.9106 }); setGpsStatus('fallback');
    }
  }, []);

  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFileSelect(file);
  }, [handleFileSelect]);

  async function handleAnalyze() {
    if (!selectedFile || !gpsCoords) return;
    setStep(2);
    setAnalysisLoading(true);
    setAnalysisError('');
    try {
      const form = new FormData();
      form.append('image', selectedFile);
      form.append('location_coords', JSON.stringify(gpsCoords));
      form.append('vehicle_type', vehicleType);
      if (roadName) form.append('road_name', roadName);
      const res = await authFetch('/api/complaints/analyze', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Analysis failed.');
      setAnalysisResult(data);
      if (canvasRef.current && data.bbox) drawBBoxOnCanvas(canvasRef.current, selectedFile, data.bbox);
    } catch (err) {
      setAnalysisError(err.message || 'Network error.');
    } finally {
      setAnalysisLoading(false);
    }
  }

  function resetForm() {
    setStep(1); setSelectedFile(null); setPreviewUrl(null); setAnalysisResult(null); setAnalysisError('');
  }

  const sevBadge = analysisResult ? (analysisResult.severity >= 7 ? 'red' : analysisResult.severity >= 4 ? 'amber' : 'green') : 'green';

  return (
    <>
      <style>{`
        .report-page-root { min-height:100vh; padding-top:68px; }
        .report-hero { background:linear-gradient(180deg,var(--bg-secondary) 0%,var(--bg-primary) 100%); border-bottom:1px solid var(--border); padding-block:var(--space-12) var(--space-8); }
        .report-hero-inner { display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-8); flex-wrap:wrap; }
        .report-stats { display:flex; gap:var(--space-6); flex-wrap:wrap; }
        .report-stat { text-align:center; }
        .report-stat-num { display:block; font-family:var(--font-heading); font-size:var(--text-2xl); font-weight:800; color:var(--accent-amber); margin-bottom:2px; }
        .report-body { padding-block:var(--space-12); }
        .report-layout { display:grid; grid-template-columns:1fr 380px; gap:var(--space-8); align-items:flex-start; }
        .report-info-card { padding:var(--space-5); }
        .report-info-title { font-family:var(--font-heading); font-size:var(--text-lg); font-weight:700; margin-bottom:var(--space-4); }
        .step-indicator { display:flex; align-items:center; margin-bottom:var(--space-10); }
        .step-item { display:flex; flex-direction:column; align-items:center; gap:var(--space-1); position:relative; }
        .step-circle { width:36px; height:36px; border-radius:50%; background:var(--bg-card); border:2px solid var(--border); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:var(--text-sm); transition:var(--transition); font-family:var(--font-heading); }
        .step-item.active .step-circle { background:var(--accent-amber); border-color:var(--accent-amber); color:#0a0e1a; }
        .step-item.done .step-circle { background:var(--accent-green); border-color:var(--accent-green); color:#0a0e1a; }
        .step-label { font-size:var(--text-xs); color:var(--text-muted); white-space:nowrap; }
        .step-item.active .step-label { color:var(--accent-amber); font-weight:600; }
        .step-item.done .step-label { color:var(--accent-green); }
        .step-line { flex:1; height:2px; background:var(--border); transition:background 0.4s ease; }
        .step-line.filled { background:var(--accent-green); }
        .dropzone { border:2px dashed var(--border); border-radius:var(--radius-lg); min-height:220px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:var(--transition); position:relative; overflow:hidden; background:var(--bg-card); }
        .dropzone:hover,.dropzone.drag-over { border-color:var(--accent-amber); background:var(--bg-card-hover); }
        .vehicle-toggle { display:flex; gap:var(--space-3); }
        .vehicle-btn { flex:1; padding:var(--space-3); border-radius:var(--radius); border:2px solid var(--border); background:var(--bg-card); color:var(--text-muted); font-weight:600; font-size:var(--text-sm); transition:var(--transition); cursor:pointer; }
        .vehicle-btn.active { border-color:var(--accent-amber); background:rgba(245,158,11,0.1); color:var(--accent-amber); }
        .done-screen { text-align:center; padding:var(--space-8) 0; }
        .confirm-row { display:flex; justify-content:space-between; align-items:center; padding:var(--space-2) 0; border-bottom:1px solid var(--border); font-size:var(--text-sm); }
        .confirm-row:last-child { border-bottom:none; }
        @media (max-width:1024px) { .report-layout { grid-template-columns:1fr; } }
      `}</style>
      <div className="report-page-root">
        {/* Hero */}
        <div className="report-hero">
          <div className="container">
            <div className="report-hero-inner">
              <div>
                <span className="section-tag">📷 Pothole Reporting</span>
                <h1 className="heading-lg" style={{ margin:'var(--space-3) 0' }}>Report a Pothole</h1>
                <p className="text-muted" style={{ maxWidth:480, lineHeight:1.7 }}>
                  Upload a photo — our YOLOv8 AI will analyze the pothole severity, register your complaint, and alert the municipality within seconds.
                </p>
              </div>
              <div className="report-stats">
                <div className="report-stat"><span className="report-stat-num">⚡ 10s</span><span className="text-xs text-muted">AI Analysis Time</span></div>
                <div className="report-stat"><span className="report-stat-num">📊 1-10</span><span className="text-xs text-muted">Severity Scale</span></div>
                <div className="report-stat"><span className="report-stat-num">📲 Auto</span><span className="text-xs text-muted">Nearby Alerts</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="report-body">
          <div className="container">
            <div className="report-layout">
              {/* Form Column */}
              <div>
                {/* Step Indicator */}
                <div className="step-indicator">
                  {STEPS.map((s, i) => {
                    const n = i + 1;
                    const state = step > n ? 'done' : step === n ? 'active' : '';
                    return (
                      <React.Fragment key={s}>
                        <div className={`step-item ${state}`}>
                          <div className="step-circle">{step > n ? '✓' : n}</div>
                          <span className="step-label">{s}</span>
                        </div>
                        {i < STEPS.length - 1 && <div className={`step-line ${step > n ? 'filled' : ''}`} />}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Step 1: Upload */}
                {step === 1 && (
                  <div style={{ animation:'fadeIn 0.3s ease' }}>
                    <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-2xl)', fontWeight:700, marginBottom:'var(--space-6)' }}>Upload Pothole Photo</h2>
                    <div
                      className={`dropzone${dragOver ? ' drag-over' : ''}`}
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('file-input').click()}
                    >
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" style={{ width:'100%', maxHeight:320, objectFit:'cover', borderRadius:'var(--radius)' }} />
                      ) : (
                        <div style={{ textAlign:'center', padding:'var(--space-8)' }}>
                          <div style={{ fontSize:'3rem', marginBottom:'var(--space-3)' }}>📸</div>
                          <p style={{ fontWeight:600, marginBottom:'var(--space-2)' }}>Drop photo here or click to browse</p>
                          <p className="text-xs text-muted">JPEG, PNG, WebP · Max 10 MB</p>
                        </div>
                      )}
                      <input id="file-input" type="file" accept="image/*" style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer' }}
                        onChange={e => handleFileSelect(e.target.files[0])} />
                    </div>

                    <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', margin:'var(--space-4) 0' }}>
                      <span className={`badge badge-${gpsStatus === 'ok' ? 'green' : 'amber'}`}>
                        📍 {gpsStatus === 'ok' ? `${gpsCoords?.lat?.toFixed(4)}, ${gpsCoords?.lng?.toFixed(4)}` : 'Using default location (Vapi)'}
                      </span>
                    </div>

                    <div style={{ marginBottom:'var(--space-4)' }}>
                      <label className="label" htmlFor="road-name">Road Name (optional)</label>
                      <input id="road-name" type="text" className="input" value={roadName} onChange={e => setRoadName(e.target.value)} placeholder="e.g. NH-48, MG Road…" />
                    </div>

                    <div style={{ marginBottom:'var(--space-6)' }}>
                      <label className="label">Vehicle Type</label>
                      <div className="vehicle-toggle">
                        <button type="button" className={`vehicle-btn${vehicleType === 'car' ? ' active' : ''}`} onClick={() => setVehicleType('car')}>🚗 Car</button>
                        <button type="button" className={`vehicle-btn${vehicleType === 'bike' ? ' active' : ''}`} onClick={() => setVehicleType('bike')}>🏍️ Bike</button>
                        <button type="button" className={`vehicle-btn${vehicleType === 'truck' ? ' active' : ''}`} onClick={() => setVehicleType('truck')}>🚛 Truck</button>
                      </div>
                    </div>

                    <button className="btn btn-amber" style={{ width:'100%', justifyContent:'center' }}
                      disabled={!selectedFile || !gpsCoords} onClick={handleAnalyze}>
                      Analyze with AI →
                    </button>
                  </div>
                )}

                {/* Step 2: AI Analysis */}
                {step === 2 && (
                  <div style={{ animation:'fadeIn 0.3s ease' }}>
                    <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-2xl)', fontWeight:700, marginBottom:'var(--space-6)' }}>AI Analysis</h2>
                    {analysisLoading && (
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'var(--space-4)', padding:'var(--space-12) 0' }}>
                        <div className="spinner spinner-lg" style={{ borderTopColor:'var(--accent-amber)' }} />
                        <p className="text-muted">Analyzing pothole with YOLOv8…</p>
                      </div>
                    )}
                    {analysisError && (
                      <div style={{ textAlign:'center', padding:'var(--space-8) 0' }}>
                        <div style={{ fontSize:'3rem', marginBottom:'var(--space-4)' }}>❌</div>
                        <p style={{ color:'var(--accent-red)', fontWeight:600, marginBottom:'var(--space-4)' }}>{analysisError}</p>
                        <button className="btn btn-outline" onClick={() => setStep(1)}>Try Again</button>
                      </div>
                    )}
                    {!analysisLoading && !analysisError && analysisResult && (
                      <>
                        {analysisResult.bbox && (
                          <div style={{ borderRadius:'var(--radius)', overflow:'hidden', marginBottom:'var(--space-4)', background:'var(--bg-card)' }}>
                            <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:'auto' }} />
                          </div>
                        )}
                        <div className="card" style={{ marginBottom:'var(--space-4)' }}>
                          <SeverityMeter value={analysisResult.severity} />
                          <div style={{ display:'flex', gap:'var(--space-3)', flexWrap:'wrap' }}>
                            <span className={`badge badge-${sevBadge}`}>{analysisResult.severity}/10</span>
                            <span className="badge badge-amber">{analysisResult.pothole_type}</span>
                            <span className="badge" style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', color:'var(--text-muted)' }}>
                              {Math.round((analysisResult.confidence || 0) * 100)}% confidence
                            </span>
                          </div>
                          {analysisResult.ai_summary && (
                            <p className="text-sm text-muted" style={{ marginTop:'var(--space-3)', fontStyle:'italic' }}>"{analysisResult.ai_summary}"</p>
                          )}
                        </div>
                        <div style={{ display:'flex', gap:'var(--space-3)' }}>
                          <button className="btn btn-outline" onClick={() => setStep(1)}>← Retry</button>
                          <button className="btn btn-amber" style={{ flex:1, justifyContent:'center' }} onClick={() => setStep(3)}>Continue →</button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 3: Confirm */}
                {step === 3 && analysisResult && (
                  <div style={{ animation:'fadeIn 0.3s ease' }}>
                    <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-2xl)', fontWeight:700, marginBottom:'var(--space-6)' }}>Confirm & Submit</h2>
                    <div className="card" style={{ marginBottom:'var(--space-6)' }}>
                      <div className="confirm-row"><span>Complaint ID</span><span className="font-mono text-sm">{analysisResult.complaint_id}</span></div>
                      <div className="confirm-row"><span>Severity</span><span className={`badge badge-${sevBadge}`}>{analysisResult.severity}/10</span></div>
                      <div className="confirm-row"><span>Type</span><span>{analysisResult.pothole_type}</span></div>
                      <div className="confirm-row"><span>GPS</span><span className="font-mono text-xs">{gpsCoords?.lat?.toFixed(5)}, {gpsCoords?.lng?.toFixed(5)}</span></div>
                      <div className="confirm-row"><span>Time</span><span>{new Date().toLocaleString('en-IN')}</span></div>
                    </div>
                    <div style={{ display:'flex', gap:'var(--space-3)' }}>
                      <button className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
                      <button className="btn btn-amber" style={{ flex:1, justifyContent:'center' }} onClick={() => setStep(4)}>Submit Report ✓</button>
                    </div>
                  </div>
                )}

                {/* Step 4: Done */}
                {step === 4 && (
                  <div className="done-screen" style={{ animation:'fadeIn 0.3s ease' }}>
                    <div style={{ fontSize:'4rem', marginBottom:'var(--space-4)' }}>✅</div>
                    <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-3xl)', fontWeight:800, marginBottom:'var(--space-6)' }}>Report Submitted!</h2>
                    {analysisResult && (
                      <div className="card" style={{ margin:'0 auto var(--space-6)', maxWidth:320 }}>
                        <p className="text-sm text-muted">Complaint ID</p>
                        <p className="font-mono" style={{ fontSize:'1.25rem', color:'var(--accent-amber)', letterSpacing:'0.05em' }}>{analysisResult.complaint_id}</p>
                      </div>
                    )}
                    <p className="text-muted" style={{ marginBottom:'var(--space-8)', lineHeight:1.7 }}>
                      Your report has been received. Municipality has been notified, and nearby drivers will be alerted within 24h.
                    </p>
                    <div style={{ display:'flex', gap:'var(--space-4)', justifyContent:'center', flexWrap:'wrap' }}>
                      <button className="btn btn-amber" onClick={resetForm}>Report Another</button>
                      <button className="btn btn-outline" onClick={() => navigate('/nearby-map')}>View on Map</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Column */}
              <div>
                <div className="report-info-card card">
                  <h3 className="report-info-title">📷 Photo Tips</h3>
                  <ul style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
                    {['Use good lighting — avoid night photos without flash', 'Capture the full pothole with some road context', 'Include something for scale if possible', 'JPEG, PNG, or WebP — max 10 MB'].map(tip => (
                      <li key={tip} className="text-sm text-muted">• {tip}</li>
                    ))}
                  </ul>
                </div>
                <div className="report-info-card card card-amber" style={{ marginTop:'var(--space-4)' }}>
                  <h3 className="report-info-title">🌡️ AI Severity Scale</h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}><span className="badge badge-green">1-3</span><span className="text-sm">Small — surface crack or shallow depression</span></div>
                    <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}><span className="badge badge-amber">4-6</span><span className="text-sm">Medium — noticeable pothole, potential tire damage</span></div>
                    <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}><span className="badge badge-red">7-10</span><span className="text-sm">Large — deep/wide, high accident risk</span></div>
                  </div>
                </div>
                <div className="report-info-card card" style={{ marginTop:'var(--space-4)' }}>
                  <h3 className="report-info-title">⚡ What Happens Next</h3>
                  <ol style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
                    {['AI analysis runs — severity scored 1-10', 'Complaint saved with unique ID', 'Municipality webhook triggered', 'Drivers within 80m notified', 'Expected resolution: 24 hours SLA'].map((s, i) => (
                      <li key={i} className="text-sm text-muted" style={{ padding:'var(--space-2) 0', borderBottom:'1px solid var(--border)' }}>{i+1}. {s}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}