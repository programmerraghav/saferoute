/**
 * frontend/src/router.js
 * Simple client-side router using the History API.
 */

import { renderHome } from './pages/Home.js';
import { renderReportPothole } from './pages/ReportPothole.js';
import { renderSOS } from './pages/SOS.js';
import { renderDashboard } from './pages/Dashboard.js';

const routes = {
  '/':          renderHome,
  '/report':    renderReportPothole,
  '/sos':       renderSOS,
  '/dashboard': renderDashboard,
};

/**
 * Navigate to a path, update the browser URL, and render the appropriate page.
 * @param {string} path - Route path (e.g. '/report')
 * @param {boolean} [pushState=true] - Whether to push to history stack.
 */
export function navigate(path, pushState = true) {
  const normalised = path.split('?')[0].replace(/\/$/, '') || '/';
  const render = routes[normalised] || routes['/'];

  if (pushState) {
    window.history.pushState({ path: normalised }, '', normalised);
  }

  const app = document.getElementById('app');
  if (!app) return;

  // Fade out, swap, fade in
  app.style.opacity = '0';
  app.style.transition = 'opacity 0.2s ease';

  setTimeout(() => {
    app.innerHTML = '';
    const page = render();
    app.appendChild(page);
    window.scrollTo(0, 0);
    app.style.opacity = '1';

    // Highlight active nav links
    document.querySelectorAll('[data-route]').forEach((el) => {
      const route = el.dataset.route;
      el.classList.toggle('active', route === normalised);
    });
  }, 180);
}

/**
 * Initialise the router — handle popstate + link clicks.
 */
export function initRouter() {
  // Handle back/forward
  window.addEventListener('popstate', (e) => {
    navigate(e.state?.path || window.location.pathname, false);
  });

  // Intercept all [data-route] link clicks via delegation
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-route]');
    if (!link) return;
    e.preventDefault();
    const path = link.dataset.route || link.getAttribute('href') || '/';
    navigate(path);
  });

  // Render current URL on load
  navigate(window.location.pathname, false);
}
