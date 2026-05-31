/**
 * EmergencyModal — Full-screen crash confirmation overlay
 *
 * Displays when a potential crash is detected. Features:
 *  - Pulsating red border / background
 *  - Large countdown timer
 *  - "I'm Safe" and "Send Help Now" buttons
 *  - Impossible to miss — covers entire viewport
 */

import React from 'react';
import type { SOSResponse } from '../types';
import './EmergencyModal.css';

interface EmergencyModalProps {
  countdown: number;
  sosResponse: SOSResponse | null;
  isSOSTriggered: boolean;
  onCancel: () => void;
  onSendNow: () => void;
  onDismiss: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  countdown,
  sosResponse,
  isSOSTriggered,
  onCancel,
  onSendNow,
  onDismiss,
}) => {
  // After SOS is triggered, show confirmation screen
  if (isSOSTriggered && sosResponse) {
    return (
      <div className="emergency-overlay emergency-overlay--sent" id="emergency-modal">
        <div className="emergency-card emergency-card--sent">
          <div className="emergency-icon-sent">
            {sosResponse.success ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
          </div>

          <h1 className="emergency-title--sent">
            {sosResponse.success ? 'SOS Alert Sent' : 'Alert Failed'}
          </h1>

          <p className="emergency-message--sent">
            {sosResponse.success
              ? 'Emergency services have been notified. Help is on the way.'
              : sosResponse.message}
          </p>

          {sosResponse.alertId && (
            <div className="emergency-alert-id">
              Alert ID: <strong>{sosResponse.alertId}</strong>
            </div>
          )}

          {sosResponse.estimatedResponseTime && (
            <div className="emergency-eta">
              Estimated response: ~{Math.ceil(sosResponse.estimatedResponseTime / 60)} min
            </div>
          )}

          {!sosResponse.success && (
            <p className="emergency-fallback">
              ⚠ Please call <strong>emergency services</strong> directly.
            </p>
          )}

          <button
            className="emergency-btn emergency-btn--dismiss"
            onClick={onDismiss}
            id="dismiss-btn"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Countdown / confirmation screen
  return (
    <div className="emergency-overlay" id="emergency-modal">
      <div className="emergency-card">
        {/* Pulsing warning icon */}
        <div className="emergency-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h1 className="emergency-title">Possible Accident Detected</h1>
        <p className="emergency-subtitle">Are you okay?</p>

        {/* Countdown ring */}
        <div className="countdown-container">
          <svg className="countdown-ring" viewBox="0 0 120 120">
            <circle
              className="countdown-ring__bg"
              cx="60"
              cy="60"
              r="52"
            />
            <circle
              className="countdown-ring__progress"
              cx="60"
              cy="60"
              r="52"
              style={{
                strokeDasharray: `${2 * Math.PI * 52}`,
                strokeDashoffset: `${2 * Math.PI * 52 * (1 - countdown / 15)}`,
              }}
            />
          </svg>
          <span className="countdown-number">{countdown}</span>
          <span className="countdown-label">seconds</span>
        </div>

        <p className="emergency-auto-text">
          SOS will be sent automatically when timer reaches zero
        </p>

        {/* Action buttons */}
        <div className="emergency-actions">
          <button
            className="emergency-btn emergency-btn--safe"
            onClick={onCancel}
            id="im-safe-btn"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
            I'm Safe
          </button>

          <button
            className="emergency-btn emergency-btn--help"
            onClick={onSendNow}
            id="send-help-btn"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            Send Help Now
          </button>
        </div>
      </div>
    </div>
  );
};
