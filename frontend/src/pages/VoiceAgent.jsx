/**
 * frontend/src/pages/VoiceAgent.jsx
 * Interactive voice agent powered by Vapi AI.
 * Credentials: set VITE_VAPI_PUBLIC_KEY and VITE_VAPI_ASSISTANT_ID in .env
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';

// ── Vapi credentials from .env ──────────────────────────────────────────────
const VAPI_PUBLIC_KEY  = import.meta.env.VITE_VAPI_PUBLIC_KEY  || '';
const VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID || '';

// ── Audio visualiser (animated bars) ───────────────────────────────────────
function AudioBars({ active, speaking }) {
  const BAR_COUNT = 20;
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:64, padding:'0 8px' }}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const base  = 8;
        const maxH  = 56;
        const delay = (i / BAR_COUNT) * 1.2;
        const isActive = active || speaking;
        return (
          <div key={i} style={{
            flex: 1,
            borderRadius: 3,
            background: speaking
              ? `linear-gradient(to top, var(--accent-red), #ff6b6b)`
              : `linear-gradient(to top, var(--accent-amber), var(--accent-amber-light))`,
            height: isActive ? undefined : base,
            minHeight: base,
            maxHeight: maxH,
            animation: isActive ? `voice-bar 0.9s ease-in-out ${delay.toFixed(2)}s infinite alternate` : 'none',
            transition: 'height 0.3s ease, background 0.5s ease',
          }} />
        );
      })}
    </div>
  );
}

// ── Transcript message ──────────────────────────────────────────────────────
function TranscriptMessage({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom:'var(--space-3)', animation:'fadeIn 0.3s ease',
    }}>
      {!isUser && (
        <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent-amber),var(--accent-amber-dark))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0, marginRight:'var(--space-2)' }}>
          🤖
        </div>
      )}
      <div style={{
        maxWidth:'70%', padding:'var(--space-3) var(--space-4)',
        borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
        background: isUser
          ? 'linear-gradient(135deg, var(--accent-amber), var(--accent-amber-dark))'
          : 'var(--bg-card)',
        color: isUser ? '#0a0e1a' : 'var(--text-primary)',
        border: isUser ? 'none' : '1px solid var(--border)',
        fontSize:'var(--text-sm)', lineHeight:1.6, fontWeight: isUser ? 600 : 400,
      }}>
        {msg.text}
      </div>
      {isUser && (
        <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--bg-card-hover)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0, marginLeft:'var(--space-2)' }}>
          👤
        </div>
      )}
    </div>
  );
}

// ── Status pill ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  idle:        { color:'var(--text-muted)',    bg:'rgba(156,163,175,0.1)', border:'rgba(156,163,175,0.2)', dot:'', label:'Ready to talk' },
  connecting:  { color:'var(--accent-amber)',  bg:'rgba(245,158,11,0.1)',  border:'rgba(245,158,11,0.3)',  dot:'🟡', label:'Connecting…' },
  connected:   { color:'var(--accent-green)',  bg:'rgba(34,197,94,0.1)',   border:'rgba(34,197,94,0.3)',   dot:'🟢', label:'Connected' },
  speaking:    { color:'var(--accent-red)',     bg:'rgba(239,68,68,0.1)',   border:'rgba(239,68,68,0.3)',   dot:'🔴', label:'Agent Speaking' },
  listening:   { color:'var(--accent-amber)',  bg:'rgba(245,158,11,0.1)',  border:'rgba(245,158,11,0.3)',  dot:'🟡', label:'Listening to you…' },
  error:       { color:'var(--accent-red)',     bg:'rgba(239,68,68,0.1)',   border:'rgba(239,68,68,0.3)',   dot:'❌', label:'Error — retry' },
};

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:'var(--space-2)', padding:'var(--space-1) var(--space-4)', background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:'var(--radius-full)', fontSize:'var(--text-xs)', fontWeight:600, color:cfg.color, letterSpacing:'0.03em' }}>
      <span>{cfg.dot}</span>
      <span>{cfg.label}</span>
    </div>
  );
}

// ── Quick command chips ─────────────────────────────────────────────────────
const QUICK_CMDS = [
  'Report a pothole near me',
  'How do I trigger SOS?',
  'What is my nearest pothole?',
  'Show me the dashboard',
  'What is the severity scale?',
  'How does the AI detection work?',
];

// ── Main Component ──────────────────────────────────────────────────────────
export default function VoiceAgent() {
  const vapiRef      = useRef(null);
  const scrollRef    = useRef(null);
  const [status, setStatus]       = useState('idle');
  const [transcript, setTranscript] = useState([]);
  const [isMuted, setIsMuted]     = useState(false);
  const [volume, setVolume]       = useState(1);
  const [callDuration, setCallDuration] = useState(0);
  const durationTimer = useRef(null);

  // Init Vapi instance once
  useEffect(() => {
    if (!VAPI_PUBLIC_KEY) return;
    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on('call-start', () => {
      setStatus('connected');
      durationTimer.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    });
    vapi.on('call-end', () => {
      setStatus('idle');
      clearInterval(durationTimer.current);
      setCallDuration(0);
    });
    vapi.on('speech-start', () => setStatus('listening'));
    vapi.on('speech-end',   () => setStatus('connected'));
    vapi.on('message', (msg) => {
      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        setTranscript(prev => [...prev, { role: msg.role, text: msg.transcript, id: Date.now() }]);
      }
    });
    vapi.on('error', (err) => {
      console.error('[Vapi] error:', err);
      setStatus('error');
      clearInterval(durationTimer.current);
    });

    return () => {
      vapi.stop();
      clearInterval(durationTimer.current);
    };
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  async function startCall() {
    if (!VAPI_PUBLIC_KEY || !VAPI_ASSISTANT_ID) {
      alert('⚠️ Please set VITE_VAPI_PUBLIC_KEY and VITE_VAPI_ASSISTANT_ID in your .env file and restart the dev server.');
      return;
    }
    setStatus('connecting');
    setTranscript([]);
    try {
      await vapiRef.current.start(VAPI_ASSISTANT_ID);
    } catch (err) {
      console.error('[Vapi] start error:', err);
      setStatus('error');
    }
  }

  function endCall() {
    vapiRef.current?.stop();
    setStatus('idle');
    clearInterval(durationTimer.current);
    setCallDuration(0);
  }

  function toggleMute() {
    if (!vapiRef.current) return;
    const next = !isMuted;
    vapiRef.current.setMuted(next);
    setIsMuted(next);
  }

  function changeVolume(v) {
    setVolume(v);
    vapiRef.current?.setVolume?.(v);
  }

  function formatDuration(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  const isActive  = ['connected','listening','speaking','connecting'].includes(status);
  const isSpeaking = status === 'speaking';
  const isListening = status === 'listening';
  const credsMissing = !VAPI_PUBLIC_KEY || !VAPI_ASSISTANT_ID;

  return (
    <>
      <style>{`
        @keyframes voice-bar {
          0%   { height: 8px; }
          100% { height: var(--bar-max, 56px); }
        }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-ring {
          0%   { transform:scale(1);   opacity:0.8; }
          100% { transform:scale(1.6); opacity:0; }
        }
        .vapi-page-root { min-height:100vh; padding-top:68px; background:var(--bg-primary); }
        .vapi-hero { position:relative; overflow:hidden; background:linear-gradient(135deg,var(--bg-secondary) 0%,var(--bg-primary) 100%); border-bottom:1px solid var(--border); padding-block:var(--space-16) var(--space-12); }
        .vapi-hero-glow { position:absolute; border-radius:50%; filter:blur(80px); pointer-events:none; }
        .vapi-layout { display:grid; grid-template-columns:1fr 380px; gap:var(--space-8); padding-block:var(--space-10); align-items:flex-start; }
        .vapi-main-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-xl); overflow:hidden; }
        .vapi-orb-wrap { position:relative; display:flex; align-items:center; justify-content:center; width:200px; height:200px; margin:0 auto; }
        .vapi-orb-ring { position:absolute; border-radius:50%; border:2px solid; pointer-events:none; }
        .vapi-orb { position:relative; z-index:2; width:140px; height:140px; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; border:none; transition:transform 0.3s ease, box-shadow 0.3s ease; }
        .vapi-orb:active { transform:scale(0.95); }
        .vapi-controls { display:flex; align-items:center; justify-content:center; gap:var(--space-4); flex-wrap:wrap; }
        .vapi-ctrl-btn { width:48px; height:48px; border-radius:50%; border:1px solid var(--border); background:var(--bg-card); display:flex; align-items:center; justify-content:center; font-size:1.2rem; cursor:pointer; transition:var(--transition); }
        .vapi-ctrl-btn:hover { background:var(--bg-card-hover); border-color:var(--border-hover); transform:scale(1.05); }
        .vapi-ctrl-btn.active { background:rgba(245,158,11,0.15); border-color:var(--accent-amber); }
        .vapi-transcript { height:320px; overflow-y:auto; padding:var(--space-4); display:flex; flex-direction:column; scroll-behavior:smooth; }
        .vapi-transcript::-webkit-scrollbar { width:4px; }
        .vapi-transcript::-webkit-scrollbar-track { background:transparent; }
        .vapi-transcript::-webkit-scrollbar-thumb { background:var(--border-hover); border-radius:2px; }
        .vapi-sidebar-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-xl); padding:var(--space-6); margin-bottom:var(--space-4); }
        .vapi-chip { display:inline-flex; align-items:center; padding:var(--space-2) var(--space-4); background:var(--bg-card-hover); border:1px solid var(--border); border-radius:var(--radius-full); font-size:var(--text-xs); color:var(--text-muted); cursor:pointer; transition:var(--transition); white-space:nowrap; }
        .vapi-chip:hover { border-color:var(--accent-amber); color:var(--accent-amber); background:rgba(245,158,11,0.08); }
        .cred-warning { display:flex; align-items:flex-start; gap:var(--space-3); padding:var(--space-4); background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); border-radius:var(--radius); margin:var(--space-4); }
        @media (max-width:1024px) { .vapi-layout{grid-template-columns:1fr} }
      `}</style>

      <div className="vapi-page-root">
        {/* Hero */}
        <div className="vapi-hero">
          <div style={{ position:'absolute', width:500, height:500, background:'var(--accent-amber)', top:-200, left:-100, borderRadius:'50%', filter:'blur(120px)', opacity:0.05, pointerEvents:'none' }} />
          <div style={{ position:'absolute', width:400, height:400, background:'var(--accent-blue)', bottom:-150, right:-100, borderRadius:'50%', filter:'blur(120px)', opacity:0.06, pointerEvents:'none' }} />
          <div className="container" style={{ position:'relative', zIndex:1, textAlign:'center' }}>
            <span className="section-tag">🎙️ Vapi Voice Agent</span>
            <h1 className="heading-lg" style={{ margin:'var(--space-4) 0 var(--space-3)' }}>
              Talk to <span className="text-gradient-amber">SafeRoute AI</span>
            </h1>
            <p className="text-muted" style={{ maxWidth:520, margin:'0 auto', lineHeight:1.7 }}>
              Report potholes, ask for emergency help, or get road safety information — all by voice. Powered by your Vapi voice agent.
            </p>
            <div style={{ display:'flex', gap:'var(--space-6)', justifyContent:'center', flexWrap:'wrap', marginTop:'var(--space-8)' }}>
              {[['🌍', 'Multilingual','Hindi, English & more'],['⚡','Low Latency','&lt;500ms response'],['🔒','Private','No recordings stored']].map(([i,t,d]) => (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
                  <span style={{ fontSize:'1.2rem' }}>{i}</span>
                  <div>
                    <div style={{ fontSize:'var(--text-sm)', fontWeight:700 }}>{t}</div>
                    <div className="text-xs text-muted" dangerouslySetInnerHTML={{ __html: d }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="container">
          {credsMissing && (
            <div className="cred-warning" style={{ marginTop:'var(--space-6)' }}>
              <span style={{ fontSize:'1.5rem', flexShrink:0 }}>⚠️</span>
              <div>
                <strong style={{ display:'block', marginBottom:'var(--space-1)' }}>Vapi credentials not configured</strong>
                <p className="text-sm text-muted" style={{ lineHeight:1.6 }}>
                  Open <code style={{ background:'var(--bg-card-hover)', padding:'1px 6px', borderRadius:4 }}>frontend/.env</code> and set:<br />
                  <code style={{ color:'var(--accent-amber)' }}>VITE_VAPI_PUBLIC_KEY</code> and <code style={{ color:'var(--accent-amber)' }}>VITE_VAPI_ASSISTANT_ID</code><br />
                  then restart the dev server.
                </p>
              </div>
            </div>
          )}

          <div className="vapi-layout">
            {/* Main Card */}
            <div className="vapi-main-card">
              {/* Header */}
              <div style={{ padding:'var(--space-5) var(--space-6)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'var(--space-3)' }}>
                <div>
                  <h2 style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'var(--text-lg)', marginBottom:4 }}>Voice Call</h2>
                  {isActive && (
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-xs)', color:'var(--accent-amber)' }}>
                      ⏱ {formatDuration(callDuration)}
                    </span>
                  )}
                </div>
                <StatusPill status={status} />
              </div>

              {/* Orb section */}
              <div style={{ padding:'var(--space-10) var(--space-6)', textAlign:'center' }}>
                <div className="vapi-orb-wrap">
                  {/* Pulse rings when active */}
                  {isActive && [160, 185, 210].map((size, i) => (
                    <div key={size} className="vapi-orb-ring" style={{
                      width:size, height:size,
                      borderColor: isSpeaking ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.25)',
                      animation:`pulse-ring ${1.4 + i * 0.3}s ease-out ${i * 0.4}s infinite`,
                    }} />
                  ))}

                  {/* Main orb / call button */}
                  {!isActive ? (
                    <button className="vapi-orb" onClick={startCall} disabled={credsMissing}
                      style={{
                        background:'linear-gradient(135deg, var(--accent-amber), var(--accent-amber-dark))',
                        boxShadow:'0 0 40px rgba(245,158,11,0.3)',
                      }}>
                      <span style={{ fontSize:'2.5rem', lineHeight:1 }}>🎙️</span>
                      <span style={{ fontFamily:'var(--font-heading)', fontWeight:800, fontSize:'var(--text-sm)', color:'#0a0e1a', marginTop:4 }}>
                        {credsMissing ? 'Not Set Up' : 'Start Call'}
                      </span>
                    </button>
                  ) : (
                    <div className="vapi-orb" onClick={endCall} style={{
                      background: isSpeaking
                        ? 'radial-gradient(circle at 35% 35%, #ff6b6b, var(--accent-red-dark))'
                        : isListening
                          ? 'linear-gradient(135deg, var(--accent-amber), var(--accent-amber-dark))'
                          : 'linear-gradient(135deg, var(--bg-card-hover), var(--bg-card))',
                      border:`3px solid ${isSpeaking ? 'var(--accent-red)' : 'var(--accent-amber)'}`,
                      boxShadow: isSpeaking
                        ? '0 0 48px rgba(239,68,68,0.4)'
                        : '0 0 40px rgba(245,158,11,0.3)',
                      animation: isListening ? 'sos-pulse 1.5s ease-in-out infinite' : 'none',
                    }}>
                      <span style={{ fontSize:'2.5rem', lineHeight:1 }}>
                        {isSpeaking ? '🔊' : isListening ? '🎤' : '✕'}
                      </span>
                      <span style={{ fontFamily:'var(--font-heading)', fontWeight:800, fontSize:'var(--text-sm)', color: isSpeaking || isListening ? (isSpeaking ? 'white' : '#0a0e1a') : 'var(--text-primary)', marginTop:4 }}>
                        {isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'End Call'}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted" style={{ marginTop:'var(--space-3)' }}>
                  {!isActive ? 'Click the mic to start a voice conversation' : 'Click to end the call'}
                </p>

                {/* Audio visualiser */}
                <div style={{ marginTop:'var(--space-6)' }}>
                  <AudioBars active={isListening} speaking={isSpeaking} />
                </div>

                {/* Controls */}
                {isActive && (
                  <div className="vapi-controls" style={{ marginTop:'var(--space-6)' }}>
                    <button className={`vapi-ctrl-btn${isMuted ? ' active' : ''}`} onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                      {isMuted ? '🔇' : '🎤'}
                    </button>
                    <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
                      <span style={{ fontSize:'0.9rem' }}>🔈</span>
                      <input type="range" min="0" max="1" step="0.05" value={volume}
                        onChange={e => changeVolume(Number(e.target.value))}
                        style={{ width:80, accentColor:'var(--accent-amber)' }} />
                      <span style={{ fontSize:'0.9rem' }}>🔊</span>
                    </div>
                    <button className="vapi-ctrl-btn" onClick={endCall} title="End call" style={{ background:'rgba(239,68,68,0.1)', borderColor:'var(--accent-red)', color:'var(--accent-red)' }}>
                      📵
                    </button>
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div style={{ borderTop:'1px solid var(--border)' }}>
                <div style={{ padding:'var(--space-3) var(--space-5)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'var(--text-sm)', fontWeight:600 }}>💬 Conversation</span>
                  {transcript.length > 0 && (
                    <button className="text-xs text-muted" onClick={() => setTranscript([])}
                      style={{ background:'none', border:'none', cursor:'pointer', opacity:0.7 }}>
                      Clear
                    </button>
                  )}
                </div>
                <div className="vapi-transcript" ref={scrollRef}>
                  {transcript.length === 0 ? (
                    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'var(--space-2)', opacity:0.5 }}>
                      <span style={{ fontSize:'2rem' }}>💬</span>
                      <p className="text-xs text-muted">Conversation will appear here…</p>
                    </div>
                  ) : (
                    transcript.map(msg => <TranscriptMessage key={msg.id} msg={msg} />)
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              {/* Quick commands */}
              <div className="vapi-sidebar-card">
                <h3 style={{ fontFamily:'var(--font-heading)', fontWeight:700, marginBottom:'var(--space-4)' }}>⚡ Quick Commands</h3>
                <p className="text-xs text-muted" style={{ marginBottom:'var(--space-4)', lineHeight:1.5 }}>
                  Try saying any of these when connected:
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
                  {QUICK_CMDS.map(cmd => (
                    <div key={cmd} className="vapi-chip"
                      onClick={() => {
                        if (!isActive) startCall();
                      }}>
                      <span style={{ marginRight:'var(--space-2)', opacity:0.6 }}>→</span>
                      {cmd}
                    </div>
                  ))}
                </div>
              </div>

              {/* What the agent can do */}
              <div className="vapi-sidebar-card">
                <h3 style={{ fontFamily:'var(--font-heading)', fontWeight:700, marginBottom:'var(--space-4)' }}>🤖 Agent Capabilities</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
                  {[
                    ['📍', 'Report Potholes', 'Describe location and pothole details by voice'],
                    ['🚨', 'SOS Guidance', 'Walk you through triggering emergency alerts'],
                    ['📊', 'Status Updates', 'Check your complaint status by ID'],
                    ['🗺️', 'Navigation Help', 'Suggest safer routes around hazards'],
                    ['📱', 'App Guidance', 'Help you navigate any SafeRoute feature'],
                    ['🌐', 'Multilingual', 'Responds in Hindi, English & regional languages'],
                  ].map(([icon, title, desc]) => (
                    <div key={title} style={{ display:'flex', gap:'var(--space-3)', alignItems:'flex-start' }}>
                      <span style={{ fontSize:'1.2rem', flexShrink:0, marginTop:2 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize:'var(--text-sm)', fontWeight:600, marginBottom:2 }}>{title}</div>
                        <div className="text-xs text-muted" style={{ lineHeight:1.5 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="vapi-sidebar-card" style={{ background:'rgba(245,158,11,0.04)', borderColor:'rgba(245,158,11,0.2)' }}>
                <h3 style={{ fontFamily:'var(--font-heading)', fontWeight:700, marginBottom:'var(--space-4)', color:'var(--accent-amber)' }}>💡 Tips</h3>
                <ul style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)', listStyle:'none', padding:0 }}>
                  {[
                    'Speak clearly and naturally',
                    'Allow microphone permissions when prompted',
                    'Works best in a quiet environment',
                    'Say "stop" or click the orb to end the call',
                  ].map(tip => <li key={tip} className="text-xs text-muted">• {tip}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
