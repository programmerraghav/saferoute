import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn, hasRole } from './services/auth';
import { Navbar } from './components/Navbar';
import VoiceWidget from './components/VoiceWidget';

import Home from './pages/Home';
import Login from './pages/Login';
import ReportPothole from './pages/ReportPothole';
import SOS from './pages/SOS';
import NearbyMap from './pages/NearbyMap';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import VoiceAgent from './pages/VoiceAgent';

const ProtectedRoute = ({ children, roles }) => {
  const [isAuth, setIsAuth] = useState(isLoggedIn());
  
  useEffect(() => {
    setIsAuth(isLoggedIn());
  }, []);

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  
  if (roles && roles.length > 0) {
    if (!hasRole(...roles)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/sos" element={<SOS />} />
        <Route path="/nearby-map" element={<NearbyMap />} />
        <Route path="/voice-agent" element={<VoiceAgent />} />
        
        <Route path="/report" element={
          <ProtectedRoute>
            <ReportPothole />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute roles={['admin', 'municipality_employee']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <AdminPanel />
          </ProtectedRoute>
        } />
      </Routes>
      {/* Floating voice widget — persists across all pages */}
      <VoiceWidget />
    </BrowserRouter>
  );
};
