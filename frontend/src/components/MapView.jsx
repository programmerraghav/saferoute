import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

function potholeIcon(severity) {
  const color = severity >= 7 ? '#ef4444' : severity >= 4 ? '#f59e0b' : '#22c55e';
  const size = 12 + severity;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2}">
      <circle cx="${size}" cy="${size}" r="${size - 2}"
        fill="${color}" fill-opacity="0.85"
        stroke="white" stroke-width="2"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
    popupAnchor: [0, -size],
  });
}

function popupHtml(c) {
  const sev = c.severity >= 7 ? 'HIGH 🔴' : c.severity >= 4 ? 'MEDIUM 🟡' : 'LOW 🟢';
  const date = c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—';
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:200px;padding:4px">
      <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;font-family:monospace">${c.complaint_id || '—'}</div>
      <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#f3f4f6">${c.road_name || 'Unknown Road'}</div>
      <div style="font-size:12px;margin-bottom:3px;color:#d1d5db"><b style="color:#f3f4f6">Severity:</b> ${c.severity}/10 — ${sev}</div>
      <div style="font-size:12px;margin-bottom:3px;color:#d1d5db"><b style="color:#f3f4f6">Type:</b> ${c.pothole_type || '—'}</div>
      <div style="font-size:12px;margin-bottom:3px;color:#d1d5db"><b style="color:#f3f4f6">Status:</b> <span style="text-transform:capitalize">${c.status || '—'}</span></div>
      ${c.description ? `<div style="font-size:11px;color:#9ca3af;margin-top:4px">${c.description}</div>` : ''}
      <div style="font-size:10px;color:#6b7280;margin-top:6px">📅 ${date}</div>
    </div>`;
}

export const MapView = forwardRef(({ complaints = [], center = { lat: 20.3893, lng: 72.9106 } }, ref) => {
  const hasFitRef = useRef(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerLayerRef = useRef(null);
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    const tileLayer = L.tileLayer(TILE_LAYERS.dark.url, {
      attribution: TILE_LAYERS.dark.attribution,
      maxZoom: TILE_LAYERS.dark.maxZoom,
      subdomains: 'abcd',
    });

    tileLayer.on('tileerror', () => {
      L.tileLayer(TILE_LAYERS.osm.url, {
        attribution: TILE_LAYERS.osm.attribution,
        maxZoom: TILE_LAYERS.osm.maxZoom,
      }).addTo(map);
    });

    tileLayer.addTo(map);

    const markerLayer = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markerLayerRef.current = markerLayer;

    // Auto-focus on User's Current GPS Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], 15);
            
            // Add a clean modern pulsing user location marker
            L.circle([latitude, longitude], {
              radius: 60,
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.15,
              weight: 1
            }).addTo(mapInstanceRef.current);
            
            L.circleMarker([latitude, longitude], {
              radius: 7,
              color: '#ffffff',
              fillColor: '#3b82f6',
              fillOpacity: 1,
              weight: 2
            }).addTo(mapInstanceRef.current).bindPopup('<b>Your Location</b>');
          }
        },
        (err) => {
          console.warn('[MapView] Geolocation error, using default focus:', err.message);
        }
      );
    }

    // Add styles manually if not present
    if (!document.getElementById('leaflet-dark-styles')) {
      const style = document.createElement('style');
      style.id = 'leaflet-dark-styles';
      style.textContent = `
        .sr-popup .leaflet-popup-content-wrapper { background: #111827; color: #f3f4f6; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
        .sr-popup .leaflet-popup-tip { background: #111827; }
        .sr-popup .leaflet-popup-close-button { color: #9ca3af !important; }
        .sr-popup .leaflet-popup-close-button:hover { color: #f3f4f6 !important; background: none !important; }
        .leaflet-control-attribution { background: rgba(10,14,26,0.8) !important; color: #6b7280 !important; font-size: 10px !important; }
        .leaflet-control-attribution a { color: #9ca3af !important; }
        .leaflet-bar a { background: #111827 !important; color: #f3f4f6 !important; border-color: rgba(255,255,255,0.1) !important; }
        .leaflet-bar a:hover { background: #1f2937 !important; color: #f59e0b !important; }
        @keyframes sr-bounce { 0%,100% { transform: translateY(0); } 30% { transform: translateY(-14px); } 60% { transform: translateY(-6px); } }
        .sr-marker-bounce { animation: sr-bounce 0.6s ease 3; }
      `;
      document.head.appendChild(style);
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !markerLayerRef.current) return;
    
    markerLayerRef.current.clearLayers();
    if (heatLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    const heatData = complaints
      .filter((c) => c.location_coords?.lat)
      .map((c) => [c.location_coords.lat, c.location_coords.lng, c.severity / 10]);

    if (heatData.length && window.L.heatLayer) {
      heatLayerRef.current = window.L.heatLayer(heatData, {
        radius: 30,
        blur: 20,
        maxZoom: 17,
        gradient: { 0.0: '#22c55e', 0.5: '#f59e0b', 1.0: '#ef4444' },
      });
    }

    complaints.forEach((c) => {
      if (!c.location_coords?.lat) return;
      const marker = L.marker(
        [c.location_coords.lat, c.location_coords.lng],
        { icon: potholeIcon(c.severity || 1) }
      );
      marker.bindPopup(popupHtml(c), { maxWidth: 280, className: 'sr-popup' });
      marker.addTo(markerLayerRef.current);
    });

    // Auto-focus to complaints bounds on load
    if (complaints.length > 0 && !hasFitRef.current) {
      const validCoords = complaints
        .filter((c) => c.location_coords?.lat && c.location_coords?.lng)
        .map((c) => [c.location_coords.lat, c.location_coords.lng]);

      if (validCoords.length > 0) {
        mapInstanceRef.current.fitBounds(validCoords, { padding: [50, 50], maxZoom: 15 });
        hasFitRef.current = true;
      }
    }
  }, [complaints]);

  useImperativeHandle(ref, () => ({
    get map() { return mapInstanceRef.current; },
    get heatLayer() { return heatLayerRef.current; },
    toggleHeatmap: () => {
      if (!heatLayerRef.current) return;
      if (mapInstanceRef.current.hasLayer(heatLayerRef.current)) {
        mapInstanceRef.current.removeLayer(heatLayerRef.current);
      } else {
        heatLayerRef.current.addTo(mapInstanceRef.current);
      }
    },
    addMarker: (c, animate = false) => {
      if (!c.location_coords?.lat || !markerLayerRef.current) return;
      const marker = L.marker(
        [c.location_coords.lat, c.location_coords.lng],
        { icon: potholeIcon(c.severity || 1) }
      );
      marker.bindPopup(popupHtml(c), { maxWidth: 280, className: 'sr-popup' });
      marker.addTo(markerLayerRef.current);
      if (animate) {
        const el = marker.getElement();
        if (el) {
          el.classList.add('sr-marker-bounce');
          setTimeout(() => el.classList.remove('sr-marker-bounce'), 2500);
        }
      }
      return marker;
    }
  }));

  return (
    <div 
      ref={mapContainerRef} 
      style={{ height: '100%', minHeight: '480px', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
    />
  );
});

export default MapView;
