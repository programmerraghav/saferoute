/**
 * SOS Crash Detection System — Type Definitions
 *
 * Core types for the crash detection pipeline, GPS tracking,
 * and SOS alert system. All speed values are in km/h unless noted.
 */

/* ------------------------------------------------------------------ */
/*  GPS & Location                                                     */
/* ------------------------------------------------------------------ */

/** Raw GPS position from the Geolocation API */
export interface GeoPosition {
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: number;
  /** Speed reported by GPS, in m/s */
  speed: number | null;
  /** Heading in degrees from true north */
  heading: number | null;
  /** Horizontal accuracy in meters */
  accuracy: number;
  altitudeAccuracy: number | null;
}

/** Enriched location record stored in the history buffer */
export interface LocationRecord extends GeoPosition {
  /** Speed calculated from consecutive position deltas (km/h) */
  calculatedSpeed: number;
  /** Smoothed speed after noise filtering (km/h) */
  smoothedSpeed: number;
  /** Whether this reading was flagged as GPS jitter */
  isJitter: boolean;
}

/* ------------------------------------------------------------------ */
/*  Speed Analysis                                                     */
/* ------------------------------------------------------------------ */

/** Speed trend analysis over a configurable time window */
export interface SpeedTrend {
  currentSpeed: number;
  averageSpeed: number;
  maxRecentSpeed: number;
  /** Rate of deceleration (km/h per second). Positive = slowing. */
  deceleration: number;
  isDecelerating: boolean;
  /** True when deceleration exceeds the configured threshold */
  isSudden: boolean;
  dataPoints: number;
}

/* ------------------------------------------------------------------ */
/*  Crash Events                                                       */
/* ------------------------------------------------------------------ */

export interface CrashEvent {
  id: string;
  timestamp: number;
  location: GeoPosition;
  lastKnownSpeed: number;
  movementHistory: LocationRecord[];
  crashType: 'sudden_stop';
  confidence: number;
}

/* ------------------------------------------------------------------ */
/*  SOS API                                                            */
/* ------------------------------------------------------------------ */

export interface SOSPayload {
  userId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  lastKnownSpeed: number;
  crashDetected: boolean;
  movementHistory: Array<{
    latitude: number;
    longitude: number;
    speed: number;
    timestamp: number;
  }>;
  deviceInfo: {
    userAgent: string;
    platform: string;
  };
}

export interface SOSResponse {
  success: boolean;
  alertId?: string;
  message: string;
  estimatedResponseTime?: number;
}

/* ------------------------------------------------------------------ */
/*  State Machine                                                      */
/* ------------------------------------------------------------------ */

export enum DetectionState {
  INITIALIZING = 'initializing',
  MONITORING = 'monitoring',
  SUDDEN_STOP_DETECTED = 'sudden_stop_detected',
  STATIONARY_CHECK = 'stationary_check',
  CONFIRMATION_COUNTDOWN = 'confirmation_countdown',
  SOS_TRIGGERED = 'sos_triggered',
  CANCELLED = 'cancelled',
  PERMISSION_DENIED = 'permission_denied',
  ERROR = 'error',
  PAUSED = 'paused',
}

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

export interface CrashDetectionConfig {
  MOVING_SPEED_THRESHOLD: number;
  SUDDEN_STOP_TIME_WINDOW: number;
  NEAR_ZERO_SPEED: number;
  STATIONARY_RADIUS: number;
  STATIONARY_TIME: number;
  COUNTDOWN_DURATION: number;
  HISTORY_DURATION: number;
  GPS_ACCURACY_THRESHOLD: number;
  SPEED_JUMP_THRESHOLD: number;
  MIN_DECELERATION_RATE: number;
  SPEED_SMOOTHING_WINDOW: number;
  GEO_OPTIONS: PositionOptions;
}

/* ------------------------------------------------------------------ */
/*  Logging                                                            */
/* ------------------------------------------------------------------ */

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'critical';
  category: 'location' | 'speed' | 'detection' | 'sos' | 'system';
  message: string;
  data?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Callbacks                                                          */
/* ------------------------------------------------------------------ */

export type GeoPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

export interface CrashDetectionCallbacks {
  onStateChange: (state: DetectionState) => void;
  onCrashDetected: (event: CrashEvent) => void;
  onLocationUpdate: (record: LocationRecord) => void;
  onSpeedUpdate: (speed: number, trend: SpeedTrend) => void;
  onLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
}
