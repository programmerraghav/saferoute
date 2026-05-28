/**
 * frontend/src/components/Navbar.js
 * Sticky top navigation bar with logo, links, and SOS button.
 */

export function renderNavbar() {
  const nav = document.createElement('nav');
  nav.id = 'navbar';
  nav.innerHTML = `
    <div class="nav-inner container">
      <a href="/" class="nav-logo" data-route="/">
        <div class="nav-logo-icon">🚦</div>
        <span class="nav-logo-text">Safe<span class="text-gradient-amber">Route</span></span>
      </a>

      <div class="nav-links">
        <a href="/" class="nav-link" data-route="/">Home</a>
        <a href="/report" class="nav-link" data-route="/report">Report Pothole</a>
        <a href="/dashboard" class="nav-link" data-route="/dashboard">Dashboard</a>
      </div>

      <div class="nav-actions">
        <a href="/sos" class="btn btn-red btn-sm nav-sos-btn" data-route="/sos" id="nav-sos-btn">
          🚨 SOS
        </a>
        <button class="nav-menu-btn" id="nav-menu-btn" aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>

    <div class="nav-mobile-menu" id="nav-mobile-menu">
      <a href="/" class="nav-mobile-link" data-route="/">Home</a>
      <a href="/report" class="nav-mobile-link" data-route="/report">Report Pothole</a>
      <a href="/dashboard" class="nav-mobile-link" data-route="/dashboard">Dashboard</a>
      <a href="/sos" class="nav-mobile-link nav-mobile-sos" data-route="/sos">🚨 Emergency SOS</a>
    </div>
  `;

  // Inject styles
  injectNavStyles();

  // Mobile menu toggle
  const menuBtn = nav.querySelector('#nav-menu-btn');
  const mobileMenu = nav.querySelector('#nav-mobile-menu');
  menuBtn?.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    menuBtn.classList.toggle('active');
  });

  // Scroll effect
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });

  return nav;
}

function injectNavStyles() {
  if (document.getElementById('navbar-styles')) return;
  const style = document.createElement('style');
  style.id = 'navbar-styles';
  style.textContent = `
    #navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: var(--z-nav);
      transition: var(--transition-slow);
      border-bottom: 1px solid transparent;
    }
    #navbar.scrolled {
      background: rgba(10, 14, 26, 0.92);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-color: var(--border);
    }
    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 68px;
    }
    .nav-logo {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      text-decoration: none;
    }
    .nav-logo-icon { font-size: 1.5rem; }
    .nav-logo-text {
      font-family: var(--font-heading);
      font-size: var(--text-xl);
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: var(--space-8);
    }
    .nav-link {
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--text-muted);
      transition: var(--transition);
      position: relative;
    }
    .nav-link:hover,
    .nav-link.active { color: var(--text-primary); }
    .nav-link::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent-amber);
      transform: scaleX(0);
      transition: transform 0.2s ease;
      border-radius: 1px;
    }
    .nav-link:hover::after,
    .nav-link.active::after { transform: scaleX(1); }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }
    .nav-sos-btn {
      animation: sos-pulse 2s ease-in-out infinite !important;
    }
    .nav-menu-btn {
      display: none;
      flex-direction: column;
      gap: 5px;
      width: 28px;
      cursor: pointer;
      background: none;
      border: none;
    }
    .nav-menu-btn span {
      display: block;
      height: 2px;
      background: var(--text-primary);
      border-radius: 1px;
      transition: var(--transition);
    }
    .nav-menu-btn.active span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
    .nav-menu-btn.active span:nth-child(2) { opacity: 0; }
    .nav-menu-btn.active span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }
    .nav-mobile-menu {
      display: none;
      flex-direction: column;
      padding: var(--space-4) var(--space-6);
      background: rgba(10, 14, 26, 0.97);
      border-top: 1px solid var(--border);
      animation: fade-in-down 0.2s ease;
    }
    .nav-mobile-menu.open { display: flex; }
    .nav-mobile-link {
      padding: var(--space-3) 0;
      font-weight: 500;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      transition: var(--transition);
    }
    .nav-mobile-link:last-child { border-bottom: none; }
    .nav-mobile-link:hover { color: var(--text-primary); padding-left: var(--space-2); }
    .nav-mobile-sos { color: var(--accent-red) !important; font-weight: 700; }
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .nav-menu-btn { display: flex; }
    }
  `;
  document.head.appendChild(style);
}
