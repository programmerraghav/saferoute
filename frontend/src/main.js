/**
 * frontend/src/main.js
 * Application entry point — mounts navbar, initialises router, sets up toasts.
 */

import { renderNavbar } from './components/Navbar.js';
import { initRouter } from './router.js';

function showToast(message, type = 'warn') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

window.showToast = showToast;

function init() {
  // Mount navbar
  const navWrapper = document.getElementById('nav-wrapper');
  if (navWrapper) {
    navWrapper.appendChild(renderNavbar());
  }

  // Toast container
  const toastCont = document.getElementById('toast-container');
  if (!toastCont) {
    const tc = document.createElement('div');
    tc.id = 'toast-container';
    document.body.appendChild(tc);
  }

  // Initialise SPA router (renders first page)
  initRouter();

  console.log('%c🚦 SafeRoute', 'font-size:18px;font-weight:bold;color:#f59e0b', '— AI Road Safety System loaded');
}

// DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
