import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// ── Data ───────────────────────────────────────────────────────────────────────
const TECH_PILLS = [
  'Vapi', 'YOLOv8', 'GPT-4o', 'CosmosDB', 'Event Hub',
  'Sentinel', 'Twilio', 'Firebase', 'FastAPI', 'Express.js',
  'Google Maps API', 'JWT', 'TLS 1.3', 'DPDP Compliant', 'Multer',
  'OpenCV', 'Python', 'Node.js', 'Ultralytics',
];

const FEATURES = [
  ['🎙️', 'Multilingual Voice Agent', 'Report potholes by voice in Hindi, English, and regional languages via Vapi integration.', 'amber'],
  ['🤖', 'YOLOv8 Pothole AI', 'Custom-trained model detects potholes with severity scoring from 1-10 based on bounding box area.', 'amber'],
  ['🚨', 'Auto-SOS System', 'Automatically triggers emergency alert if the device remains stationary for over 2 minutes post-impact.', 'red'],
  ['📍', 'Live GPS Sharing', 'Precise coordinates shared with family, ambulance, and police instantly on SOS trigger.', 'red'],
  ['🗺️', 'Municipality Dashboard', 'Real-time heatmap of pothole hotspots with complaint management for road authorities.', 'amber'],
  ['🔒', 'Zero-Trust Security', 'TLS 1.3 encryption, JWT authentication, and DPDP-compliant data handling throughout.', 'red'],
];

const POTHOLE_STEPS = [
  ['📱', 'Open App', 'Launch SafeRoute — available on mobile and web'],
  ['📷', 'Capture Photo', 'Take a photo · GPS coordinates auto-attached'],
  ['🤖', 'AI Analysis', 'YOLOv8 analyzes image · severity scored 1-10'],
  ['📋', 'Complaint Issued', 'Unique complaint ID generated, municipality notified'],
  ['🔔', 'Drivers Alerted', 'Nearby drivers notified within configured radius'],
];

const SOS_STEPS = [
  ['⚡', 'Accident Detected', 'Manual SOS press or auto-detect if stationary >2 min'],
  ['⏳', 'Cancel Window', '10-second countdown window to cancel false triggers'],
  ['📞', 'Call Chain Fires', 'Family SMS + call → 108 Ambulance → 100 Police'],
  ['📍', 'GPS Shared', 'Precise location shared with all emergency contacts'],
  ['🏥', 'Operator Handoff', 'Live emergency operator takes over coordination'],
];

const TEAM = [
  { name: 'Abhinav', role: 'Voice AI + Sensors', desc: 'Voice agent · STT pipeline · sensor integration · model-voice connect', color: '#8b5cf6' },
  { name: 'Davik', role: 'SOS Framework', desc: 'Auto-trigger logic · REST APIs · emergency call/SMS · CosmosDB logs', color: '#ef4444' },
  { name: 'Mahima', role: 'UI/UX Design', desc: 'Complaint screen · SOS screen · municipality dashboard · Figma prototype', color: '#3b82f6' },
  { name: 'Mihika', role: 'ML / YOLOv8', desc: 'Dataset labeling · model training · severity scoring · data pipeline', color: '#10b981' },
  { name: 'Anuj', role: 'Graphics + Comms', desc: 'PPT design · architecture visuals · demo video · brand identity', color: '#f59e0b' },
  { name: 'Raghav', role: 'Overall Lead', desc: 'Cloud setup · security audit · DPDP · integration test · demo pitch', color: '#6b7280' },
];

// ── Hero Canvas ────────────────────────────────────────────────────────────────
function HeroCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    let w = parent.offsetWidth, h = parent.offsetHeight;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const SPACING = 32;
    let tick = 0, raf;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / SPACING) + 1;
      const rows = Math.ceil(h / SPACING) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * SPACING, y = r * SPACING;
          const dist = Math.sqrt((x - w/2) ** 2 + (y - h/2) ** 2);
          const wave = Math.sin(dist / 60 - tick / 40) * 0.5 + 0.5;
          const alpha = 0.08 + wave * 0.12;
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(245,158,11,${alpha})`;
          ctx.fill();
        }
      }
      tick++;
      raf = requestAnimationFrame(draw);
    }
    draw();
    const onResize = () => { w = parent.offsetWidth; h = parent.offsetHeight; canvas.width = w; canvas.height = h; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={ref} style={{ width:'100%', height:'100%' }} />;
}

// ── Counter Stat ───────────────────────────────────────────────────────────────
function CounterStat({ prefix = '', target, suffix = '', label }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      let current = 0;
      const step = Math.max(1, Math.floor(target / 40));
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = `${prefix}${current}${suffix}`;
        if (current >= target) clearInterval(interval);
      }, 40);
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefix, target, suffix]);
  return (
    <div style={{ textAlign:'center' }}>
      <span ref={ref} style={{ display:'block', fontFamily:'var(--font-heading)', fontSize:'var(--text-4xl)', fontWeight:800, color:'var(--accent-amber)', lineHeight:1, marginBottom:'var(--space-1)' }}>0</span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

// ── Reveal hook ───────────────────────────────────────────────────────────────
function useReveal(ref) {
  useEffect(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

export default function Home() {
  const pageRef = useRef(null);
  const techRef = useRef(null);
  useReveal(pageRef);

  // Tech scroll marquee
  useEffect(() => {
    const track = techRef.current;
    if (!track) return;
    track.style.animation = 'tech-scroll 30s linear infinite';
    const pause = () => track.style.animationPlayState = 'paused';
    const play = () => track.style.animationPlayState = 'running';
    track.addEventListener('mouseenter', pause);
    track.addEventListener('mouseleave', play);
    return () => { track.removeEventListener('mouseenter', pause); track.removeEventListener('mouseleave', play); };
  }, []);

  return (
    <>
      <style>{`
        .hero-section { position:relative; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; padding-top:68px; }
        .hero-bg { position:absolute; inset:0; z-index:0; background-image:url('/bg-road.jpg'); background-size:cover; background-position:center; filter:blur(3px); }
        .hero-bg::after { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 80% 60% at 50% 40%,rgba(245,158,11,0.06) 0%,transparent 70%); }
        .hero-content { position:relative; z-index:1; text-align:center; padding-block:var(--space-20); }
        .hero-content h1 { color: #ffffff !important; }
        .hero-badge { display:inline-flex; align-items:center; gap:var(--space-2); padding:var(--space-1) var(--space-4); background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); border-radius:var(--radius-full); font-size:var(--text-xs); font-weight:500; color:var(--accent-amber); margin-bottom:var(--space-6); }
        .hero-badge-dot { width:8px; height:8px; border-radius:50%; background:var(--accent-green); animation:sos-pulse 2s ease-in-out infinite; }
        .hero-sub { font-size:clamp(var(--text-base),2vw,var(--text-xl)); color: rgba(255, 255, 255, 0.75) !important; max-width:560px; margin:0 auto var(--space-8); line-height:1.7; }
        .hero-btns { display:flex; gap:var(--space-4); justify-content:center; flex-wrap:wrap; margin-bottom:var(--space-12); }
        .hero-stats { display:flex; align-items:center; justify-content:center; gap:var(--space-8); flex-wrap:wrap; }
        .hero-stats .text-muted { color: rgba(255, 255, 255, 0.6) !important; }
        .hero-stat-div { width:1px; height:48px; background:rgba(255, 255, 255, 0.15); }
        .hero-scroll-indicator { position:absolute; bottom:var(--space-8); left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:var(--space-2); z-index:1; animation:bounce-subtle 2s ease-in-out infinite; }
        .hero-scroll-indicator span { color: rgba(255, 255, 255, 0.6) !important; }
        .hero-scroll-mouse { width:24px; height:38px; border:2px solid var(--border-hover); border-radius:12px; display:flex; align-items:flex-start; justify-content:center; padding-top:4px; }
        .hero-scroll-dot { width:4px; height:8px; background:var(--accent-amber); border-radius:2px; animation:bounce-subtle 1.5s ease-in-out infinite; }
        .how-section { background:var(--bg-secondary); }
        .how-grid { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-8); }
        .how-track { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-xl); padding:var(--space-8); }
        .how-track-amber { border-top:3px solid var(--accent-amber); }
        .how-track-red { border-top:3px solid var(--accent-red); }
        .how-track-header { display:flex; align-items:center; gap:var(--space-4); margin-bottom:var(--space-6); }
        .how-track-icon { font-size:2rem; }
        .how-track-title { font-family:var(--font-heading); font-size:var(--text-xl); font-weight:700; margin-bottom:var(--space-1); }
        .how-step { display:flex; gap:var(--space-4); margin-bottom:var(--space-2); }
        .how-step-left { display:flex; flex-direction:column; align-items:center; }
        .how-connector { width:2px; flex:1; min-height:20px; margin:4px 0; }
        .how-connector-amber { background:linear-gradient(to bottom,var(--accent-amber),transparent); }
        .how-connector-red { background:linear-gradient(to bottom,var(--accent-red),transparent); }
        .how-step-body { padding-top:var(--space-2); padding-bottom:var(--space-3); }
        .how-step-title { font-weight:600; font-size:var(--text-sm); margin-bottom:2px; display:flex; align-items:center; gap:var(--space-2); }
        .features-section { background:var(--bg-primary); }
        .features-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--space-6); }
        .feature-card { display:flex; flex-direction:column; gap:var(--space-3); }
        .feature-icon { font-size:2rem; }
        .feature-title { font-family:var(--font-heading); font-size:var(--text-lg); font-weight:700; }
        .phones-section { background:var(--bg-secondary); }
        .phones-wrapper { display:flex; align-items:flex-start; justify-content:center; gap:var(--space-12); flex-wrap:wrap; }
        .phone-mockup { display:flex; flex-direction:column; align-items:center; gap:var(--space-4); }
        .phone-frame { width:240px; background:linear-gradient(145deg,#1a2236,#0d1220); border:2px solid rgba(255,255,255,0.12); border-radius:36px; padding:12px; box-shadow:0 24px 60px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.08); position:relative; }
        .phone-frame-dark { background:linear-gradient(145deg,#1a0a0a,#0d0505); border-color:rgba(239,68,68,0.2); }
        .phone-notch { width:80px; height:20px; background:#0a0e1a; border-radius:10px; margin:0 auto 8px; }
        .phone-screen { background:var(--bg-card); border-radius:24px; padding:var(--space-3); min-height:400px; display:flex; flex-direction:column; gap:var(--space-2); }
        .phone-screen-dark { background:#0d0505; }
        .phone-screen-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-2); }
        .phone-app-name { font-family:var(--font-heading); font-size:11px; font-weight:700; color:var(--text-primary); }
        .phone-camera-area { flex:1; background:#070b14; border-radius:12px; min-height:140px; position:relative; overflow:hidden; }
        .phone-viewfinder { position:absolute; inset:12px; border:1px solid rgba(255,255,255,0.1); border-radius:8px; }
        .phone-corner { position:absolute; width:12px; height:12px; border-color:var(--accent-amber); border-style:solid; }
        .phone-corner.tl { top:0; left:0; border-width:2px 0 0 2px; border-radius:3px 0 0 0; }
        .phone-corner.tr { top:0; right:0; border-width:2px 2px 0 0; border-radius:0 3px 0 0; }
        .phone-corner.bl { bottom:0; left:0; border-width:0 0 2px 2px; border-radius:0 0 0 3px; }
        .phone-corner.br { bottom:0; right:0; border-width:0 2px 2px 0; border-radius:0 0 3px 0; }
        .phone-pothole-indicator { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; }
        .phone-bbox { width:60px; height:45px; border:2px solid var(--accent-amber); border-radius:4px; background:rgba(245,158,11,0.1); margin:0 auto 4px; }
        .phone-bbox-label { font-size:8px; color:var(--accent-amber); font-weight:700; letter-spacing:1px; }
        .phone-gps-chip { font-size:8px; color:var(--accent-green); background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.3); border-radius:20px; padding:2px 6px; text-align:center; font-family:var(--font-mono); }
        .phone-sev-row { display:flex; align-items:center; gap:4px; }
        .phone-sev-label { font-size:8px; color:var(--text-muted); white-space:nowrap; }
        .phone-sev-bar { flex:1; height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden; }
        .phone-sev-fill { height:100%; border-radius:2px; }
        .phone-action-btn { width:100%; padding:8px; border-radius:12px; font-size:10px; font-weight:700; text-align:center; cursor:default; border:none; }
        .phone-amber-btn { background:linear-gradient(135deg,var(--accent-amber),#d97706); color:#0a0e1a; }
        .phone-cancel-btn { background:transparent; border:1px solid rgba(239,68,68,0.4); color:var(--accent-red); }
        .phone-home-bar { width:60px; height:4px; background:rgba(255,255,255,0.2); border-radius:2px; margin:8px auto 0; }
        .phone-caption { font-size:var(--text-sm); color:var(--text-muted); font-weight:500; }
        .phone-sos-area { flex:1; display:flex; align-items:center; justify-content:center; position:relative; }
        .phone-sos-ring { position:absolute; border-radius:50%; border:1.5px solid rgba(239,68,68,0.3); animation:sos-ring 2.5s ease-out infinite; }
        .ring-1 { width:100px; height:100px; }
        .ring-2 { width:100px; height:100px; animation-delay:1.25s; }
        .phone-sos-circle { width:70px; height:70px; border-radius:50%; background:radial-gradient(circle at 35% 35%,#ff6b6b,#b91c1c); display:flex; flex-direction:column; align-items:center; justify-content:center; border:2px solid var(--accent-red); animation:sos-pulse 1.8s ease-in-out infinite; z-index:1; }
        .phone-sos-icon { font-size:1.4rem; }
        .phone-sos-text { font-family:var(--font-heading); font-size:12px; font-weight:800; color:white; letter-spacing:2px; }
        .phone-countdown { text-align:center; font-size:10px; color:var(--text-muted); }
        .phone-chain-row { display:flex; justify-content:center; gap:8px; }
        .phone-chain-item { font-size:8px; padding:2px 6px; border-radius:10px; font-weight:600; }
        .chain-done { background:rgba(34,197,94,0.15); color:var(--accent-green); }
        .chain-active { background:rgba(245,158,11,0.15); color:var(--accent-amber); }
        .chain-wait { background:rgba(255,255,255,0.05); color:var(--text-muted); }
        .tech-section { position:relative; padding-block:var(--space-8); overflow:hidden; background:var(--bg-primary); }
        .tech-gradient-top,.tech-gradient-bottom { position:absolute; left:0; right:0; height:60px; z-index:2; pointer-events:none; }
        .tech-gradient-top { top:0; background:linear-gradient(to bottom,var(--bg-primary),transparent); }
        .tech-gradient-bottom { bottom:0; background:linear-gradient(to top,var(--bg-primary),transparent); }
        .tech-scroll-wrap { overflow:hidden; padding-block:var(--space-2); }
        .tech-scroll-track { display:flex; gap:var(--space-4); width:max-content; white-space:nowrap; }
        .tech-pill { display:inline-flex; align-items:center; padding:var(--space-2) var(--space-5); background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-full); font-size:var(--text-sm); font-weight:500; color:var(--text-muted); transition:var(--transition); }
        .tech-pill:hover { border-color:var(--accent-amber); color:var(--accent-amber); }
        .team-section { background:var(--bg-secondary); }
        .team-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--space-6); }
        .footer { background:#070a12; border-top:1px solid var(--border); padding-block:var(--space-12) var(--space-8); }
        .footer-top { display:grid; grid-template-columns:1.5fr 1fr 1fr; gap:var(--space-8); margin-bottom:var(--space-8); }
        .footer-logo { font-family:var(--font-heading); font-size:var(--text-2xl); font-weight:800; margin-bottom:var(--space-2); }
        .footer-emergency-num { font-family:var(--font-heading); font-size:var(--text-xl); font-weight:800; color:var(--accent-amber); transition:var(--transition); text-decoration:none; }
        .footer-emergency-num:hover { color:var(--accent-amber-light); }
        .footer-link { font-size:var(--text-sm); color:var(--text-muted); transition:var(--transition); display:block; }
        .footer-link:hover { color:var(--text-primary); }
        .footer-bottom { display:flex; justify-content:space-between; flex-wrap:wrap; gap:var(--space-2); padding-top:var(--space-6); border-top:1px solid var(--border); }
        .reveal { opacity:0; transform:translateY(20px); transition:opacity 0.6s ease, transform 0.6s ease; }
        .reveal.visible { opacity:1; transform:translateY(0); }
        @keyframes tech-scroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes bounce-subtle { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-6px)} }
        @media (max-width:1024px) { .features-grid{grid-template-columns:repeat(2,1fr)} .footer-top{grid-template-columns:1fr 1fr} .team-grid{grid-template-columns:repeat(2,1fr)} }
        @media (max-width:768px) { .how-grid{grid-template-columns:1fr} .features-grid{grid-template-columns:1fr} .footer-top{grid-template-columns:1fr} .footer-bottom{flex-direction:column} .phones-wrapper{gap:var(--space-8)} .team-grid{grid-template-columns:1fr} }
      `}</style>
      <div ref={pageRef}>
        {/* ── Hero ── */}
        <section className="hero-section" id="hero">
          <div className="hero-bg"><HeroCanvas /></div>
          <div className="container hero-content">
            <div className="hero-badge animate-fade-in">
              <span className="hero-badge-dot" />
              Live road safety monitoring · Vapi, Gujarat
            </div>
            <h1 className="heading-xl animate-fade-in delay-100" style={{ marginBottom:'var(--space-6)' }}>
              Smarter Roads.<br/><span className="text-gradient-amber">Safer Lives.</span>
            </h1>
            <p className="hero-sub animate-fade-in delay-200">
              AI-powered pothole detection and real-time SOS emergency alerts —<br/>
              built for India's roads, powered by YOLOv8 and Cloud infrastructure.
            </p>
            <div className="hero-btns animate-fade-in delay-300">
              <Link to="/report" className="btn btn-amber btn-lg animate-amber-pulse">📷 Report a Pothole</Link>
              <Link to="/sos" className="btn btn-red btn-lg">🚨 Trigger SOS Demo</Link>
            </div>
            <div className="hero-stats animate-fade-in delay-400">
              <CounterStat target={10} suffix="s" label="SOS Response Time" />
              <div className="hero-stat-div" />
              <CounterStat target={8} prefix="YOLOv" label="AI Detection Engine" />
              <div className="hero-stat-div" />
              <CounterStat target={3} suffix="-Step" label="Emergency Call Chain" />
            </div>
          </div>
          <div className="hero-scroll-indicator">
            <div className="hero-scroll-mouse"><div className="hero-scroll-dot" /></div>
            <span className="text-xs text-muted">Scroll to explore</span>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="section how-section" id="how-it-works">
          <div className="container">
            <div className="section-header">
              <span className="section-tag">⚙️ How It Works</span>
              <h2 className="heading-lg">Two Life-Saving Systems</h2>
            </div>
            <div className="how-grid">
              <div className="how-track how-track-amber">
                <div className="how-track-header">
                  <span className="how-track-icon">🕳️</span>
                  <div>
                    <h3 className="how-track-title">Pothole Reporting</h3>
                    <span className="badge badge-amber">YOLOv8 AI Track</span>
                  </div>
                </div>
                {POTHOLE_STEPS.map(([icon, title, desc], i) => (
                  <div key={i} className="how-step reveal" style={{ animationDelay:`${i*0.12}s` }}>
                    <div className="how-step-left">
                      <div className="step-number step-number-amber">{i+1}</div>
                      {i < POTHOLE_STEPS.length - 1 && <div className="how-connector how-connector-amber" />}
                    </div>
                    <div className="how-step-body">
                      <div className="how-step-title"><span>{icon}</span> {title}</div>
                      <p className="how-step-desc text-sm text-muted">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="how-track how-track-red">
                <div className="how-track-header">
                  <span className="how-track-icon">🚨</span>
                  <div>
                    <h3 className="how-track-title">SOS Emergency Alert</h3>
                    <span className="badge badge-red">Auto-Trigger Track</span>
                  </div>
                </div>
                {SOS_STEPS.map(([icon, title, desc], i) => (
                  <div key={i} className="how-step reveal" style={{ animationDelay:`${i*0.12+0.2}s` }}>
                    <div className="how-step-left">
                      <div className="step-number step-number-red">{i+1}</div>
                      {i < SOS_STEPS.length - 1 && <div className="how-connector how-connector-red" />}
                    </div>
                    <div className="how-step-body">
                      <div className="how-step-title"><span>{icon}</span> {title}</div>
                      <p className="how-step-desc text-sm text-muted">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features Grid ── */}
        <section className="section features-section" id="features">
          <div className="container">
            <div className="section-header">
              <span className="section-tag">✨ Features</span>
              <h2 className="heading-lg">Everything You Need</h2>
            </div>
            <div className="features-grid">
              {FEATURES.map(([icon, title, desc, color], i) => (
                <div key={i} className={`feature-card card card-${color} reveal`} style={{ animationDelay:`${i*0.1}s` }}>
                  <div className="feature-icon">{icon}</div>
                  <h3 className="feature-title">{title}</h3>
                  <p className="feature-desc text-sm text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Phone Mockups ── */}
        <section className="section phones-section" id="phones">
          <div className="container">
            <div className="section-header">
              <span className="section-tag">📱 App Preview</span>
              <h2 className="heading-lg">Designed for the Road</h2>
            </div>
            <div className="phones-wrapper">
              {/* Pothole Phone */}
              <div className="phone-mockup reveal delay-100">
                <div className="phone-frame">
                  <div className="phone-notch" />
                  <div className="phone-screen">
                    <div className="phone-screen-header">
                      <span className="phone-app-name">SafeRoute</span>
                      <span>📍</span>
                    </div>
                    <div className="phone-camera-area">
                      <div className="phone-viewfinder">
                        <div className="phone-corner tl" /><div className="phone-corner tr" />
                        <div className="phone-corner bl" /><div className="phone-corner br" />
                        <div className="phone-pothole-indicator">
                          <div className="phone-bbox" />
                          <span className="phone-bbox-label">POTHOLE</span>
                        </div>
                      </div>
                    </div>
                    <div className="phone-gps-chip">📍 Lat: 20.3893 · Lng: 72.9106</div>
                    <div className="phone-sev-row">
                      <span className="phone-sev-label">Severity:</span>
                      <div className="phone-sev-bar"><div className="phone-sev-fill" style={{ width:'70%', background:'var(--accent-red)' }} /></div>
                      <span className="badge badge-red" style={{ fontSize:9 }}>7/10 HIGH</span>
                    </div>
                    <button className="phone-action-btn phone-amber-btn">Submit Complaint</button>
                  </div>
                  <div className="phone-home-bar" />
                </div>
                <p className="phone-caption">Pothole Complaint</p>
              </div>
              {/* SOS Phone */}
              <div className="phone-mockup reveal delay-200">
                <div className="phone-frame phone-frame-dark">
                  <div className="phone-notch" />
                  <div className="phone-screen phone-screen-dark">
                    <div className="phone-screen-header">
                      <span className="phone-app-name" style={{ color:'var(--accent-red)' }}>EMERGENCY SOS</span>
                    </div>
                    <div className="phone-sos-area">
                      <div className="phone-sos-ring ring-1" />
                      <div className="phone-sos-ring ring-2" />
                      <div className="phone-sos-circle">
                        <span className="phone-sos-icon">🚨</span>
                        <span className="phone-sos-text">SOS</span>
                      </div>
                    </div>
                    <p className="phone-countdown">Calling in <strong style={{ color:'var(--accent-red)' }}>08s</strong></p>
                    <button className="phone-action-btn phone-cancel-btn">✕ CANCEL</button>
                    <div className="phone-chain-row">
                      <span className="phone-chain-item chain-done">Family ✓</span>
                      <span className="phone-chain-item chain-active">108 ⟳</span>
                      <span className="phone-chain-item chain-wait">100 ⟳</span>
                    </div>
                  </div>
                  <div className="phone-home-bar" />
                </div>
                <p className="phone-caption">SOS Emergency</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tech Stack Scroll ── */}
        <section className="tech-section" id="tech-stack">
          <div className="tech-gradient-top" />
          <div className="tech-scroll-wrap">
            <div className="tech-scroll-track" ref={techRef}>
              {[...TECH_PILLS, ...TECH_PILLS].map((t, i) => <span key={i} className="tech-pill">{t}</span>)}
            </div>
          </div>
          <div className="tech-gradient-bottom" />
        </section>

        {/* ── Voice Agent CTA ── */}
        <section className="section" id="voice-agent" style={{ background:'var(--bg-secondary)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', width:600, height:600, background:'var(--accent-amber)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', borderRadius:'50%', filter:'blur(150px)', opacity:0.04, pointerEvents:'none' }} />
          <div className="container" style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-12)', alignItems:'center' }}>
              {/* Text side */}
              <div className="reveal">
                <span className="section-tag">🎙️ Vapi Voice Agent</span>
                <h2 className="heading-lg" style={{ margin:'var(--space-4) 0 var(--space-4)' }}>
                  Talk to SafeRoute —<br/><span className="text-gradient-amber">hands-free</span>
                </h2>
                <p className="text-muted" style={{ lineHeight:1.8, marginBottom:'var(--space-8)', fontSize:'var(--text-lg)' }}>
                  Report potholes, trigger SOS, and get road safety help entirely by voice. Our multilingual Vapi-powered agent understands Hindi, English, and regional languages.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)', marginBottom:'var(--space-8)' }}>
                  {[
                    ['🌍', 'Multilingual — Hindi, English & more'],
                    ['⚡', 'Sub-500ms response latency'],
                    ['📍', 'Automatically captures your GPS location'],
                    ['🔒', 'No audio recordings stored'],
                  ].map(([icon, text]) => (
                    <div key={text} style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
                      <span style={{ fontSize:'1.2rem', width:28, textAlign:'center' }}>{icon}</span>
                      <span className="text-sm text-muted">{text}</span>
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-amber btn-lg"
                  onClick={() => window.dispatchEvent(new CustomEvent('sr:voice:open'))}
                >
                  🎙️ Try Voice Agent
                </button>
              </div>

              {/* Animated orb side */}
              <div className="reveal delay-200" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'var(--space-6)' }}>
                <div style={{ position:'relative', width:280, height:280, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {/* Pulse rings */}
                  {[280, 240, 200].map((size, i) => (
                    <div key={size} style={{
                      position:'absolute', width:size, height:size, borderRadius:'50%',
                      border:'1.5px solid rgba(245,158,11,0.2)',
                      animation:`pulse-ring-home ${1.8 + i * 0.4}s ease-out ${i * 0.5}s infinite`,
                      pointerEvents:'none',
                    }} />
                  ))}
                  {/* Orb */}
                  <div style={{
                    width:160, height:160, borderRadius:'50%',
                    background:'linear-gradient(135deg, var(--accent-amber), var(--accent-amber-dark))',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    boxShadow:'0 0 60px rgba(245,158,11,0.35), 0 0 120px rgba(245,158,11,0.15)',
                    animation:'sos-pulse 2.5s ease-in-out infinite', zIndex:1,
                  }}>
                    <span style={{ fontSize:'3rem', lineHeight:1 }}>🎙️</span>
                    <span style={{ fontFamily:'var(--font-heading)', fontWeight:800, fontSize:'var(--text-sm)', color:'#0a0e1a', marginTop:4 }}>Voice AI</span>
                  </div>
                </div>
                {/* Mini conversation preview */}
                <div style={{ width:'100%', maxWidth:320 }}>
                  {[
                    { side:'right', text:'Report a pothole near railway station' },
                    { side:'left',  text:"I'll need your location. GPS detected: 20.3893°N, 72.9106°E. Should I submit the report?" },
                    { side:'right', text:'Yes, severity looks high' },
                    { side:'left',  text:'✅ Complaint ID: SR-2847 filed. Municipality notified!' },
                  ].map((m, i) => (
                    <div key={i} style={{ display:'flex', justifyContent: m.side === 'right' ? 'flex-end' : 'flex-start', marginBottom:'var(--space-2)', animation:`fadeIn 0.4s ease ${i * 0.15}s both` }}>
                      <div style={{
                        maxWidth:'80%', padding:'var(--space-2) var(--space-3)',
                        borderRadius: m.side === 'right' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: m.side === 'right'
                          ? 'linear-gradient(135deg, var(--accent-amber), var(--accent-amber-dark))'
                          : 'var(--bg-card)',
                        color: m.side === 'right' ? '#0a0e1a' : 'var(--text-primary)',
                        border: m.side === 'left' ? '1px solid var(--border)' : 'none',
                        fontSize:'var(--text-xs)', lineHeight:1.5, fontWeight: m.side === 'right' ? 600 : 400,
                      }}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes pulse-ring-home {
              0%   { transform:scale(1);   opacity:0.6; }
              100% { transform:scale(1.15); opacity:0; }
            }
            @media (max-width:900px) { #voice-agent .container > div { grid-template-columns:1fr !important; } }
          `}</style>
        </section>

        {/* ── Team ── */}
        <section className="section team-section" id="team">
          <div className="container">
            <div className="section-header">
              <span className="section-tag">👥 Our Team</span>
              <h2 className="heading-lg">Built by Students, for Society</h2>
            </div>
            <div className="team-grid">
              {TEAM.map((m, i) => {
                const ini = m.name.split(' ').slice(0,2).map(w => w[0]).join('');
                return (
                  <div key={i} className="card reveal" style={{ display:'flex', alignItems:'flex-start', gap:'var(--space-4)', padding:'var(--space-5)', animationDelay:`${i*0.1}s` }}>
                    <div style={{ width:56, height:56, borderRadius:'50%', border:`2px solid ${m.color}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-lg)', fontWeight:800, color:m.color }}>{ini}</span>
                    </div>
                    <div>
                      <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-lg)', fontWeight:700, marginBottom:'var(--space-1)' }}>{m.name}</h3>
                      <span style={{ display:'inline-block', fontSize:'var(--text-xs)', fontWeight:600, padding:'2px 8px', borderRadius:'var(--radius-full)', background:`${m.color}22`, color:m.color, marginBottom:'var(--space-2)' }}>{m.role}</span>
                      <p className="text-sm text-muted" style={{ lineHeight:1.55 }}>{m.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="footer" id="footer">
          <div className="container">
            <div className="footer-top">
              <div>
                <div className="footer-logo" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <img src="/favicon.svg" alt="SafeRoute Logo" style={{ width: 28, height: 28 }} />
                  <span>Safe<span className="text-gradient-amber">Route</span></span>
                </div>
                <p className="text-muted text-sm" style={{ marginBottom:'var(--space-1)' }}>Road Safety AI System</p>
                <p className="text-xs text-muted">Built for public safety · 2025</p>
              </div>
              <div>
                <p className="text-sm font-mono text-muted" style={{ marginBottom:'var(--space-3)' }}>Emergency Numbers</p>
                <div style={{ display:'flex', gap:'var(--space-4)' }}>
                  <a className="footer-emergency-num" href="tel:108">🚑 108</a>
                  <a className="footer-emergency-num" href="tel:100">🚔 100</a>
                </div>
              </div>
              <nav style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
                <Link to="/" className="footer-link">Home</Link>
                <Link to="/report" className="footer-link">Report Pothole</Link>
                <Link to="/sos" className="footer-link">SOS</Link>
                <Link to="/dashboard" className="footer-link">Dashboard</Link>
              </nav>
            </div>
            <div className="footer-bottom">
              <p className="text-xs text-muted">© 2025 SafeRoute. Built with ❤️ for road safety in India.</p>
              <p className="text-xs text-muted">YOLOv8 · GPT-4o · Twilio · Firebase</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}