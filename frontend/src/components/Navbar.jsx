import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { isLoggedIn, getCurrentUser, logout, hasRole } from '../services/auth';
import { useTheme } from '../contexts/ThemeContext';

function roleName(role) {
  return { admin: 'Admin', municipality_employee: 'Employee', user: 'User' }[role] || role;
}
function initials(name) {
  return (name || '?').split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
}
function stringToColor(str) {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

// ── Theme Toggle Button ──────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
        cursor: 'pointer',
        fontSize: '1rem',
        transition: 'background 0.2s, border 0.2s, transform 0.2s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.borderColor = 'var(--accent-amber)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'; }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState(getCurrentUser());
  const loggedIn = isLoggedIn();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const updateAuth = () => setUser(getCurrentUser());
    window.addEventListener('sr:auth:login', updateAuth);
    window.addEventListener('sr:auth:logout', updateAuth);
    return () => {
      window.removeEventListener('sr:auth:login', updateAuth);
      window.removeEventListener('sr:auth:logout', updateAuth);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const navBg = scrolled
    ? isDark
      ? 'rgba(10, 14, 26, 0.92)'
      : 'rgba(248, 249, 252, 0.94)'
    : 'transparent';

  return (
    <>
      <nav id="navbar" className={scrolled ? 'scrolled' : ''} style={{ '--nav-bg': navBg }}>
        <div className="nav-inner container">
          <Link to="/" className="nav-logo" onClick={() => setMobileMenuOpen(false)}>
            <img src="/favicon.svg" alt="SafeRoute Logo" className="nav-logo-icon" style={{ width: 28, height: 28, display: 'block' }} />
            <span className="nav-logo-text">Safe<span className="text-gradient-amber">Route</span></span>
          </Link>

          <div className="nav-links">
            <NavLink to="/" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>Home</NavLink>
            <NavLink to="/report" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Report</NavLink>
            <NavLink to="/nearby-map" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
              🗺️ Nearby
              <span className="animate-green-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', marginLeft: 6, boxShadow: '0 0 6px var(--accent-green)' }} />
            </NavLink>
            <button
              className="nav-voice-pill animate-amber-pulse"
              onClick={() => window.dispatchEvent(new CustomEvent('sr:voice:open'))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: 'var(--accent-amber)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginLeft: '4px',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.18)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-amber)', display: 'inline-block' }} />
              🎙️ Voice Agent
            </button>
            {hasRole('admin', 'municipality_employee') && (
              <NavLink to="/dashboard" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
            )}
            {hasRole('admin') && (
              <NavLink to="/admin" className={({isActive}) => `nav-link nav-link-admin ${isActive ? 'active' : ''}`}>🏛️ Admin</NavLink>
            )}
          </div>

          <div className="nav-actions">
            {/* Theme Toggle */}
            <ThemeToggle />

            <Link to="/sos" className="btn btn-red btn-sm nav-sos-btn">🚨 SOS</Link>

            {loggedIn && user ? (
              <div
                className="nav-user-chip"
                onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
              >
                <div className="nav-user-avatar" style={{background: stringToColor(user.name)}}>{initials(user.name)}</div>
                <div className="nav-user-info">
                  <span className="nav-user-name">{user.name.split(' ')[0]}</span>
                  <span className={`nav-role-badge nav-role-${user.role}`}>{roleName(user.role)}</span>
                </div>

                {dropdownOpen && (
                  <div className="nav-user-dropdown open" onClick={(e) => e.stopPropagation()}>
                    {user.employee_id && (
                      <div className="nav-dropdown-item nav-dropdown-id">ID: <code>{user.employee_id}</code></div>
                    )}
                    <Link to="/login" className="nav-dropdown-item" onClick={() => setDropdownOpen(false)}>My Profile</Link>
                    <button className="nav-dropdown-item nav-dropdown-logout" onClick={handleLogout}>Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn btn-outline btn-sm">Sign In</Link>
            )}

            <button
              className={`nav-menu-btn ${mobileMenuOpen ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="nav-mobile-menu open">
            <Link to="/" className="nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link to="/report" className="nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>Report Pothole</Link>
            <Link to="/nearby-map" className="nav-mobile-link" onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
              <span>🗺️ Nearby Map</span>
              <span className="animate-green-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', marginLeft: 'auto', boxShadow: '0 0 6px var(--accent-green)' }} />
            </Link>
            <button
              className="nav-mobile-link"
              onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('sr:voice:open')); }}
              style={{ border:'none', textAlign:'left', cursor:'pointer', background:'none', borderBottom:'1px solid var(--border)', color:'var(--accent-amber)', fontWeight:600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              🎙️ Voice Agent
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-amber)', display: 'inline-block', animation: 'amber-pulse 1.5s infinite' }} />
            </button>

            {hasRole('admin', 'municipality_employee') && (
              <Link to="/dashboard" className="nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            )}
            {hasRole('admin') && (
              <Link to="/admin" className="nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>🏛️ Admin Panel</Link>
            )}
            <Link to="/sos" className="nav-mobile-link nav-mobile-sos" onClick={() => setMobileMenuOpen(false)}>🚨 Emergency SOS</Link>

            {/* Mobile theme toggle */}
            <div style={{ padding:'var(--space-3) 0', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:'var(--text-sm)', color:'var(--text-muted)' }}>Theme</span>
              <ThemeToggle />
            </div>

            {loggedIn ? (
              <button className="nav-mobile-link nav-mobile-logout" onClick={handleLogout}>Sign Out</button>
            ) : (
              <Link to="/login" className="nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
            )}
          </div>
        )}
      </nav>

      <style dangerouslySetInnerHTML={{__html: `
        #navbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: var(--z-nav);
          transition: background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease;
          border-bottom: 1px solid var(--border);
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 1px 15px rgba(0,0,0,0.08);
        }
        .nav-inner { display: flex; align-items: center; justify-content: space-between; height: 68px; }
        .nav-logo { display: flex; align-items: center; gap: var(--space-3); text-decoration: none; }
        .nav-logo-icon { font-size: 1.5rem; }
        .nav-logo-text { font-family: var(--font-heading); font-size: var(--text-xl); font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em; }
        .nav-links { display: flex; align-items: center; gap: var(--space-6); }
        .nav-link { font-size: var(--text-sm); font-weight: 500; color: var(--text-muted); transition: color 0.2s; position: relative; }
        .nav-link:hover, .nav-link.active { color: var(--text-primary); }
        .nav-link-admin { color: var(--accent-amber) !important; }
        .nav-link::after { content: ''; position: absolute; bottom: -4px; left: 0; right: 0; height: 2px; background: var(--accent-amber); transform: scaleX(0); transition: transform 0.2s ease; border-radius: 1px; }
        .nav-link:hover::after, .nav-link.active::after { transform: scaleX(1); }
        .nav-actions { display: flex; align-items: center; gap: var(--space-3); }
        .nav-sos-btn { animation: sos-pulse 2s ease-in-out infinite !important; }
        .nav-user-chip { display: flex; align-items: center; gap: var(--space-2); padding: 4px var(--space-3) 4px 4px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-full); cursor: pointer; transition: var(--transition); position: relative; }
        .nav-user-chip:hover { border-color: var(--accent-amber); }
        .nav-user-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: var(--text-xs); font-weight: 700; color: white; }
        .nav-user-info { display: flex; flex-direction: column; line-height: 1.2; }
        .nav-user-name { font-size: var(--text-xs); font-weight: 600; }
        .nav-role-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 1px 5px; border-radius: 3px; }
        .nav-role-admin { background: rgba(239,68,68,0.15); color: var(--accent-red); }
        .nav-role-municipality_employee { background: rgba(245,158,11,0.15); color: var(--accent-amber); }
        .nav-role-user { background: rgba(34,197,94,0.1); color: var(--accent-green); }
        .nav-user-dropdown { display: none; position: absolute; top: calc(100% + 8px); right: 0; min-width: 180px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: 0 12px 32px rgba(0,0,0,0.3); overflow: hidden; z-index: 100; }
        .nav-user-dropdown.open { display: block; animation: fade-in 0.15s ease; }
        .nav-dropdown-item { display: block; width: 100%; padding: var(--space-3) var(--space-4); font-size: var(--text-sm); color: var(--text-secondary); text-align: left; background: none; border: none; cursor: pointer; transition: var(--transition); }
        .nav-dropdown-item:hover { background: var(--bg-card-hover); color: var(--text-primary); }
        .nav-dropdown-id { font-size: var(--text-xs); color: var(--text-muted); cursor: default; border-bottom: 1px solid var(--border); }
        .nav-dropdown-id:hover { background: none; color: var(--text-muted); }
        .nav-dropdown-logout { color: var(--accent-red) !important; }
        .nav-menu-btn { display: none; flex-direction: column; gap: 5px; width: 28px; cursor: pointer; background: none; border: none; }
        .nav-menu-btn span { display: block; height: 2px; background: var(--text-primary); border-radius: 1px; transition: var(--transition); }
        .nav-menu-btn.active span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
        .nav-menu-btn.active span:nth-child(2) { opacity: 0; }
        .nav-menu-btn.active span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }
        .nav-mobile-menu { display: none; flex-direction: column; padding: var(--space-4) var(--space-6); background: var(--bg-card); border-top: 1px solid var(--border); backdrop-filter: blur(20px); }
        .nav-mobile-menu.open { display: flex; animation: fade-in 0.2s ease; }
        .nav-mobile-link { display: block; width: 100%; padding: var(--space-3) 0; font-weight: 500; color: var(--text-muted); border-bottom: 1px solid var(--border); transition: var(--transition); background: none; border-left: none; border-right: none; text-align: left; cursor: pointer; }
        .nav-mobile-link:last-child { border-bottom: none; }
        .nav-mobile-link:hover { color: var(--text-primary); padding-left: var(--space-2); }
        .nav-mobile-sos { color: var(--accent-red) !important; font-weight: 700; }
        .nav-mobile-logout { color: var(--accent-red) !important; }
        @keyframes fade-in-down { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @media (max-width: 900px) { .nav-links { gap: var(--space-4); } }
        @media (max-width: 768px) { .nav-links { display: none; } .nav-menu-btn { display: flex; } }
      `}} />
    </>
  );
}
