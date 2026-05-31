import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ── SOS Countdown ──────────────────────────────────────────────────────────────
function SOSCountdown({ onCancel, onComplete }) {
  const [remaining, setRemaining] = useState(10);
  const totalSeconds = 10;
  const circumference = 326.73;

  useEffect(() => {
    if (remaining <= 0) { onComplete?.(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onComplete]);

  const offset = circumference * (1 - remaining / totalSeconds);
  return (
    <div style={{ textAlign:'center', marginTop:'var(--space-8)' }}>
      <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:'var(--space-4)' }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(239,68,68,0.2)" strokeWidth="4"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent-red)" strokeWidth="4"
            strokeDasharray="326.73" strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 60 60)"
            style={{ transition:'stroke-dashoffset 1s linear' }} />
        </svg>
        <div style={{ position:'absolute', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <span style={{ fontFamily:'var(--font-heading)', fontSize:'2.5rem', fontWeight:800, color:'var(--accent-red)', lineHeight:1 }}>{remaining}</span>
          <span className="text-xs text-muted">seconds</span>
        </div>
      </div>
      <p className="text-muted text-sm" style={{ marginBottom:'var(--space-4)' }}>
        Contacting emergency services in <strong style={{ color:'var(--accent-red)' }}>{remaining}s</strong>
      </p>
      <button className="btn btn-outline" onClick={onCancel} disabled={remaining <= 0}
        style={{ borderColor:'var(--accent-red)', color:'var(--accent-red)' }}>
        ✕ Cancel SOS
      </button>
    </div>
  );
}

// ── Emergency Chain ────────────────────────────────────────────────────────────
const CHAIN_STEPS = [
  { icon: '📍', label: 'GPS Acquired', delay: '0s', status: 'done' },
  { icon: '🚨', label: 'SOS Triggered', delay: '1s', status: 'done' },
  { icon: '📡', label: 'Notifying Emergency Contacts', delay: '2s', status: 'active' },
  { icon: '🏥', label: 'Alerting Nearest Hospital', delay: '5s', status: 'wait' },
  { icon: '🚓', label: 'Contacting Police', delay: '8s', status: 'wait' },
];

function EmergencyChain() {
  const [statuses, setStatuses] = useState(['done','done','active','wait','wait']);
  useEffect(() => {
    const delays = [2000, 5000, 8000];
    const timers = delays.map((d, i) => setTimeout(() => {
      setStatuses(prev => {
        const next = [...prev];
        next[i + 2] = 'done';
        if (i + 3 < next.length) next[i + 3] = 'active';
        return next;
      });
    }, d));
    return () => timers.forEach(clearTimeout);
  }, []);

  const colors = { done: 'var(--accent-green)', active: 'var(--accent-amber)', wait: 'var(--text-muted)' };
  return (
    <div className="card" style={{ padding:'var(--space-5)' }}>
      <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-lg)', fontWeight:700, marginBottom:'var(--space-4)' }}>🔗 Emergency Chain</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
        {CHAIN_STEPS.map((s, i) => (
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', padding:'var(--space-2) 0', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:'1.4rem', width:32, textAlign:'center' }}>{s.icon}</span>
            <div style={{ flex:1 }}>
              <div className="text-sm" style={{ fontWeight:600, color: colors[statuses[i]] }}>{s.label}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--accent-amber)' }}>{s.delay}</div>
            </div>
            <span style={{ fontSize:'var(--text-xs)', fontWeight:700, color: colors[statuses[i]] }}>
              {statuses[i] === 'done' ? '✓ Done' : statuses[i] === 'active' ? '… Active' : 'Waiting'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main SOS Button ────────────────────────────────────────────────────────────
function SOSButton({ onTrigger }) {
  return (
    <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', width:200, height:200, margin:'0 auto' }}>
      <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', border:'2px solid rgba(239,68,68,0.3)', animation:'sos-ring 2.5s ease-out infinite' }} />
      <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', border:'2px solid rgba(239,68,68,0.3)', animation:'sos-ring 2.5s ease-out infinite', animationDelay:'1.25s' }} />
      <button onClick={onTrigger} aria-label="Trigger SOS Emergency Alert"
        style={{ position:'relative', width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle at 35% 35%, #ff6b6b, #b91c1c)', border:'3px solid var(--accent-red)', color:'white', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, cursor:'pointer', animation:'sos-pulse 1.8s ease-in-out infinite', zIndex:2 }}>
        <span style={{ fontSize:'2rem', lineHeight:1 }}>🚨</span>
        <span style={{ fontFamily:'var(--font-heading)', fontSize:'1.75rem', fontWeight:800, letterSpacing:'0.1em', lineHeight:1 }}>SOS</span>
      </button>
    </div>
  );
}

import { getCurrentUser } from '../services/auth';

export default function SOS() {
  const [phase, setPhase] = useState('idle'); // idle | countdown | chain | cancelled
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('detecting');
  const [contactPhone, setContactPhone] = useState(() => {
    const user = getCurrentUser();
    return user?.emergency_contact_phone || localStorage.getItem('sos_contact_phone') || '';
  });
  const [userName, setUserName] = useState(() => {
    const user = getCurrentUser();
    return user?.name || localStorage.getItem('sos_user_name') || '';
  });
  const [sosId, setSosId] = useState(null);

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

  async function handleTrigger() {
    setPhase('countdown');
    const location = gpsCoords || { lat: 20.3893, lng: 72.9106 };
    try {
      const res = await fetch('/api/sos/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: userName || 'Anonymous', location_coords: location, vehicle_type: 'car', contact_phone: contactPhone || '+919999999999' }),
      });
      const data = await res.json();
      if (res.ok) setSosId(data.sos_id);
    } catch (err) {
      console.error('[SOS] Trigger error:', err);
    }
  }

  async function handleCancel() {
    if (sosId) {
      try { await fetch('/api/sos/cancel', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sos_id: sosId }) }); } catch {}
    }
    setPhase('cancelled');
  }

  return (
    <>
      <style>{`
        .sos-page-root { min-height:100vh; padding-top:68px; background:radial-gradient(ellipse 80% 50% at 30% 40%,rgba(239,68,68,0.06) 0%,transparent 70%),var(--bg-primary); }
        .sos-page-inner { display:grid; grid-template-columns:1fr 380px; gap:var(--space-10); padding-block:var(--space-12); align-items:flex-start; }
        .sos-main-col { display:flex; flex-direction:column; align-items:center; text-align:center; gap:var(--space-8); }
        .sos-top-badge { display:inline-flex; align-items:center; gap:var(--space-2); padding:var(--space-1) var(--space-4); background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:var(--radius-full); font-size:var(--text-xs); font-weight:600; color:var(--accent-red); letter-spacing:0.05em; }
        .sos-status-dot { width:8px; height:8px; border-radius:50%; background:var(--accent-red); animation:sos-pulse 1.5s ease-in-out infinite; }
        .sos-heading { font-family:var(--font-heading); font-size:clamp(2rem,5vw,3.5rem); font-weight:800; line-height:1.1; }
        .sos-contact-details { width:100%; max-width:420px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:var(--space-4) var(--space-5); }
        .sos-info-col { display:flex; flex-direction:column; gap:var(--space-4); }
        .sos-info-title { font-family:var(--font-heading); font-size:var(--text-lg); font-weight:700; margin-bottom:var(--space-4); }
        .sos-chain-row { display:flex; align-items:center; gap:var(--space-3); padding:var(--space-2) 0; border-bottom:1px solid var(--border); }
        .sos-chain-row:last-child { border-bottom:none; }
        .sos-share-list li { font-size:var(--text-sm); color:var(--text-muted); padding:var(--space-1) 0; }
        @media (max-width:1024px) { .sos-page-inner { grid-template-columns:1fr; } .sos-info-col { display:grid; grid-template-columns:repeat(2,1fr); } }
        @media (max-width:640px) { .sos-info-col { grid-template-columns:1fr; } }
      `}</style>
      <div className="sos-page-root">
        <div className="container">
          <div className="sos-page-inner">
            {/* Main column */}
            <div className="sos-main-col">
              <div className="sos-top-badge"><div className="sos-status-dot" /> EMERGENCY SOS SYSTEM</div>
              <h1 className="sos-heading">Emergency <span className="text-gradient-red">Alert</span></h1>
              <p className="text-muted" style={{ maxWidth:420, lineHeight:1.7 }}>Press the SOS button to immediately alert emergency contacts and notify nearby services with your GPS location.</p>

              {phase === 'idle' && <SOSButton onTrigger={handleTrigger} />}
              {phase === 'countdown' && <SOSCountdown onCancel={handleCancel} onComplete={() => setPhase('chain')} />}
              {phase === 'chain' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'center', width: '100%' }}>
                  <EmergencyChain />
                  <button className="btn btn-outline btn-sm" onClick={() => setPhase('idle')} style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)', marginTop: 'var(--space-2)' }}>
                    🛑 Reset SOS Demo
                  </button>
                </div>
              )}
              {phase === 'cancelled' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'center' }}>
                  <div style={{ padding:'var(--space-4)', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:'var(--radius)', color:'var(--accent-green)', fontWeight:600 }}>
                    ✕ SOS Cancelled.
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setPhase('idle')}>
                    ↻ Trigger New SOS Demo
                  </button>
                </div>
              )}

              {/* GPS status */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'var(--space-2)' }}>
                <span className={`badge badge-${gpsStatus === 'ok' ? 'green' : 'amber'}`}>
                  📍 {gpsStatus === 'ok' ? `${gpsCoords?.lat?.toFixed(5)}, ${gpsCoords?.lng?.toFixed(5)}` : 'Using default location (Vapi)'}
                </span>
              </div>

              {/* Contact details */}
              <details className="sos-contact-details">
                <summary style={{ cursor:'pointer', fontSize:'var(--text-sm)', fontWeight:500, color:'var(--text-muted)' }}>⚙️ Customize Contact Details</summary>
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)', marginTop:'var(--space-4)' }}>
                  <div>
                    <label className="label" htmlFor="sos-name">Your Name</label>
                    <input id="sos-name" type="text" className="input" value={userName} onChange={e => setUserName(e.target.value)} placeholder="Rahul Sharma" />
                  </div>
                  <div>
                    <label className="label" htmlFor="sos-contact">Emergency Contact Phone</label>
                    <input id="sos-contact" type="tel" className="input" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                </div>
              </details>

              <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-1)', textAlign:'center' }}>
                <p className="text-xs text-muted">🔒 Location shared only during emergency</p>
                <p className="text-xs text-muted">📵 No audio recording</p>
              </div>
            </div>

            {/* Info column */}
            <div className="sos-info-col">
              {/* Chain preview */}
              <div className="card" style={{ padding:'var(--space-5)' }}>
                <h3 className="sos-info-title">🔗 Alert Chain</h3>
                <div style={{ display:'flex', flexDirection:'column' }}>
                  {[
                    { icon:'📍', label:'GPS Location', delay:'Instant' },
                    { icon:'📲', label:'Emergency Contact', delay:'+2s' },
                    { icon:'🏥', label:'Nearest Hospital', delay:'+5s' },
                    { icon:'🚓', label:'Local Police', delay:'+8s' },
                    { icon:'🚑', label:'Ambulance Services', delay:'+10s' },
                  ].map(r => (
                    <div key={r.label} className="sos-chain-row">
                      <span style={{ fontSize:'1.4rem', width:32, textAlign:'center' }}>{r.icon}</span>
                      <div style={{ flex:1 }}>
                        <div className="text-sm" style={{ fontWeight:600 }}>{r.label}</div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--accent-amber)', fontWeight:600 }}>{r.delay}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card card-red" style={{ padding:'var(--space-5)' }}>
                <h3 className="sos-info-title">📋 What Gets Shared</h3>
                <ul className="sos-share-list" style={{ listStyle:'none', padding:0 }}>
                  {['✅ Precise GPS coordinates','✅ Google Maps link','✅ Your name','✅ Vehicle type','✅ Timestamp of incident','❌ No audio recording'].map(s => <li key={s}>{s}</li>)}
                </ul>
              </div>

              <div className="card" style={{ padding:'var(--space-5)' }}>
                <h3 className="sos-info-title">⚡ Auto-Trigger Logic</h3>
                <p className="text-sm text-muted" style={{ lineHeight:1.7 }}>
                  The SafeRoute app monitors accelerometer data. If your device registers a sudden impact followed by <strong style={{ color:'var(--accent-amber)' }}>2 minutes</strong> of being stationary, it automatically initiates the SOS sequence with a 10-second cancel window.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}