/**
 * Default configuration for crash detection thresholds.
 * All values are tuned for real-world driving/riding scenarios.
 */
import type { CrashDetectionConfig } from '../types';

export const DEFAULT_CONFIG: CrashDetectionConfig = {
  /** Minimum speed to consider user "moving" (km/h) */
  MOVING_SPEED_THRESHOLD: 15,
  /** Time window for sudden stop detection (seconds) */
  SUDDEN_STOP_TIME_WINDOW: 3,
  /** Speed considered "near zero" (km/h) */
  NEAR_ZERO_SPEED: 2,
  /** Radius to consider user stationary (meters) */
  STATIONARY_RADIUS: 5,
  /** Duration user must remain stationary to confirm crash (seconds) */
  STATIONARY_TIME: 30,
  /** Countdown before auto-SOS (seconds) */
  COUNTDOWN_DURATION: 15,
  /** Rolling history buffer duration (seconds) */
  HISTORY_DURATION: 60,
  /** Maximum acceptable GPS accuracy for valid readings (meters) */
  GPS_ACCURACY_THRESHOLD: 20,
  /** Speed jump threshold for jitter detection (km/h) */
  SPEED_JUMP_THRESHOLD: 100,
  /** Minimum deceleration rate to classify as "sudden" (km/h/s) */
  MIN_DECELERATION_RATE: 5,
  /** Number of readings to average for speed smoothing */
  SPEED_SMOOTHING_WINDOW: 3,
  /** Geolocation API watch options */
  GEO_OPTIONS: {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  },
};

/**
 * API configuration — reads from environment variables.
 * TODO: Replace placeholder URLs with actual backend endpoints.
 */
export const API_CONFIG = {
  /** Base URL for the backend API */
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  /** SOS endpoint path */
  SOS_ENDPOINT: import.meta.env.VITE_SOS_ENDPOINT || '/sos',
  /** Request timeout in ms */
  TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000', 10),
  /** Current user ID — should come from auth in production */
  USER_ID: import.meta.env.VITE_USER_ID || 'anonymous-user',
};
