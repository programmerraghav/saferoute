/**
 * frontend/src/components/MapView.js
 * Google Maps integration with pothole markers and heatmap layer.
 * Reads API key from data-maps-key attribute on #app element.
 */

let _mapsLoaded = false;
let _mapsLoadPromise = null;

export function loadGoogleMaps() {
  if (_mapsLoaded) return Promise.resolve();
  if (_mapsLoadPromise) return _mapsLoadPromise;

  _mapsLoadPromise = new Promise((resolve, reject) => {
    const apiKey = document.getElementById('app')?.dataset.mapsKey || '';
    if (!apiKey) {
      console.warn('[MapView] No Google Maps API key found on #app data-maps-key attribute.');
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization`;
    script.async = true;
    script.defer = true;
    script.onload = () => { _mapsLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load Google Maps API.'));
    document.head.appendChild(script);
  });

  return _mapsLoadPromise;
}

/**
 * Create and mount a Google Map with pothole markers.
 *
 * @param {HTMLElement} container - Element to render the map into.
 * @param {object[]} complaints   - Array of complaint objects.
 * @param {object} defaultCenter  - { lat, lng } default center.
 * @returns {Promise<{ map, markers, heatmapLayer, refresh }>}
 */
export async function createMapView(container, complaints = [], defaultCenter = { lat: 20.3893, lng: 72.9106 }) {
  await loadGoogleMaps();

  container.style.height = '100%';
  container.style.minHeight = '480px';
  container.style.borderRadius = 'var(--radius-lg)';
  container.style.overflow = 'hidden';

  const map = new google.maps.Map(container, {
    center: defaultCenter,
    zoom: 13,
    styles: darkMapStyles(),
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  const markers = [];
  const heatmapData = [];
  const infoWindow = new google.maps.InfoWindow();

  function addMarkers(list) {
    markers.forEach((m) => m.setMap(null));
    markers.length = 0;
    heatmapData.length = 0;

    list.forEach((c) => {
      if (!c.location_coords?.lat) return;

      const lat = c.location_coords.lat;
      const lng = c.location_coords.lng;
      const color = c.severity >= 7 ? '#ef4444' : c.severity >= 4 ? '#f59e0b' : '#22c55e';

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10 + c.severity,
          fillColor: color,
          fillOpacity: 0.85,
          strokeColor: 'white',
          strokeWeight: 2,
        },
        title: c.complaint_id,
      });

      marker.addListener('click', () => {
        const sev = c.severity >= 7 ? 'HIGH 🔴' : c.severity >= 4 ? 'MEDIUM 🟡' : 'LOW 🟢';
        infoWindow.setContent(`
          <div style="font-family:sans-serif;max-width:260px;padding:4px">
            <div style="font-size:11px;color:#666;margin-bottom:4px">${c.complaint_id}</div>
            <div style="font-weight:600;font-size:14px;margin-bottom:6px">${c.road_name || 'Unknown Road'}</div>
            <div style="margin-bottom:4px"><strong>Severity:</strong> ${c.severity}/10 — ${sev}</div>
            <div style="margin-bottom:4px"><strong>Type:</strong> ${c.pothole_type || '—'}</div>
            <div style="margin-bottom:4px"><strong>Status:</strong> ${c.status}</div>
            <div style="font-size:11px;color:#666">${new Date(c.created_at).toLocaleDateString('en-IN')}</div>
          </div>
        `);
        infoWindow.open(map, marker);
      });

      markers.push(marker);
      heatmapData.push({ location: new google.maps.LatLng(lat, lng), weight: c.severity });
    });
  }

  addMarkers(complaints);

  // Heatmap layer
  const heatmapLayer = new google.maps.visualization.HeatmapLayer({
    data: heatmapData,
    map: null, // off by default
    radius: 30,
    gradient: ['transparent', '#22c55e', '#f59e0b', '#ef4444'],
  });

  return {
    map,
    markers,
    heatmapLayer,
    refresh: (newComplaints) => addMarkers(newComplaints),
    toggleHeatmap: () => {
      heatmapLayer.setMap(heatmapLayer.getMap() ? null : map);
    },
  };
}

function darkMapStyles() {
  return [
    { elementType: 'geometry', stylers: [{ color: '#0d1220' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1220' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1e3a5f' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ];
}
