import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapView } from '../components/MapView';
import { authFetch } from '../services/auth';

const STAT_KEYS = ['total_complaints','resolved','pending','in_progress','total_sos_events','avg_severity'];
const STAT_LABELS = { total_complaints:'Total Complaints', resolved:'Resolved', pending:'Pending', in_progress:'In Progress', total_sos_events:'SOS Events', avg_severity:'Avg Severity' };
function statColor(key, val) {
  if (key === 'avg_severity') return val >= 7 ? 'var(--accent-red)' : val >= 4 ? 'var(--accent-amber)' : 'var(--accent-green)';
  if (key === 'resolved') return 'var(--accent-green)';
  if (key === 'pending') return 'var(--accent-amber)';
  return 'var(--text-primary)';
}

// ── Ticket List ────────────────────────────────────────────────────────────────
function TicketList({ onRefresh }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch('/api/dashboard/complaints');
      const d = await res.json();
      setTickets(d.complaints || []);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id, status) {
    setUpdatingId(id);
    try {
      await authFetch(`/api/complaints/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setTickets(prev => prev.map(t => t.complaint_id === id ? { ...t, status } : t));
    } catch {} finally { setUpdatingId(null); }
  }

  const statusOpts = ['reported','in_progress','resolved'];
  const filtered = statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter);
  const badgeFor = s => s === 'resolved' ? 'green' : s === 'in_progress' ? 'amber' : 'red';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'var(--space-3) var(--space-4)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'var(--space-2)' }}>
        <span style={{ fontFamily:'var(--font-heading)', fontWeight:700 }}>Tickets ({filtered.length})</span>
        <div style={{ display:'flex', gap:'var(--space-2)' }}>
          {['all','reported','in_progress','resolved'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`btn btn-xs ${statusFilter === s ? 'btn-amber' : 'btn-ghost'}`}
              style={{ fontSize:'var(--text-xs)', padding:'2px 8px' }}>
              {s.replace('_',' ')}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'var(--space-8)' }}><div className="spinner" style={{ borderTopColor:'var(--accent-amber)' }} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'var(--space-8)', color:'var(--text-muted)' }}>No tickets found</div>
        ) : filtered.map(t => (
          <div key={t.complaint_id} style={{ padding:'var(--space-3) var(--space-4)', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'var(--space-2)' }}>
              <span className="text-xs font-mono text-muted">#{t.complaint_id?.substring(0,8)}</span>
              <span className={`badge badge-${badgeFor(t.status)}`} style={{ fontSize:9, textTransform:'uppercase' }}>{t.status?.replace('_',' ')}</span>
            </div>
            <p className="text-sm" style={{ fontWeight:600, marginBottom:'var(--space-1)' }}>{t.road_name || 'Unknown Road'}</p>
            <div style={{ display:'flex', gap:'var(--space-2)', alignItems:'center', flexWrap:'wrap', marginBottom:'var(--space-2)' }}>
              <span className={`badge badge-${t.severity >= 7 ? 'red' : t.severity >= 4 ? 'amber' : 'green'}`} style={{ fontSize:9 }}>{t.severity}/10</span>
              <span className="text-xs text-muted">{t.pothole_type}</span>
            </div>
            <select value={t.status} disabled={updatingId === t.complaint_id}
              onChange={e => updateStatus(t.complaint_id, e.target.value)}
              style={{ background:'var(--bg-card-hover)', border:'1px solid var(--border)', color:'var(--text-secondary)', padding:'2px 8px', borderRadius:'var(--radius-sm)', fontSize:'var(--text-xs)', cursor:'pointer', width:'100%' }}>
              {statusOpts.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Heatmap Panel ──────────────────────────────────────────────────────────────
function HeatmapPanel({ complaints }) {
  const zones = [
    { label: 'High Severity (7-10)', color: '#ef4444', items: complaints.filter(c => c.severity >= 7) },
    { label: 'Medium Severity (4-6)', color: '#f59e0b', items: complaints.filter(c => c.severity >= 4 && c.severity < 7) },
    { label: 'Low Severity (1-3)', color: '#22c55e', items: complaints.filter(c => c.severity < 4) },
  ];
  const total = complaints.length || 1;
  return (
    <div style={{ paddingBlock:'var(--space-6)' }}>
      <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-xl)', fontWeight:700, marginBottom:'var(--space-6)' }}>🌡️ Severity Distribution</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'var(--space-4)' }}>
        {zones.map(z => (
          <div key={z.label} className="card" style={{ padding:'var(--space-5)' }}>
            <div style={{ height:8, borderRadius:4, background:z.color, marginBottom:'var(--space-4)', opacity:0.8 }} />
            <div style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-3xl)', fontWeight:800, color:z.color, marginBottom:'var(--space-1)' }}>{z.items.length}</div>
            <div className="text-xs text-muted">{z.label}</div>
            <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.08)', marginTop:'var(--space-3)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${(z.items.length/total)*100}%`, background:z.color, borderRadius:2, transition:'width 0.8s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [complaints, setComplaints] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const mapRef = useRef(null);

  async function loadStats() {
    setLoadingStats(true);
    try {
      const res = await authFetch('/api/dashboard/stats');
      setStats(await res.json());
    } catch {} finally { setLoadingStats(false); }
  }

  async function loadComplaints() {
    try {
      const res = await authFetch('/api/dashboard/complaints');
      const d = await res.json();
      setComplaints(d.complaints || []);
    } catch {}
  }

  useEffect(() => {
    loadStats();
    loadComplaints();
  }, []);

  function handleRefresh() {
    loadStats();
    loadComplaints();
  }

  return (
    <>
      <style>{`
        .dashboard-root { min-height:100vh; padding-top:68px; }
        .dashboard-header { background:var(--bg-secondary); border-bottom:1px solid var(--border); padding-block:var(--space-6); }
        .dashboard-header-inner { display:flex; align-items:flex-end; justify-content:space-between; gap:var(--space-4); }
        .dashboard-stats-bar { background:var(--bg-card); border-bottom:1px solid var(--border); padding-block:var(--space-4); position:sticky; top:68px; z-index:var(--z-above); }
        .dash-stats-row { display:flex; align-items:center; justify-content:center; gap:var(--space-6); flex-wrap:wrap; }
        .dash-stat-item { text-align:center; }
        .dash-stat-num { display:block; font-family:var(--font-heading); font-size:var(--text-2xl); font-weight:800; line-height:1; margin-bottom:2px; }
        .dash-stat-div { width:1px; height:40px; background:var(--border); }
        .dashboard-main-grid { display:grid; grid-template-columns:1fr 360px; gap:var(--space-6); padding-block:var(--space-6); }
        .dash-map-panel { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; }
        .dash-map-toolbar { display:flex; align-items:center; justify-content:space-between; padding:var(--space-3) var(--space-5); border-bottom:1px solid var(--border); background:var(--bg-card-hover); flex-wrap:wrap; gap:var(--space-3); }
        .dash-map-container { height:520px; position:relative; }
        .dash-ticket-panel { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; display:flex; flex-direction:column; }
        @media (max-width:1024px) { .dashboard-main-grid{grid-template-columns:1fr} .dash-map-container{height:360px} }
      `}</style>
      <div className="dashboard-root">
        <div className="dashboard-header">
          <div className="container">
            <div className="dashboard-header-inner">
              <div>
                <span className="section-tag">📊 Municipality Dashboard</span>
                <h1 className="heading-md" style={{ marginTop:'var(--space-3)' }}>Road Safety Overview</h1>
              </div>
              <button className="btn btn-outline btn-sm" onClick={handleRefresh}>↻ Refresh Data</button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="dashboard-stats-bar">
          <div className="container">
            <div className="dash-stats-row">
              {STAT_KEYS.map((k, i) => (
                <React.Fragment key={k}>
                  {i > 0 && <div className="dash-stat-div" />}
                  <div className="dash-stat-item">
                    <span className="dash-stat-num" style={{ color: loadingStats ? 'var(--text-muted)' : statColor(k, stats[k]) }}>
                      {loadingStats ? '…' : stats[k] ?? '—'}
                    </span>
                    <span className="text-xs text-muted" style={{ textTransform:'uppercase', letterSpacing:'0.06em' }}>{STAT_LABELS[k]}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="container">
          <div className="dashboard-main-grid">
            <div className="dash-map-panel">
              <div className="dash-map-toolbar">
                <span style={{ fontWeight:700, fontSize:'var(--text-sm)' }}>🗺️ Pothole Map</span>
                <div style={{ display:'flex', alignItems:'center', gap:'var(--space-4)', flexWrap:'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => mapRef.current?.toggleHeatmap()}>🔥 Toggle Heatmap</button>
                  <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
                    {[['#ef4444','High (7-10)'],['#f59e0b','Med (4-6)'],['#22c55e','Low (1-3)']].map(([c,l]) => (
                      <React.Fragment key={l}><div style={{ width:10, height:10, borderRadius:'50%', background:c, flexShrink:0 }} /><span className="text-xs">{l}</span></React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div className="dash-map-container">
                <MapView ref={mapRef} complaints={complaints} />
              </div>
            </div>
            <div className="dash-ticket-panel">
              <TicketList />
            </div>
          </div>
          <HeatmapPanel complaints={complaints} />
        </div>
      </div>
    </>
  );
}