import React from 'react';
import { useNavigate } from 'react-router-dom';

export function SOSButton() {
  const navigate = useNavigate();
  return (
    <button 
      className="btn btn-red btn-lg nav-sos-btn"
      onClick={() => navigate('/sos')}
    >
      🚨 Emergency SOS
    </button>
  );
}

export default SOSButton;
