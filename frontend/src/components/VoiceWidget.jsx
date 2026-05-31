/**
 * frontend/src/components/VoiceWidget.jsx
 * Persistent floating voice agent widget — bottom-right corner.
 * Lives outside the router so it survives page navigation.
 * Credentials: set VITE_VAPI_PUBLIC_KEY and VITE_VAPI_ASSISTANT_ID in .env
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
// NOTE: @vapi-ai/web is NOT statically imported here.
// Rolldown (Vite 8) incorrectly wraps CJS modules with __esModule=true into an extra
// namespace layer, so `import Vapi from '@vapi-ai/web'` resolves to the module
// object rather than the class. Dynamic import in useEffect bypasses this entirely.

const VAPI_PUBLIC_KEY   = import.meta.env.VITE_VAPI_PUBLIC_KEY  || '';
const VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID || '';

// ── Audio Visualiser ─────────────────────────────────────────────────────────
function AudioBars({ active, speaking }) {
  const COUNT = 14;
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:32 }}>
      {Array.from({ length: COUNT }).map((_, i) => (
        <div key={i} style={{
          flex: 1,
          borderRadius: 2,
          background: speaking
            ? 'linear-gradient(to top, var(--accent-red), #ff6b6b)'
            : 'linear-gradient(to top, var(--accent-amber), var(--accent-amber-light))',
          minHeight: 4,
          animation: active ? `vw-bar 0.8s ease-in-out ${((i / COUNT) * 0.9).toFixed(2)}s infinite alternate` : 'none',
          height: active ? undefined : 4,
          transition: 'height 0.3s, background 0.4s',
        }} />
      ))}
    </div>
  );
}

// ── Transcript bubble ─────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 8, animation:'vw-fadein 0.25s ease' }}>
      <div style={{
        maxWidth: '82%',
        padding: '6px 11px',
        borderRadius: isUser ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
        background: isUser
          ? 'linear-gradient(135deg, var(--accent-amber), var(--accent-amber-dark))'
          : 'var(--bg-card-hover)',
        color: isUser ? '#0a0e1a' : 'var(--text-primary)',
        border: isUser ? 'none' : '1px solid var(--border)',
        fontSize: 12,
        lineHeight: 1.5,
        fontWeight: isUser ? 600 : 400,
      }}>
        {msg.text}
      </div>
    </div>
  );
}

// ── Status label ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  idle:       { dot: '#6b7280', label: 'Click mic to start' },
  connecting: { dot: 'var(--accent-amber)', label: 'Connecting…' },
  connected:  { dot: 'var(--accent-green)', label: 'Connected' },
  listening:  { dot: 'var(--accent-amber)', label: 'Listening…' },
  speaking:   { dot: 'var(--accent-red)',   label: 'Agent speaking' },
  error:      { dot: 'var(--accent-red)',   label: 'Error — tap to retry' },
};

export default function VoiceWidget() {
  const vapiRef       = useRef(null);
  const scrollRef     = useRef(null);
  const timerRef      = useRef(null);

  const [open, setOpen]         = useState(false);
  const [status, setStatus]     = useState('idle');
  const [transcript, setTranscript] = useState([]);
  const [muted, setMuted]       = useState(false);
  const [duration, setDuration] = useState(0);
  const [pulse, setPulse]       = useState(false); // fab pulse when speaking

  const isActive    = ['connected','listening','speaking','connecting'].includes(status);
  const isSpeaking  = status === 'speaking';
  const isListening = status === 'listening';
  const credsMissing = !VAPI_PUBLIC_KEY || !VAPI_ASSISTANT_ID;

  // Init Vapi once — dynamic import avoids rolldown's broken CJS interop for
  // packages that use `exports.default = Class` with __esModule: true.
  useEffect(() => {
    if (!VAPI_PUBLIC_KEY) return;
    let cancelled = false;

    import('@vapi-ai/web').then((mod) => {
      if (cancelled) return;

      // Walk through bundler interop layers to find the actual constructor.
      // mod.default may be the class itself OR another { default: Class } wrapper.
      const raw = mod.default ?? mod;
      const VapiClass = typeof raw === 'function' ? raw : (raw?.default ?? raw);

      if (typeof VapiClass !== 'function') {
        console.error('[VoiceWidget] Could not resolve Vapi constructor from module:', mod);
        return;
      }

      const vapi = new VapiClass(VAPI_PUBLIC_KEY);
      vapiRef.current = vapi;

      vapi.on('call-start', () => {
        setStatus('connected');
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      });
      vapi.on('call-end', () => {
        setStatus('idle');
        clearInterval(timerRef.current);
        setDuration(0);
        setPulse(false);
      });
      vapi.on('speech-start', () => { setStatus('listening'); setPulse(false); });
      vapi.on('speech-end',   () => { setStatus('connected'); setPulse(false); });
      vapi.on('message', (msg) => {
        if (msg.type === 'transcript' && msg.transcriptType === 'final') {
          setTranscript(prev => [...prev, { role: msg.role, text: msg.transcript, id: Date.now() + Math.random() }]);
          if (msg.role === 'assistant') setPulse(true);
        }
      });
      vapi.on('error', () => {
        setStatus('error');
        clearInterval(timerRef.current);
        setDuration(0);
      });
    }).catch((err) => {
      console.error('[VoiceWidget] Failed to load @vapi-ai/web:', err);
    });

    return () => {
      cancelled = true;
      vapiRef.current?.stop();
      clearInterval(timerRef.current);
    };
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript]);

  // Listen for global open trigger (e.g., from Home page CTA button)
  useEffect(() => {
    const handler = () => {
      setOpen(true);
      if (!isActive) startCall();
    };
    window.addEventListener('sr:voice:open', handler);
    return () => window.removeEventListener('sr:voice:open', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  async function startCall() {
    if (credsMissing) return;
    setStatus('connecting');
    setTranscript([]);
    try {
      await vapiRef.current.start(VAPI_ASSISTANT_ID);
      setOpen(true);
    } catch { setStatus('error'); }
  }

  function endCall() {
    vapiRef.current?.stop();
  }

  function toggleMute() {
    if (!vapiRef.current) return;
    const next = !muted;
    vapiRef.current.setMuted(next);
    setMuted(next);
  }

  function fmt(s) {
    return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  }

  const statusCfg = STATUS_MAP[status] || STATUS_MAP.idle;

  // Orb color
  const orbGrad = isSpeaking
    ? 'radial-gradient(circle at 35% 35%, #ff6b6b, #b91c1c)'
    : isListening
      ? 'linear-gradient(135deg, var(--accent-amber), var(--accent-amber-dark))'
      : isActive
        ? 'linear-gradient(135deg, #22c55e, #15803d)'
        : 'linear-gradient(135deg, var(--accent-amber), var(--accent-amber-dark))';

  return (
    <>
      <style>{`
        @keyframes vw-bar {
          0%   { height: 4px; }
          100% { height: 28px; }
        }
        @keyframes vw-fadein {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes vw-panel-in {
          from { opacity:0; transform:translateY(16px) scale(0.96); }
          to   { opacity:1; transform:translateY(0)  scale(1); }
        }
        @keyframes vw-pulse-ring {
          0%   { transform:scale(1);   opacity:0.7; }
          100% { transform:scale(1.65); opacity:0; }
        }
        @keyframes vw-fab-glow {
          0%,100% { box-shadow: 0 4px 20px rgba(245,158,11,0.45); }
          50%      { box-shadow: 0 4px 36px rgba(245,158,11,0.75), 0 0 0 10px rgba(245,158,11,0.1); }
        }
        .vw-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 9999;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          transition: transform 0.2s ease, box-shadow 0.3s ease;
          animation: vw-fab-glow 2.5s ease-in-out infinite;
        }
        .vw-fab:hover { transform: scale(1.1); }
        .vw-fab:active { transform: scale(0.95); }
        .vw-fab.active-call {
          animation: sos-pulse 1.8s ease-in-out infinite !important;
        }
        .vw-panel {
          position: fixed;
          bottom: 100px;
          right: 28px;
          z-index: 9998;
          width: 340px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04);
          animation: vw-panel-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 520px;
        }
        .vw-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 12px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .vw-status-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
          animation: sos-pulse 2s ease-in-out infinite;
        }
        .vw-orb-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 16px 12px;
          gap: 12px;
          flex-shrink: 0;
          position: relative;
        }
        .vw-orb-wrap {
          position: relative;
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vw-orb {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
          cursor: pointer;
          border: none;
          transition: transform 0.2s;
        }
        .vw-orb:active { transform: scale(0.93); }
        .vw-orb-ring {
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid;
          pointer-events: none;
        }
        .vw-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .vw-ctrl {
          width: 38px; height: 38px; border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--bg-card-hover);
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; cursor: pointer;
          transition: transform 0.15s, border-color 0.15s;
        }
        .vw-ctrl:hover { transform: scale(1.1); border-color: var(--border-hover); }
        .vw-ctrl.muted { background: rgba(239,68,68,0.12); border-color: var(--accent-red); }
        .vw-ctrl.end   { background: rgba(239,68,68,0.1); border-color: var(--accent-red); }
        .vw-transcript {
          flex: 1;
          overflow-y: auto;
          padding: 8px 14px 12px;
          min-height: 0;
          scroll-behavior: smooth;
        }
        .vw-transcript::-webkit-scrollbar { width: 3px; }
        .vw-transcript::-webkit-scrollbar-thumb { background: var(--border-hover); border-radius: 2px; }
        .vw-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          height: 80px; gap: 4px; opacity: 0.4;
        }
        .vw-creds-warn {
          padding: 10px 14px;
          background: rgba(245,158,11,0.08);
          border-top: 1px solid rgba(245,158,11,0.2);
          font-size: 11px;
          color: var(--accent-amber);
          text-align: center;
          line-height: 1.5;
          flex-shrink: 0;
        }
        @media (max-width: 480px) {
          .vw-panel { width: calc(100vw - 24px); right: 12px; }
          .vw-fab { bottom: 20px; right: 16px; }
        }
      `}</style>

      {/* ── Floating Action Button ── */}
      <button
        className={`vw-fab${isActive ? ' active-call' : ''}`}
        onClick={() => {
          if (!isActive && !open) {
            startCall();
          } else {
            setOpen(o => !o);
          }
        }}
        title={isActive ? 'Voice agent active — click to open' : 'Start voice agent'}
        style={{
          background: isActive
            ? isSpeaking ? 'linear-gradient(135deg,#ef4444,#b91c1c)' : 'linear-gradient(135deg,var(--accent-amber),var(--accent-amber-dark))'
            : 'linear-gradient(135deg,var(--accent-amber),var(--accent-amber-dark))',
        }}
      >
        {isActive ? (isSpeaking ? '🔊' : isListening ? '🎤' : '🎙️') : '🎙️'}

        {/* Active indicator badge */}
        {isActive && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 12, height: 12, borderRadius: '50%',
            background: 'var(--accent-green)',
            border: '2px solid var(--bg-primary)',
            animation: 'sos-pulse 1.5s ease-in-out infinite',
          }} />
        )}
      </button>

      {/* ── Popup Panel ── */}
      {open && (
        <div className="vw-panel">
          {/* Header */}
          <div className="vw-panel-header">
            <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
              <div className="vw-status-dot" style={{ background: statusCfg.dot }} />
              <div>
                <div style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:13, lineHeight:1.2 }}>SafeRoute Voice AI</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', gap:6 }}>
                  <span>{statusCfg.label}</span>
                  {isActive && <span style={{ color:'var(--accent-amber)', fontFamily:'var(--font-mono)' }}>{fmt(duration)}</span>}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {isActive && (
                <button className="vw-ctrl" onClick={endCall} title="End call" style={{ background:'rgba(239,68,68,0.1)', borderColor:'rgba(239,68,68,0.5)' }}>📵</button>
              )}
              <button className="vw-ctrl" onClick={() => setOpen(false)} title="Minimise">✕</button>
            </div>
          </div>

          {/* Orb + Bars + Controls */}
          <div className="vw-orb-area">
            <div className="vw-orb-wrap">
              {/* Pulse rings */}
              {isActive && [100, 86].map((size, i) => (
                <div key={size} className="vw-orb-ring" style={{
                  width: size, height: size,
                  borderColor: isSpeaking ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.25)',
                  animation: `vw-pulse-ring ${1.2 + i * 0.4}s ease-out ${i * 0.45}s infinite`,
                }} />
              ))}

              {/* Main orb */}
              <button
                className="vw-orb"
                onClick={() => { if (!isActive) { startCall(); } else { endCall(); } }}
                style={{
                  background: orbGrad,
                  boxShadow: isSpeaking
                    ? '0 0 28px rgba(239,68,68,0.5)'
                    : '0 0 24px rgba(245,158,11,0.4)',
                  animation: isActive ? 'sos-pulse 2s ease-in-out infinite' : 'none',
                }}
              >
                <span style={{ fontSize:'1.8rem', lineHeight:1 }}>
                  {!isActive ? '🎙️' : isSpeaking ? '🔊' : isListening ? '🎤' : '🎙️'}
                </span>
                <span style={{ fontSize:9, fontFamily:'var(--font-heading)', fontWeight:800, color: isSpeaking ? 'white' : '#0a0e1a', marginTop:2, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  {!isActive ? 'Start' : isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Live'}
                </span>
              </button>
            </div>

            {/* Audio bars */}
            <AudioBars active={isListening} speaking={isSpeaking} />

            {/* Controls */}
            {isActive && (
              <div className="vw-controls">
                <button
                  className={`vw-ctrl${muted ? ' muted' : ''}`}
                  onClick={toggleMute}
                  title={muted ? 'Unmute mic' : 'Mute mic'}
                >
                  {muted ? '🔇' : '🎤'}
                </button>
                <button className="vw-ctrl end" onClick={endCall} title="End call">📵</button>
              </div>
            )}

            {/* Start prompt when idle */}
            {!isActive && !credsMissing && (
              <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', lineHeight:1.5 }}>
                Tap the mic to connect · Talk freely while browsing
              </p>
            )}
          </div>

          {/* Transcript */}
          <div style={{ borderTop:'1px solid var(--border)', padding:'6px 14px 4px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Conversation</span>
            {transcript.length > 0 && (
              <button onClick={() => setTranscript([])} style={{ fontSize:10, color:'var(--text-faint)', background:'none', border:'none', cursor:'pointer' }}>Clear</button>
            )}
          </div>
          <div className="vw-transcript" ref={scrollRef}>
            {transcript.length === 0 ? (
              <div className="vw-empty">
                <span style={{ fontSize:'1.4rem' }}>💬</span>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>Conversation will appear here</span>
              </div>
            ) : (
              transcript.map(msg => <Bubble key={msg.id} msg={msg} />)
            )}
          </div>

          {/* Credentials warning */}
          {credsMissing && (
            <div className="vw-creds-warn">
              ⚠️ Set <code>VITE_VAPI_PUBLIC_KEY</code> &amp; <code>VITE_VAPI_ASSISTANT_ID</code> in <code>.env</code>
            </div>
          )}
        </div>
      )}
    </>
  );
}
