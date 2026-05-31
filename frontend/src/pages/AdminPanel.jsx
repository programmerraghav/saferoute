import React, { useState, useEffect } from 'react';
import { authFetch } from '../services/auth';

// ── Helpers ────────────────────────────────────────────────────────────────────
function initials(name) {
  return (name || '?').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}
function stringToColor(str) {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

// ── Sections ───────────────────────────────────────────────────────────────────
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

// ── Sections ───────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'overview', icon: '📊', label: 'Report Analytics' },
  { key: 'employees', icon: '👥', label: 'Employees' },
  { key: 'create', icon: '➕', label: 'Create Employee' },
];

// ── Overview & Analytics (Combined) ───────────────────────────────────────────
function OverviewSection({ kpis, complaints, loadingKpis, loadingComplaints, onRefresh, updatingId, onUpdateStatus }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const KPI_DEF = [
    { key: 'total_complaints', icon: '📋', label: 'Total Complaints', color: 'var(--text-primary)' },
    { key: 'resolved', icon: '✅', label: 'Resolved', color: 'var(--accent-green)' },
    { key: 'pending', icon: '⏳', label: 'Pending', color: 'var(--accent-amber)' },
    { key: 'in_progress', icon: '🔧', label: 'In Progress', color: '#60a5fa' },
    { key: 'total_sos_events', icon: '🚨', label: 'SOS Events', color: 'var(--accent-red)' },
    { key: 'avg_severity', icon: '🌡️', label: 'Avg Severity', color: kpis.avg_severity >= 7 ? 'var(--accent-red)' : kpis.avg_severity >= 4 ? 'var(--accent-amber)' : 'var(--accent-green)' },
  ];

  // Process data for Recharts
  const severityCounts = Array.from({ length: 10 }, (_, i) => ({ severity: `Lvl ${i + 1}`, count: 0 }));
  complaints.forEach(c => {
    const sev = Math.min(10, Math.max(1, c.severity || 1));
    severityCounts[sev - 1].count++;
  });

  const statusCounts = { reported: 0, in_progress: 0, resolved: 0 };
  complaints.forEach(c => {
    const status = c.status || 'reported';
    if (statusCounts[status] !== undefined) statusCounts[status]++;
  });
  
  const statusData = [
    { name: 'Pending', value: statusCounts.reported, color: '#ef4444' },
    { name: 'In Progress', value: statusCounts.in_progress, color: '#f59e0b' },
    { name: 'Resolved', value: statusCounts.resolved, color: '#22c55e' },
  ].filter(d => d.value > 0);

  // Group by date for line chart
  const dailyCounts = {};
  complaints.slice().reverse().forEach(c => {
    if (!c.created_at) return;
    const dateStr = new Date(c.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
  });
  const trendData = Object.entries(dailyCounts).map(([date, count]) => ({ date, count })).slice(-10);

  const filtered = statusFilter === 'all' ? complaints : complaints.filter(c => c.status === statusFilter);
  const badgeFor = s => s === 'resolved' ? 'green' : s === 'in_progress' ? 'amber' : 'red';

  const loading = loadingKpis || loadingComplaints;

  return (
    <div className="admin-panel-section">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">📊 System Overview & Analytics</h2>
        <button className="btn btn-outline btn-sm" onClick={onRefresh}>↻ Refresh Dashboard</button>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div style={{ height: 100, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s ease-in-out infinite', marginBottom: 'var(--space-6)' }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          {KPI_DEF.map(k => (
            <div key={k.key} className="card admin-kpi-card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 'var(--space-2)' }}>{k.icon}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 800, lineHeight: 1, marginBottom: 4, color: k.color }}>
                {kpis[k.key] ?? '—'}
              </div>
              <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Analytic Charts using Recharts */}
      {!loading && complaints.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          {/* Severity & Trend Charts */}
          <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>📈 Potholes Reported Trend</h3>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-amber)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--accent-amber)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    <Area type="monotone" dataKey="count" name="Reports" stroke="var(--accent-amber)" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>📊 Pothole Severity Distribution</h3>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={severityCounts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="severity" stroke="var(--text-muted)" fontSize={10} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    <Bar dataKey="count" name="Potholes">
                      {severityCounts.map((entry, index) => {
                        const score = index + 1;
                        const fill = score >= 7 ? '#ef4444' : score >= 4 ? '#f59e0b' : '#22c55e';
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Status Pie Chart */}
          <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>🔧 Resolution Status</h3>
            <div style={{ width: '100%', height: 220, position: 'relative' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: 'var(--text-primary)', fontSize: 12 }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ textAlign: 'center', marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-around' }}>
              <div>
                <span style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--accent-red)' }}>{statusCounts.reported}</span>
                <p className="text-xs text-muted">Pending</p>
              </div>
              <div>
                <span style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--accent-amber)' }}>{statusCounts.in_progress}</span>
                <p className="text-xs text-muted">In Progress</p>
              </div>
              <div>
                <span style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--accent-green)' }}>{statusCounts.resolved}</span>
                <p className="text-xs text-muted">Resolved</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complaints Table (Formerly Standalone AnalyticsSection) */}
      <div className="admin-panel-header" style={{ marginTop: 'var(--space-8)' }}>
        <h2 className="admin-panel-title">📋 Complaint Operations</h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {['all', 'reported', 'in_progress', 'resolved'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`btn btn-sm ${statusFilter === s ? 'btn-amber' : 'btn-ghost'}`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      
      <div className="card admin-analytics-table-wrap">
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
              <div className="spinner" style={{ borderTopColor: 'var(--accent-amber)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>No complaints matches this filter.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr>
                  {['ID', 'Road', 'Severity', 'Type', 'Status', 'Reported By', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.complaint_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <code style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.complaint_id?.substring(0, 10)}…</code>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{c.road_name || '—'}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                      <span className={`badge badge-${c.severity >= 7 ? 'red' : c.severity >= 4 ? 'amber' : 'green'}`}>{c.severity}/10</span>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-muted)' }}>{c.pothole_type || '—'}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <span className={`badge badge-${badgeFor(c.status)}`} style={{ textTransform: 'capitalize' }}>
                        {c.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-muted)' }}>{c.user_name || '—'}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <select value={c.status} disabled={updatingId === c.complaint_id}
                        onChange={e => onUpdateStatus(c.complaint_id, e.target.value)}
                        style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
                        {['reported', 'in_progress', 'resolved'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Employees table ────────────────────────────────────────────────────────────
function EmployeesSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/auth/admin/users').then(r => r.json()).then(d => { setUsers(d.users || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function toggleActive(id, currentActive) {
    try {
      await authFetch(`/api/auth/admin/users/${id}/active`, { method: 'PATCH', body: JSON.stringify({ is_active: !currentActive }) });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !currentActive } : u));
    } catch {}
  }

  async function changeRole(id, role) {
    try {
      await authFetch(`/api/auth/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    } catch {}
  }

  return (
    <div className="admin-panel-section">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">👥 User Management</h2>
        <span className="text-sm text-muted">{users.length} users</span>
      </div>
      <div className="card">
        <div style={{ overflowX:'auto' }}>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'var(--space-10)' }}><div className="spinner" style={{ borderTopColor:'var(--accent-amber)' }} /></div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'var(--text-sm)' }}>
              <thead>
                <tr>{['User','Employee ID','Role','Complaints','Resolved','Rate','Status','Actions'].map(h => (
                  <th key={h} style={{ padding:'var(--space-3) var(--space-4)', textAlign:'left', fontSize:'var(--text-xs)', textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const rate = u.total_assigned > 0 ? Math.round((u.resolved / u.total_assigned) * 100) : 0;
                  return (
                    <tr key={u.id} style={{ borderBottom:'1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding:'var(--space-3) var(--space-4)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
                          <div style={{ width:36, height:36, borderRadius:'50%', background:stringToColor(u.name), display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'var(--text-xs)', color:'white', flexShrink:0 }}>
                            {initials(u.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight:600 }}>{u.name}</div>
                            <div className="text-xs text-muted">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'var(--space-3) var(--space-4)' }}><code style={{ fontSize:'var(--text-xs)', color:'var(--accent-amber)' }}>{u.employee_id || '—'}</code></td>
                      <td style={{ padding:'var(--space-3) var(--space-4)' }}>
                        <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                          style={{ background:'var(--bg-card-hover)', border:'1px solid var(--border)', color:'var(--text-secondary)', padding:'2px 8px', borderRadius:'var(--radius-sm)', fontSize:'var(--text-xs)', cursor:'pointer' }}>
                          <option value="user">User</option>
                          <option value="municipality_employee">Employee</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={{ padding:'var(--space-3) var(--space-4)', textAlign:'center', fontFamily:'var(--font-mono)', fontWeight:700 }}>{u.total_assigned ?? 0}</td>
                      <td style={{ padding:'var(--space-3) var(--space-4)', textAlign:'center', fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--accent-green)' }}>{u.resolved ?? 0}</td>
                      <td style={{ padding:'var(--space-3) var(--space-4)', minWidth:120 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
                          <div style={{ flex:1, height:5, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${rate}%`, background: rate >= 70 ? 'var(--accent-green)' : rate >= 40 ? 'var(--accent-amber)' : 'var(--accent-red)', borderRadius:3, transition:'width 0.8s ease' }} />
                          </div>
                          <span className="text-xs">{rate}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'var(--space-3) var(--space-4)' }}>
                        <span className={`badge badge-${u.is_active ? 'green' : 'red'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td style={{ padding:'var(--space-3) var(--space-4)' }}>
                        <button className="btn btn-xs btn-outline" onClick={() => toggleActive(u.id, u.is_active)} style={{ fontSize:'var(--text-xs)', whiteSpace:'nowrap' }}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create Employee ────────────────────────────────────────────────────────────
function CreateEmployeeSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null); // { employee_id, name }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await authFetch('/api/auth/admin/create-employee', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, phone: phone || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create employee.');
      setSuccess({ employee_id: data.employee_id, name: data.employee?.name || name });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="admin-panel-section">
        <div className="card" style={{ padding:'var(--space-6)', textAlign:'center', maxWidth:480, margin:'0 auto' }}>
          <div style={{ fontSize:'3rem', marginBottom:'var(--space-3)' }}>✅</div>
          <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-2xl)', fontWeight:800, marginBottom:'var(--space-4)' }}>Employee Created!</h2>
          <div style={{ background:'var(--bg-card-hover)', borderRadius:'var(--radius)', padding:'var(--space-4)', marginBottom:'var(--space-4)' }}>
            <p className="text-xs text-muted">Employee ID</p>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-3xl)', fontWeight:800, color:'var(--accent-amber)', letterSpacing:'0.1em', margin:'var(--space-2) 0' }}>{success.employee_id}</p>
            <p className="text-sm text-muted">{success.name}</p>
          </div>
          <p className="text-sm text-muted" style={{ marginBottom:'var(--space-6)' }}>Share this ID securely. The employee will use it to identify their account.</p>
          <button className="btn btn-amber" onClick={() => { setSuccess(null); setName(''); setEmail(''); setPhone(''); setPassword(''); }}>Create Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-section">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">➕ Create Municipality Employee</h2>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:'var(--space-6)' }}>
        <div className="card" style={{ padding:'var(--space-6)' }}>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
            {error && <div style={{ padding:'var(--space-3) var(--space-4)', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--radius)', color:'var(--accent-red)', fontSize:'var(--text-sm)' }}>⚠️ {error}</div>}
            <div><label className="label" htmlFor="emp-name">Full Name *</label><input id="emp-name" type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Priya Sharma" required /></div>
            <div><label className="label" htmlFor="emp-email">Email *</label><input id="emp-email" type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="priya@municipality.gov.in" required /></div>
            <div><label className="label" htmlFor="emp-phone">Phone</label><input id="emp-phone" type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" /></div>
            <div><label className="label" htmlFor="emp-pass">Temporary Password *</label><input id="emp-pass" type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 characters" required minLength={8} /></div>
            <button type="submit" className="btn btn-amber" disabled={loading} style={{ width:'100%', justifyContent:'center' }}>
              {loading ? <><span className="spinner" style={{ width:16, height:16, borderWidth:2, borderTopColor:'#0a0e1a' }} /> Creating…</> : '➕ Create Employee Account'}
            </button>
          </form>
        </div>
        <div className="card" style={{ padding:'var(--space-5)' }}>
          <h3 style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'var(--text-lg)', marginBottom:'var(--space-4)' }}>ℹ️ Employee Privileges</h3>
          <ul style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)', listStyle:'none', padding:0 }}>
            {['View all pothole reports', 'Update complaint status', 'Access dashboard analytics', 'Unique employee ID assigned', 'Cannot create other employees', 'Cannot access admin panel'].map(s => (
              <li key={s} className="text-sm text-muted">• {s}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Panel ───────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState('overview');
  const [kpis, setKpis] = useState({});
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  async function loadKpis() {
    setLoadingKpis(true);
    try {
      const res = await authFetch('/api/dashboard/stats');
      setKpis(await res.json());
    } catch {} finally { setLoadingKpis(false); }
  }

  async function loadComplaints() {
    setLoadingComplaints(true);
    try {
      const res = await authFetch('/api/complaints');
      const data = await res.json();
      setComplaints(data.complaints || []);
    } catch {} finally { setLoadingComplaints(false); }
  }

  async function handleUpdateStatus(id, status) {
    setUpdatingId(id);
    try {
      await authFetch(`/api/complaints/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setComplaints(prev => prev.map(c => c.complaint_id === id ? { ...c, status } : c));
      // Refresh KPIs to update status counts dynamically
      loadKpis();
    } catch {} finally { setUpdatingId(null); }
  }

  function handleRefreshAll() {
    loadKpis();
    loadComplaints();
  }

  useEffect(() => {
    loadKpis();
    loadComplaints();
  }, []);

  return (
    <>
      <style>{`
        .admin-root { display:flex; min-height:100vh; padding-top:68px; }
        .admin-sidebar { width:240px; flex-shrink:0; background:var(--bg-card); border-right:1px solid var(--border); display:flex; flex-direction:column; position:sticky; top:68px; height:calc(100vh - 68px); overflow-y:auto; }
        .admin-sidebar-brand { display:flex; align-items:center; gap:var(--space-3); padding:var(--space-5); border-bottom:1px solid var(--border); margin-bottom:var(--space-4); }
        .admin-nav { display:flex; flex-direction:column; gap:var(--space-1); padding:0 var(--space-3); flex:1; }
        .admin-nav-btn { display:flex; align-items:center; gap:var(--space-3); padding:var(--space-3) var(--space-4); border-radius:var(--radius); font-size:var(--text-sm); font-weight:500; color:var(--text-muted); background:none; border:none; cursor:pointer; transition:var(--transition); text-align:left; }
        .admin-nav-btn:hover { background:var(--bg-card-hover); color:var(--text-primary); }
        .admin-nav-btn.active { background:rgba(245,158,11,0.1); color:var(--accent-amber); font-weight:600; }
        .admin-main { flex:1; overflow-x:hidden; }
        .admin-panel-section { padding:var(--space-8); }
        .admin-panel-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-6); flex-wrap:wrap; gap:var(--space-3); }
        .admin-panel-title { font-family:var(--font-heading); font-size:var(--text-2xl); font-weight:800; }
        @media (max-width:1024px) { .admin-root{flex-direction:column} .admin-sidebar{width:100%;height:auto;position:static;flex-direction:row;flex-wrap:wrap;padding:var(--space-3)} .admin-nav{flex-direction:row;flex-wrap:wrap} }
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
      `}</style>
      <div className="admin-root">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-brand">
            <span style={{ fontSize:'1.8rem' }}>🏛️</span>
            <div>
              <div style={{ fontFamily:'var(--font-heading)', fontWeight:700 }}>Admin Panel</div>
              <div className="text-xs text-muted">SafeRoute System</div>
            </div>
          </div>
          <nav className="admin-nav">
            {NAV_ITEMS.map(item => (
              <button key={item.key} className={`admin-nav-btn${activeSection === item.key ? ' active' : ''}`} onClick={() => setActiveSection(item.key)}>
                <span>{item.icon}</span><span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div style={{ padding:'var(--space-4) var(--space-5)', borderTop:'1px solid var(--border)' }}>
            <p className="text-xs text-muted">SafeRoute Admin v1.0</p>
          </div>
        </aside>
        <main className="admin-main">
          {activeSection === 'overview' && (
            <OverviewSection
              kpis={kpis}
              complaints={complaints}
              loadingKpis={loadingKpis}
              loadingComplaints={loadingComplaints}
              onRefresh={handleRefreshAll}
              updatingId={updatingId}
              onUpdateStatus={handleUpdateStatus}
            />
          )}
          {activeSection === 'employees' && <EmployeesSection />}
          {activeSection === 'create' && <CreateEmployeeSection />}
        </main>
      </div>
    </>
  );
}