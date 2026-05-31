import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

import { useTheme } from '../contexts/ThemeContext';

// ─── Leaflet icon helpers (same as MapView) ────────────────────────────────────
function potholeIcon(severity) {
  const color = severity >= 7 ? '#ef4444' : severity >= 4 ? '#f59e0b' : '#22c55e';
  const size = 12 + severity;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size*2}" height="${size*2}"><circle cx="${size}" cy="${size}" r="${size-2}" fill="${color}" fill-opacity="0.85" stroke="white" stroke-width="2"/></svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [size*2,size*2], iconAnchor: [size,size], popupAnchor: [0,-size] });
}

function popupHtml(c) {
  const sev = c.severity >= 7 ? 'HIGH 🔴' : c.severity >= 4 ? 'MEDIUM 🟡' : 'LOW 🟢';
  const date = c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—';
  const tenderDateStr = c.tender_date ? new Date(c.tender_date).toLocaleDateString('en-IN') : '—';
  return `<div style="font-family:-apple-system,sans-serif;min-width:220px;padding:4px">
    <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;font-family:monospace">${c.complaint_id||'—'}</div>
    <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:var(--text-primary)">${c.road_name||'Unknown Road'}</div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px"><b style="color:var(--text-primary)">Severity:</b> ${c.severity}/10 — ${sev}</div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px"><b style="color:var(--text-primary)">Status:</b> <span style="text-transform:capitalize">${c.status||'—'}</span></div>
    <hr style="border:none;border-top:1px solid var(--border);margin:6px 0" />
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">🏗️ <b style="color:var(--text-primary)">Contractor:</b> ${c.contractor_name||'N/A'}</div>
    <div style="font-size:11px;color:var(--text-muted)">📅 <b style="color:var(--text-primary)">Tender:</b> ${tenderDateStr} (${c.tender_amount||'N/A'})</div>
    <div style="font-size:10px;color:#6b7280;margin-top:8px">📅 Reported: ${date}</div>
  </div>`;
}

// ─── Feed Item ─────────────────────────────────────────────────────────────────
function FeedItem({ complaint, isNew }) {
  const c = complaint;
  const color = c.severity >= 7 ? '#ef4444' : c.severity >= 4 ? '#f59e0b' : '#22c55e';
  const timeStr = c.created_at ? new Date(c.created_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '';
  const tenderDateStr = c.tender_date ? new Date(c.tender_date).toLocaleDateString('en-IN') : '—';
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:'var(--space-3)', padding:'var(--space-3) var(--space-4)', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background 0.2s', background: isNew ? 'rgba(245,158,11,0.05)' : 'transparent' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = isNew ? 'rgba(245,158,11,0.05)' : 'transparent'}>
      <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0, marginTop:4 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'var(--text-xs)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:4 }}>{c.road_name || 'Unknown Road'}</div>
        <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:6, display:'flex', flexDirection:'column', gap:1 }}>
          <div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>🏗️ <b>Contractor:</b> {c.contractor_name || 'N/A'}</div>
          <div>📅 <b>Tender Date:</b> {tenderDateStr} ({c.tender_amount || 'N/A'})</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', flexWrap:'wrap' }}>
          <span className={`badge badge-${c.severity >= 7 ? 'red' : c.severity >= 4 ? 'amber' : 'green'}`} style={{ fontSize:9 }}>{c.severity}/10</span>
          <span style={{ fontSize:9, color:'var(--text-muted)' }}>{timeStr}</span>
          {isNew && <span style={{ fontSize:8, fontWeight:800, color:'var(--accent-amber)', border:'1px solid var(--accent-amber)', padding:'1px 4px', borderRadius:3 }}>NEW</span>}
        </div>
      </div>
    </div>
  );
}

export default function NearbyMap() {
  const { theme } = useTheme();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerLayerRef = useRef(null);
  const heatLayerRef = useRef(null);
  const wsRef = useRef(null);
  const [allComplaints, setAllComplaints] = useState([]);
  const [newIds, setNewIds] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState('all');
  const [heatmapOn, setHeatmapOn] = useState(false);
  const [wsStatus, setWsStatus] = useState('connecting'); // connecting | live | disconnected
  const [userLocation, setUserLocation] = useState(null);
  const [gpsError, setGpsError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [count, setCount] = useState(0);

  const FILTERS = [
    { key: 'all', label: '🔴 All' },
    { key: 'high', label: '🔴 High (7-10)' },
    { key: 'medium', label: '🟡 Medium (4-6)' },
    { key: 'low', label: '🟢 Low (1-3)' },
  ];

  const filterComplaints = useCallback((list) => {
    if (activeFilter === 'high') return list.filter(c => c.severity >= 7);
    if (activeFilter === 'medium') return list.filter(c => c.severity >= 4 && c.severity < 7);
    if (activeFilter === 'low') return list.filter(c => c.severity < 4);
    return list;
  }, [activeFilter]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    navigator.geolocation?.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { setGpsError(true); setUserLocation({ lat: 20.3893, lng: 72.9106 }); }
    );

    const center = window.__SAFEROUTE_CONFIG__ ? [window.__SAFEROUTE_CONFIG__.defaultLat, window.__SAFEROUTE_CONFIG__.defaultLng] : [20.3893, 72.9106];
    const map = L.map(mapRef.current, { center, zoom: 14 });
    
    const tileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      attribution: '© OpenStreetMap © CARTO', maxZoom: 19, subdomains: 'abcd'
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Theme-adaptive popup styles
    if (!document.getElementById('leaflet-theme-styles')) {
      const s = document.createElement('style');
      s.id = 'leaflet-theme-styles';
      s.textContent = `
        .sr-popup .leaflet-popup-content-wrapper {
          background: var(--bg-card);
          color: var(--text-primary);
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        .sr-popup .leaflet-popup-tip {
          background: var(--bg-card);
        }
        .leaflet-control-attribution {
          background: var(--bg-card-hover) !important;
          color: var(--text-muted) !important;
          font-size: 10px !important;
        }
        .leaflet-bar a {
          background: var(--bg-card) !important;
          color: var(--text-primary) !important;
          border-color: var(--border) !important;
        }
        .leaflet-bar a:hover {
          background: var(--bg-card-hover) !important;
          color: var(--accent-amber) !important;
        }
      `;
      document.head.appendChild(s);
    }

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, []);

  // Sync theme changes with leaflet tile layer
  useEffect(() => {
    if (tileLayerRef.current) {
      const tileUrl = theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      tileLayerRef.current.setUrl(tileUrl);
    }
  }, [theme]);

  // Fetch initial complaints
  useEffect(() => {
    fetch('/api/complaints')
      .then(r => r.json())
      .then(d => setAllComplaints(d.complaints || []))
      .catch(() => {});
  }, []);

  // Update markers when complaints or filter changes
  useEffect(() => {
    if (!mapReady || !markerLayerRef.current) return;
    const map = mapInstanceRef.current;
    markerLayerRef.current.clearLayers();
    if (heatLayerRef.current) { map.removeLayer(heatLayerRef.current); heatLayerRef.current = null; }

    const filtered = filterComplaints(allComplaints);
    setCount(filtered.length);

    const heatData = filtered.filter(c => c.location_coords?.lat).map(c => [c.location_coords.lat, c.location_coords.lng, c.severity / 10]);
    const heatLayerFn = L.heatLayer || window.L?.heatLayer;
    if (heatData.length && heatLayerFn) {
      heatLayerRef.current = heatLayerFn(heatData, { radius: 30, blur: 20, gradient: { 0: '#22c55e', 0.5: '#f59e0b', 1: '#ef4444' } });
      if (heatmapOn) heatLayerRef.current.addTo(map);
    }

    filtered.forEach(c => {
      if (!c.location_coords?.lat) return;
      L.marker([c.location_coords.lat, c.location_coords.lng], { icon: potholeIcon(c.severity || 1) })
        .bindPopup(popupHtml(c), { maxWidth: 280, className: 'sr-popup' })
        .addTo(markerLayerRef.current);
    });
  }, [allComplaints, activeFilter, mapReady, filterComplaints, heatmapOn]);

  // WebSocket
  useEffect(() => {
    if (!mapReady) return;
    let retryTimer;
    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/potholes`);
      wsRef.current = ws;
      ws.onopen = () => setWsStatus('live');
      ws.onclose = () => { setWsStatus('disconnected'); retryTimer = setTimeout(connect, 5000); };
      ws.onerror = () => setWsStatus('disconnected');
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'new_complaint') {
            const c = data.complaint;
            setAllComplaints(prev => [c, ...prev]);
            setNewIds(prev => new Set([...prev, c.complaint_id]));
            setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(c.complaint_id); return n; }), 5000);
            // Add bounce marker
            if (c.location_coords?.lat && markerLayerRef.current) {
              const marker = L.marker([c.location_coords.lat, c.location_coords.lng], { icon: potholeIcon(c.severity || 1) })
                .bindPopup(popupHtml(c), { maxWidth: 280, className: 'sr-popup' })
                .addTo(markerLayerRef.current);
              const el = marker.getElement();
              if (el) { el.style.animation = 'none'; el.style.transform = 'scale(1.4)'; setTimeout(() => { el.style.transition = 'transform 0.3s'; el.style.transform = 'scale(1)'; }, 0); }
            }
          }
        } catch {}
      };
    }
    connect();
    return () => { clearTimeout(retryTimer); wsRef.current?.close(); };
  }, [mapReady]);

  function toggleHeatmap() {
    setHeatmapOn(h => {
      const next = !h;
      const map = mapInstanceRef.current;
      if (heatLayerRef.current && map) {
        if (next) heatLayerRef.current.addTo(map);
        else map.removeLayer(heatLayerRef.current);
      }
      return next;
    });
  }

  function centerOnUser() {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15, { animate: true });
    }
  }

  const wsColors = { live: 'var(--accent-green)', connecting: 'var(--accent-amber)', disconnected: 'var(--accent-red)' };
  const wsBg = { live: 'rgba(34,197,94,0.1)', connecting: 'rgba(245,158,11,0.1)', disconnected: 'rgba(239,68,68,0.1)' };
  const wsBorder = { live: 'rgba(34,197,94,0.3)', connecting: 'rgba(245,158,11,0.3)', disconnected: 'rgba(239,68,68,0.3)' };
  const wsLabel = { live: '🟢 LIVE', connecting: '🟡 Connecting…', disconnected: '🔴 Offline' };

  return (
    <>
      <style>{`
        .nm-root { display:flex; flex-direction:column; height:calc(100vh - 68px); margin-top:68px; background:var(--bg-primary); }
        .nm-header { background:var(--bg-card); border-bottom:1px solid var(--border); padding-block:var(--space-4); flex-shrink:0; z-index:10; }
        .nm-header-inner { display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-4); flex-wrap:wrap; }
        .nm-controls { display:flex; align-items:center; gap:var(--space-3); flex-wrap:wrap; }
        .nm-chip { padding:var(--space-1) var(--space-3); border-radius:var(--radius-full); font-size:var(--text-xs); font-weight:600; background:var(--bg-card-hover); border:1px solid var(--border); color:var(--text-muted); cursor:pointer; transition:var(--transition); }
        .nm-chip:hover,.nm-chip.active { background:rgba(245,158,11,0.1); border-color:var(--accent-amber); color:var(--accent-amber); }
        .nm-map-wrap { flex:1; display:flex; overflow:hidden; }
        .nm-map-container { flex:1; position:relative; }
        .nm-sidebar { width:300px; flex-shrink:0; background:var(--bg-card); border-left:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; }
        .nm-feed { flex:1; overflow-y:auto; display:flex; flex-direction:column; }
        @media (max-width:768px) { .nm-map-wrap{flex-direction:column} .nm-sidebar{width:100%;height:220px;border-left:none;border-top:1px solid var(--border)} }
      `}</style>
      <div className="nm-root">
        {/* Header */}
        <div className="nm-header">
          <div className="container">
            <div className="nm-header-inner">
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'var(--space-4)', marginBottom:4 }}>
                  <h1 style={{ fontFamily:'var(--font-heading)', fontSize:'var(--text-xl)', fontWeight:800 }}>🗺️ Nearby Pothole Map</h1>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:'var(--space-2)', padding:'3px var(--space-3)', borderRadius:'var(--radius-full)', fontSize:'var(--text-xs)', fontWeight:600, background: wsBg[wsStatus], border:`1px solid ${wsBorder[wsStatus]}`, color: wsColors[wsStatus] }}>
                    {wsLabel[wsStatus]}
                  </span>
                </div>
                <p className="text-xs text-muted">{count} pothole{count !== 1 ? 's' : ''} nearby</p>
              </div>
              <div className="nm-controls">
                <div style={{ display:'flex', gap:'var(--space-2)', flexWrap:'wrap' }}>
                  {FILTERS.map(f => (
                    <button key={f.key} className={`nm-chip${activeFilter === f.key ? ' active' : ''}`} onClick={() => setActiveFilter(f.key)}>{f.label}</button>
                  ))}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={centerOnUser}>📍 My Location</button>
                <button className={`btn btn-sm ${heatmapOn ? 'btn-amber' : 'btn-ghost'}`} onClick={toggleHeatmap}>🔥 Heatmap</button>
              </div>
            </div>
          </div>
          {gpsError && (
            <div style={{ padding:'var(--space-2) var(--space-6)', background:'rgba(245,158,11,0.1)', borderTop:'1px solid rgba(245,158,11,0.2)', fontSize:'var(--text-xs)', color:'var(--accent-amber)' }}>
              ⚠️ GPS unavailable — showing default location (Vapi, Gujarat).
            </div>
          )}
        </div>

        {/* Map + Sidebar */}
        <div className="nm-map-wrap">
          <div className="nm-map-container">
            <div ref={mapRef} style={{ height:'100%', width:'100%' }} />
          </div>
          <div className="nm-sidebar">
            <div style={{ padding:'var(--space-3) var(--space-4)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700, fontSize:'var(--text-sm)' }}>Live Feed</span>
              <span className="text-xs text-muted">{count} results</span>
            </div>
            <div className="nm-feed">
              {filterComplaints(allComplaints).length === 0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, gap:'var(--space-2)' }}>
                  <span style={{ fontSize:'2rem' }}>🎉</span>
                  <p className="text-xs text-muted">No potholes in this category</p>
                </div>
              ) : (
                filterComplaints(allComplaints).map(c => (
                  <FeedItem key={c.complaint_id} complaint={c} isNew={newIds.has(c.complaint_id)} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}