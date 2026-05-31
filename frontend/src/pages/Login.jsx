import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, register } from '../services/auth';

// ── Particle canvas background ─────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent.offsetWidth;
    canvas.height = parent.offsetHeight;
    const ctx = canvas.getContext('2d');
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
      a: Math.random(),
    }));
    let raf;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,158,11,${p.a * 0.3})`;
        ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(245,158,11,${(1 - dist / 120) * 0.08})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}

function PasswordStrength({ value }) {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^a-zA-Z0-9]/.test(value)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'var(--accent-red)', 'var(--accent-amber)', '#60a5fa', 'var(--accent-green)'];
  if (!value) return null;
  return (
    <div style={{ marginTop: 'var(--space-2)' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= score ? colors[score] : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
        ))}
      </div>
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

function PasswordInput({ id, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input id={id} type={show ? 'text' : 'password'} className="input" value={value} onChange={onChange}
        placeholder={placeholder} style={{ paddingRight: 44 }} />
      <button type="button" onClick={() => setShow(s => !s)}
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.5 }}>
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  );
}

import { isLoggedIn, getCurrentUser, logout, fetchMe } from '../services/auth';
import { authFetch } from '../services/auth';

export default function Login() {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Profile section state
  const loggedIn = isLoggedIn();
  const currentUser = getCurrentUser();
  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  // Profile edits state
  const [userNameField, setUserNameField] = useState(() => currentUser?.name || '');
  const [userPhone, setUserPhone] = useState(() => currentUser?.phone || '');
  const [sosContactName, setSosContactName] = useState(() => currentUser?.emergency_contact_name || localStorage.getItem('sos_contact_name') || '');
  const [sosContactPhone, setSosContactPhone] = useState(() => currentUser?.emergency_contact_phone || localStorage.getItem('sos_contact_phone') || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  React.useEffect(() => {
    if (loggedIn) {
      setLoadingComplaints(true);
      authFetch('/api/auth/my-complaints')
        .then(res => res.json())
        .then(data => {
          setMyComplaints(data.complaints || []);
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingComplaints(false));
    }
  }, [loggedIn]);

  React.useEffect(() => {
    if (currentUser) {
      setUserNameField(currentUser.name || '');
      setUserPhone(currentUser.phone || '');
      setSosContactName(currentUser.emergency_contact_name || localStorage.getItem('sos_contact_name') || '');
      setSosContactPhone(currentUser.emergency_contact_phone || localStorage.getItem('sos_contact_phone') || '');
    }
  }, [currentUser]);

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileMessage(null);
    try {
      const res = await authFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: userNameField,
          phone: userPhone,
          emergency_contact_name: sosContactName,
          emergency_contact_phone: sosContactPhone,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile.');
      
      // Also update localStorage values for SOS offline fallback
      localStorage.setItem('sos_user_name', userNameField);
      localStorage.setItem('sos_contact_name', sosContactName);
      localStorage.setItem('sos_contact_phone', sosContactPhone);

      // Re-fetch profile to sync state
      await fetchMe();
      setProfileMessage({ type: 'green', text: '✓ Profile updated successfully!' });
      setTimeout(() => setProfileMessage(null), 4000);
    } catch (err) {
      setProfileMessage({ type: 'red', text: `⚠️ ${err.message}` });
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email: loginEmail, password: loginPass });
      navigate('/login'); // refresh profile view
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (regPass !== regConfirm) return setError('Passwords do not match.');
    if (regPass.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      await register({ name: regName, email: regEmail, password: regPass, phone: regPhone || undefined });
      navigate('/login'); // refresh profile view
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  const getStatusBadge = (status) => {
    const s = status || 'pending';
    return s === 'resolved' ? 'green' : s === 'in_progress' ? 'amber' : 'red';
  };

  return (
    <>
      <style>{`
        .login-page-root { min-height:100vh; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; background-image:url('/bg-road.jpg'); background-size:cover; background-position:center; padding-top: 80px; padding-bottom: 40px; }
        .login-bg { position:absolute; inset:0; pointer-events:none; background:transparent; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); }
        .login-bg-glow { position:absolute; border-radius:50%; filter:blur(100px); opacity:0.12; }
        .login-glow-amber { width:500px; height:500px; background:var(--accent-amber); top:-100px; left:-100px; }
        .login-glow-blue { width:400px; height:400px; background:#3b82f6; bottom:-80px; right:-80px; }
        .login-center { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:var(--space-6); width:100%; max-width:960px; padding:var(--space-4); }
        .login-card { width:100%; background:var(--bg-glass); border:1px solid var(--border); border-radius:var(--radius-xl); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.3); }
        .login-tabs { display:flex; border-bottom:1px solid var(--border); }
        .login-tab { flex:1; padding:var(--space-4); font-weight:600; font-size:var(--text-sm); color:var(--text-muted); background:none; border:none; cursor:pointer; transition:var(--transition); border-bottom:2px solid transparent; margin-bottom:-1px; }
        .login-tab:hover { color:var(--text-primary); background:rgba(255,255,255,0.05); }
        .login-tab.active { color:var(--accent-amber); border-bottom-color:var(--accent-amber); background:rgba(245,158,11,0.04); }
        .login-panel { padding:var(--space-7); max-width: 520px; margin: 0 auto; }
        .login-form { display:flex; flex-direction:column; gap:var(--space-4); }
        .form-error { padding:var(--space-3) var(--space-4); background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:var(--radius); color:var(--accent-red); font-size:var(--text-sm); font-weight:500; }
        .register-role-note { display:flex; align-items:flex-start; gap:var(--space-3); padding:var(--space-3); background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.15); border-radius:var(--radius); }
        .login-info-strip { display:flex; gap:var(--space-6); align-items:center; }
        .login-info-item { display:flex; align-items:center; gap:var(--space-2); }
        
        /* Profile Layout */
        .profile-grid { display: grid; grid-template-columns: 200px 1fr; gap: var(--space-6); padding: var(--space-6); }
        .profile-sidebar { border-right: 1px solid var(--border); padding-right: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }
        .profile-avatar-large { width: 80px; height: 80px; border-radius: 50%; font-size: 2.25rem; font-weight: 800; color: #fff; background: var(--accent-amber); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-2); box-shadow: 0 0 20px rgba(245,158,11,0.25); }
        .profile-content { display: flex; flex-direction: column; gap: var(--space-4); }
        .profile-content-layout { display: grid; grid-template-columns: 1.2fr 1fr; gap: var(--space-6); }
        .complaint-list { display: flex; flex-direction: column; gap: var(--space-3); max-height: 460px; overflow-y: auto; padding-right: var(--space-2); }
        .complaint-item { padding: var(--space-4); background: var(--bg-card-hover); border: 1px solid var(--border); border-radius: var(--radius-lg); display: flex; justify-content: space-between; align-items: center; transition: var(--transition); }
        .complaint-item:hover { border-color: var(--accent-amber); background: rgba(245,158,11,0.02); }
        @media (max-width: 992px) {
          .profile-content-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr; }
          .profile-sidebar { border-right: none; border-bottom: 1px solid var(--border); padding-right: 0; padding-bottom: var(--space-6); }
        }
        .login-card .label { color: var(--text-secondary) !important; }
      `}</style>
      <div className="login-page-root">
        <div className="login-bg">
          <ParticleCanvas />
          <div className="login-bg-glow login-glow-amber" />
          <div className="login-bg-glow login-glow-blue" />
        </div>
        <div className="login-center">
          <Link to="/" className="login-brand" style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', textDecoration:'none' }}>
            <img src="/favicon.svg" alt="SafeRoute Logo" style={{ width: 32, height: 32 }} />
            <span style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-2xl)', fontWeight:800, color:'#ffffff' }}>
              Safe<span className="text-gradient-amber">Route</span>
            </span>
          </Link>

          <div className="login-card">
            {loggedIn && currentUser ? (
              <div className="profile-grid">
                <div className="profile-sidebar" style={{ textAlign: 'center' }}>
                  <div className="profile-avatar-large">
                    {(currentUser.name || '?').split(' ').slice(0,2).map(w => w[0]?.toUpperCase()).join('')}
                  </div>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', fontWeight: 700 }}>{currentUser.name}</h2>
                    <p className="text-xs text-muted" style={{ wordBreak: 'break-all', marginTop: 2 }}>{currentUser.email}</p>
                    <span className={`badge badge-amber`} style={{ display: 'inline-block', marginTop: 'var(--space-2)', textTransform: 'uppercase', fontSize: 10 }}>
                      👤 {currentUser.role}
                    </span>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={handleSignOut} style={{ marginTop: 'auto', justifyContent: 'center', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>
                    Sign Out
                  </button>
                </div>
                
                <div className="profile-content">
                  <div className="profile-content-layout">
                    {/* Left Column: My Reported Potholes */}
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>📋 My Reported Potholes</h3>
                      {loadingComplaints ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                          <div className="spinner" style={{ borderTopColor: 'var(--accent-amber)' }} />
                        </div>
                      ) : myComplaints.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0', color: 'var(--text-muted)', background: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                          <p className="text-sm" style={{ marginBottom: 'var(--space-4)' }}>You haven't reported any potholes yet.</p>
                          <Link to="/report" className="btn btn-amber btn-sm" style={{ display: 'inline-flex' }}>Report a Pothole</Link>
                        </div>
                      ) : (
                        <div className="complaint-list">
                          {myComplaints.map(c => (
                            <div key={c.complaint_id} className="complaint-item">
                              <div>
                                <span className="text-xs text-muted font-mono" style={{ display: 'block', marginBottom: 2 }}>#{c.complaint_id}</span>
                                <span className="text-sm" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {c.road_name || 'Reported Location'}
                                </span>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <div>🏗️ <b>Contractor:</b> {c.contractor_name || 'N/A'}</div>
                                  <div>📅 <b>Tender Date:</b> {c.tender_date ? new Date(c.tender_date).toLocaleDateString('en-IN') : 'N/A'} (Tender: {c.tender_amount || 'N/A'})</div>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', alignItems: 'center' }}>
                                  <span className={`badge badge-${c.severity >= 7 ? 'red' : c.severity >= 4 ? 'amber' : 'green'}`} style={{ fontSize: 9 }}>
                                    Severity: {c.severity}/10
                                  </span>
                                  <span className="text-xs text-muted">
                                    {new Date(c.created_at).toLocaleDateString('en-IN')}
                                  </span>
                                </div>
                              </div>
                              <span className={`badge badge-${getStatusBadge(c.status)}`} style={{ textTransform: 'uppercase', fontSize: 10 }}>
                                {c.status || 'pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Profile Details & SOS Contacts */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                      <div className="card" style={{ padding: 'var(--space-5)' }}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>👤 Account Details</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                            <span className="text-muted">Full Name:</span>
                            <span style={{ fontWeight: 600 }}>{currentUser.name}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                            <span className="text-muted">Email:</span>
                            <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{currentUser.email}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                            <span className="text-muted">Account ID:</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{currentUser.id}</span>
                          </div>
                          {currentUser.employee_id && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                              <span className="text-muted">Employee ID:</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-amber)', fontWeight: 700 }}>{currentUser.employee_id}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Member Since:</span>
                            <span style={{ fontWeight: 600 }}>{currentUser.created_at ? new Date(currentUser.created_at).toLocaleDateString('en-IN') : '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="card" style={{ padding: 'var(--space-5)' }}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>⚙️ Profile & SOS Settings</h3>
                        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                          {profileMessage && (
                            <div className={`badge badge-${profileMessage.type === 'green' ? 'green' : 'red'}`} style={{ padding: '6px', fontSize: 11, borderRadius: 4, width: '100%', justifyContent: 'center', textAlign: 'center' }}>
                              {profileMessage.text}
                            </div>
                          )}
                          <div>
                            <label className="label" htmlFor="profile-name" style={{ fontSize: 11, marginBottom: 4 }}>Full Name</label>
                            <input id="profile-name" type="text" className="input" style={{ height: 36, fontSize: 13 }} value={userNameField} onChange={e => setUserNameField(e.target.value)} placeholder="Rahul Sharma" required />
                          </div>
                          <div>
                            <label className="label" htmlFor="profile-phone" style={{ fontSize: 11, marginBottom: 4 }}>Your Phone Number</label>
                            <input id="profile-phone" type="tel" className="input" style={{ height: 36, fontSize: 13 }} value={userPhone} onChange={e => setUserPhone(e.target.value)} placeholder="+91 98765 43210" />
                          </div>
                          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 2px 0' }} />
                          <div>
                            <label className="label" htmlFor="sos-contact-name" style={{ fontSize: 11, marginBottom: 4 }}>Emergency Contact Name</label>
                            <input id="sos-contact-name" type="text" className="input" style={{ height: 36, fontSize: 13 }} value={sosContactName} onChange={e => setSosContactName(e.target.value)} placeholder="Dad / Doctor" />
                          </div>
                          <div>
                            <label className="label" htmlFor="sos-contact-phone" style={{ fontSize: 11, marginBottom: 4 }}>Emergency Contact Phone</label>
                            <input id="sos-contact-phone" type="tel" className="input" style={{ height: 36, fontSize: 13 }} value={sosContactPhone} onChange={e => setSosContactPhone(e.target.value)} placeholder="+91 98765 43210" />
                          </div>
                          <button type="submit" className="btn btn-amber" disabled={updatingProfile} style={{ height: 36, fontSize: 13, justifyContent: 'center', marginTop: 'var(--space-2)' }}>
                            {updatingProfile ? 'Saving...' : 'Save Settings ✓'}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="login-tabs">
                  <button className={`login-tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>Sign In</button>
                  <button className={`login-tab${tab === 'register' ? ' active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>Create Account</button>
                </div>
                {tab === 'login' ? (
                  <div className="login-panel">
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                      <h1 style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-2xl)', fontWeight:800, marginBottom:'var(--space-1)' }}>Welcome back</h1>
                      <p className="text-sm text-muted">Sign in to report and track potholes</p>
                    </div>
                    <form className="login-form" onSubmit={handleLogin}>
                      {error && <div className="form-error">⚠️ {error}</div>}
                      <div>
                        <label className="label" htmlFor="login-email">Email address</label>
                        <input id="login-email" type="email" className="input" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" required />
                      </div>
                      <div>
                        <label className="label" htmlFor="login-pass">Password</label>
                        <PasswordInput id="login-pass" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="Enter your password" />
                      </div>
                      <button type="submit" className="btn btn-amber login-submit-btn" disabled={loading} style={{ width:'100%', justifyContent:'center' }}>
                        {loading ? <><span className="spinner" style={{ width:16, height:16, borderWidth:2, borderTopColor:'#0a0e1a' }} /> Loading...</> : 'Sign In →'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="login-panel">
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                      <h1 style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-2xl)', fontWeight:800, marginBottom:'var(--space-1)' }}>Create Account</h1>
                      <p className="text-sm text-muted">Join the community fighting bad roads</p>
                    </div>
                    <form className="login-form" onSubmit={handleRegister}>
                      {error && <div className="form-error">⚠️ {error}</div>}
                      <div>
                        <label className="label" htmlFor="reg-name">Full Name</label>
                        <input id="reg-name" type="text" className="input" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Rahul Sharma" required />
                      </div>
                      <div>
                        <label className="label" htmlFor="reg-email">Email</label>
                        <input id="reg-email" type="email" className="input" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="you@example.com" required />
                      </div>
                      <div>
                        <label className="label" htmlFor="reg-phone">Phone (optional)</label>
                        <input id="reg-phone" type="tel" className="input" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="+91 98765 43210" />
                      </div>
                      <div>
                        <label className="label" htmlFor="reg-pass">Password</label>
                        <PasswordInput id="reg-pass" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="At least 8 characters" />
                        <PasswordStrength value={regPass} />
                      </div>
                      <div>
                        <label className="label" htmlFor="reg-confirm">Confirm Password</label>
                        <PasswordInput id="reg-confirm" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder="Repeat password" />
                      </div>
                      <div className="register-role-note">
                        <span>ℹ️</span>
                        <p className="text-xs text-muted">Public accounts are registered as <strong>Citizens</strong>. Municipality employees receive separate credentials from the admin.</p>
                      </div>
                      <button type="submit" className="btn btn-amber" disabled={loading} style={{ width:'100%', justifyContent:'center' }}>
                        {loading ? <><span className="spinner" style={{ width:16, height:16, borderWidth:2, borderTopColor:'#0a0e1a' }} /> Loading...</> : 'Create Account →'}
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="login-info-strip text-xs text-muted">
            <div className="login-info-item">🔒 <span>Secure & Encrypted</span></div>
            <div className="login-info-item">🛡️ <span>No spam ever</span></div>
            <div className="login-info-item">📍 <span>Location private</span></div>
          </div>
        </div>
      </div>
    </>
  );
}