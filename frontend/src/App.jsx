import React, { useEffect, useState } from 'react';
import { AppRouter } from './router';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    // Fetch global config from backend
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        window.__SAFEROUTE_CONFIG__ = {
          defaultLat: data.maps_default?.lat || 20.5937,
          defaultLng: data.maps_default?.lng || 78.9629,
          alertRadiusCar: 5,
          alertRadiusBike: 2,
        };
        setConfig(data);
      })
      .catch(err => {
        console.error('Failed to fetch config', err);
        // Fallback config so app doesn't hang
        window.__SAFEROUTE_CONFIG__ = {
          defaultLat: 20.5937,
          defaultLng: 78.9629,
          alertRadiusCar: 5,
          alertRadiusBike: 2,
        };
        setConfig({});
      });
  }, []);

  if (!config) {
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'var(--bg-primary)' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
