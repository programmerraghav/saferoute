/**
 * StatusDashboard — Main monitoring interface
 *
 * Displays real-time GPS data, speed gauge, detection state,
 * and a scrollable log panel.
 */

import React, { useRef, useEffect } from 'react';
import type {
  GeoPosition,
  LocationRecord,
  LogEntry,
  SpeedTrend,
} from '../types';
import { DetectionState } from '../types';
import { formatCoordinates, formatSpeed } from '../utils/geo';

interface StatusDashboardProps {
  state: DetectionState;
  position: GeoPosition | null;
  speed: number;
  speedTrend: SpeedTrend | null;
  logs: LogEntry[];
  locationHistory: LocationRecord[];
  permission: string;
  error: string | null;
  isWatching: boolean;
  onStart: () => void;
  onStop: () => void;
}

/* ── State display helpers ── */

const STATE_META: Record<DetectionState, { label: string; color: string; icon: string }> = {
  [DetectionState.INITIALIZING]:          { label: 'Initializing',        color: '#94a3b8', icon: '◌' },
  [DetectionState.MONITORING]:            { label: 'Monitoring',          color: '#22c55e', icon: '◉' },
  [DetectionState.SUDDEN_STOP_DETECTED]:  { label: 'Sudden Stop!',       color: '#f97316', icon: '⚠' },
  [DetectionState.STATIONARY_CHECK]:      { label: 'Stationary Check',   color: '#eab308', icon: '◎' },
  [DetectionState.CONFIRMATION_COUNTDOWN]:{ label: 'Confirm Countdown',  color: '#ef4444', icon: '🚨'},
  [DetectionState.SOS_TRIGGERED]:         { label: 'SOS Triggered',      color: '#ef4444', icon: '🆘'},
  [DetectionState.CANCELLED]:             { label: 'Cancelled',          color: '#22c55e', icon: '✓' },
  [DetectionState.PERMISSION_DENIED]:     { label: 'Permission Denied',  color: '#ef4444', icon: '✕' },
  [DetectionState.ERROR]:                 { label: 'Error',              color: '#ef4444', icon: '✕' },
  [DetectionState.PAUSED]:                { label: 'Paused',             color: '#94a3b8', icon: '⏸' },
};

const LOG_COLORS: Record<string, string> = {
  info: '#94a3b8',
  warn: '#eab308',
  error: '#ef4444',
  critical: '#f87171',
};

export const StatusDashboard: React.FC<StatusDashboardProps> = ({
  state,
  position,
  speed,
  speedTrend,
  logs,
  locationHistory,
  permission,
  error,
  isWatching,
  onStart,
  onStop,
}) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const meta = STATE_META[state];

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  /* ── Speed gauge arc calculation ── */
  const maxDisplaySpeed = 120;
  const clampedSpeed = Math.min(speed, maxDisplaySpeed);
  const arcFraction = clampedSpeed / maxDisplaySpeed;
  const arcRadius = 80;
  const arcCircumference = Math.PI * arcRadius; // Half circle
  const arcOffset = arcCircumference * (1 - arcFraction);

  const speedColor =
    speed > 50 ? '#ef4444' :
    speed > 25 ? '#f97316' :
    speed > 5  ? '#22c55e' :
    '#64748b';

  return (
    <div className="dashboard">
      {/* ── Header ── */}
      <header className="dashboard-header">
        <div className="dashboard-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h1>SOS Crash Detection</h1>
        </div>

        <button
          className={`dashboard-toggle ${isWatching ? 'dashboard-toggle--active' : ''}`}
          onClick={isWatching ? onStop : onStart}
          id="toggle-monitoring-btn"
        >
          <span className={`toggle-dot ${isWatching ? 'toggle-dot--on' : ''}`} />
          {isWatching ? 'Monitoring' : 'Start'}
        </button>
      </header>

      {/* ── Error Banner ── */}
      {error && (
        <div className="dashboard-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="dashboard-grid">
        {/* Speed Gauge */}
        <div className="card card--speed">
          <div className="speed-gauge">
            <svg viewBox="0 0 200 120" className="speed-gauge__svg">
              {/* Background arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              {/* Progress arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke={speedColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={arcCircumference}
                strokeDashoffset={arcOffset}
                style={{
                  transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease',
                  filter: `drop-shadow(0 0 8px ${speedColor}60)`,
                }}
              />
              {/* Speed ticks */}
              {[0, 30, 60, 90, 120].map((tick) => {
                const angle = -180 + (tick / maxDisplaySpeed) * 180;
                const rad = (angle * Math.PI) / 180;
                const x = 100 + 95 * Math.cos(rad);
                const y = 100 + 95 * Math.sin(rad);
                return (
                  <text
                    key={tick}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.3)"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                  >
                    {tick}
                  </text>
                );
              })}
            </svg>
            <div className="speed-gauge__value">
              <span className="speed-gauge__number" style={{ color: speedColor }}>
                {speed.toFixed(1)}
              </span>
              <span className="speed-gauge__unit">km/h</span>
            </div>
          </div>
          <div className="card-label">Current Speed</div>
        </div>

        {/* Detection State */}
        <div className="card card--state">
          <div className="state-indicator" style={{ '--state-color': meta.color } as React.CSSProperties}>
            <span className="state-icon">{meta.icon}</span>
            <span className="state-label">{meta.label}</span>
          </div>

          <div className="state-details">
            {speedTrend ? (
              <>
                <div className="detail-row">
                  <span className="detail-label">Max Recent</span>
                  <span className="detail-value">{formatSpeed(speedTrend.maxRecentSpeed)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Deceleration</span>
                  <span className="detail-value" style={{ color: speedTrend.isSudden ? '#ef4444' : '#94a3b8' }}>
                    {speedTrend.deceleration.toFixed(1)} km/h/s
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Data Points</span>
                  <span className="detail-value">{speedTrend.dataPoints}</span>
                </div>
              </>
            ) : (
              <>
                <div className="detail-row">
                  <span className="detail-label">Speed Threshold</span>
                  <span className="detail-value">15 km/h</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Stationary Radius</span>
                  <span className="detail-value">5 m</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Countdown</span>
                  <span className="detail-value">15 s</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Location Info */}
        <div className="card card--location">
          <h3 className="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Location
          </h3>
          {position ? (
            <div className="location-data">
              <div className="detail-row">
                <span className="detail-label">Coordinates</span>
                <span className="detail-value detail-value--mono">
                  {formatCoordinates(position.latitude, position.longitude)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Accuracy</span>
                <span className="detail-value">±{position.accuracy.toFixed(0)}m</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Altitude</span>
                <span className="detail-value">
                  {position.altitude !== null ? `${position.altitude.toFixed(1)}m` : '—'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Heading</span>
                <span className="detail-value">
                  {position.heading !== null ? `${position.heading.toFixed(0)}°` : '—'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">History</span>
                <span className="detail-value">{locationHistory.length} pts</span>
              </div>
            </div>
          ) : (
            <p className="location-empty">
              {permission === 'denied'
                ? 'Location permission denied'
                : 'Waiting for GPS fix…'}
            </p>
          )}
        </div>

        {/* Log Panel */}
        <div className="card card--logs">
          <h3 className="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            System Log
          </h3>
          <div className="log-container">
            {logs.length === 0 ? (
              <p className="log-empty">No events yet. Start monitoring to begin.</p>
            ) : (
              logs.map((entry) => (
                <div key={entry.id} className="log-entry" style={{ borderLeftColor: LOG_COLORS[entry.level] || '#64748b' }}>
                  <span className="log-time">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="log-category">[{entry.category}]</span>
                  <span className="log-message">{entry.message}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
