/**
 * frontend/src/components/TicketList.js
 * Scrollable complaint ticket list with filter buttons and status dropdowns.
 */

import { createPotholeCard } from './PotholeCard.js';

export function createTicketList() {
  const el = document.createElement('div');
  el.className = 'ticket-list-root';

  el.innerHTML = `
    <div class="ticket-list-header">
      <h3 class="ticket-list-title">📋 Complaint Tickets</h3>
      <div class="ticket-filters" id="ticket-filters">
        <button class="ticket-filter-btn active" data-filter="all">All</button>
        <button class="ticket-filter-btn" data-filter="pending">Pending</button>
        <button class="ticket-filter-btn" data-filter="in_progress">In Progress</button>
        <button class="ticket-filter-btn" data-filter="resolved">Resolved</button>
        <button class="ticket-filter-btn" data-filter="high">High Severity</button>
      </div>
    </div>
    <div class="ticket-list-scroll" id="ticket-list-scroll">
      <div class="ticket-loading">
        <div class="spinner" style="border-top-color:var(--accent-amber)"></div>
        <span class="text-muted text-sm">Loading tickets...</span>
      </div>
    </div>
  `;

  injectTicketStyles();

  let allComplaints = [];
  let activeFilter = 'all';

  async function loadTickets() {
    const scroll = el.querySelector('#ticket-list-scroll');
    scroll.innerHTML = `<div class="ticket-loading"><div class="spinner" style="border-top-color:var(--accent-amber)"></div><span class="text-muted text-sm">Loading...</span></div>`;

    try {
      const res = await fetch('/api/dashboard/complaints');
      const data = await res.json();
      allComplaints = data.complaints || [];
      renderFiltered();
    } catch (err) {
      scroll.innerHTML = `<p class="ticket-empty text-muted">Failed to load: ${err.message}</p>`;
    }
  }

  function renderFiltered() {
    const scroll = el.querySelector('#ticket-list-scroll');
    scroll.innerHTML = '';

    let filtered = allComplaints;
    if (activeFilter === 'high') {
      filtered = allComplaints.filter((c) => c.severity >= 7);
    } else if (activeFilter !== 'all') {
      filtered = allComplaints.filter((c) => c.status === activeFilter);
    }

    if (filtered.length === 0) {
      scroll.innerHTML = '<p class="ticket-empty text-muted">No tickets match this filter.</p>';
      return;
    }

    filtered.forEach((complaint, i) => {
      const card = createPotholeCard(complaint, async (id, newStatus) => {
        await updateStatus(id, newStatus);
      });
      card.style.animationDelay = `${i * 0.05}s`;
      card.classList.add('animate-fade-in-up');
      scroll.appendChild(card);
    });
  }

  async function updateStatus(complaint_id, status) {
    try {
      const res = await fetch(`/api/complaints/${complaint_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Update failed');
      // Update local cache
      const idx = allComplaints.findIndex((c) => c.complaint_id === complaint_id);
      if (idx !== -1) allComplaints[idx].status = status;
      renderFiltered();
    } catch (err) {
      console.error('[TicketList] Status update failed:', err);
    }
  }

  // Filter buttons
  el.querySelectorAll('.ticket-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.ticket-filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderFiltered();
    });
  });

  loadTickets();

  return { el, reload: loadTickets };
}

function injectTicketStyles() {
  if (document.getElementById('ticket-list-styles')) return;
  const style = document.createElement('style');
  style.id = 'ticket-list-styles';
  style.textContent = `
    .ticket-list-root {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .ticket-list-header {
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--border);
      background: var(--bg-card);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }
    .ticket-list-title {
      font-family: var(--font-heading);
      font-size: var(--text-lg);
      font-weight: 700;
      margin-bottom: var(--space-3);
    }
    .ticket-filters {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
    }
    .ticket-filter-btn {
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: 600;
      background: var(--bg-card-hover);
      color: var(--text-muted);
      border: 1px solid var(--border);
      cursor: pointer;
      transition: var(--transition);
    }
    .ticket-filter-btn:hover { border-color: var(--accent-amber); color: var(--accent-amber); }
    .ticket-filter-btn.active { background: var(--accent-amber-glow-xl); border-color: var(--accent-amber); color: var(--accent-amber); }
    .ticket-list-scroll {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-4) var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      background: var(--bg-secondary);
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      max-height: 600px;
    }
    .ticket-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      padding: var(--space-8) 0;
    }
    .ticket-empty { text-align: center; padding: var(--space-6) 0; }
  `;
  document.head.appendChild(style);
}
