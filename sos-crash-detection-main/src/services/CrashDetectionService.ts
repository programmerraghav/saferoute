/**
 * CrashDetectionService
 *
 * The core state machine that orchestrates the crash detection pipeline:
 *
 *   MONITORING → SUDDEN_STOP_DETECTED → STATIONARY_CHECK → crash callback
 *
 * It does NOT own the Geolocation watcher — position updates are pushed
 * in via `processLocation()`, making the service easy to test in isolation.
 *
 * False-positive prevention:
 *  - Ignores GPS jitter / large accuracy values
 *  - Requires sustained high speed before the stop
 *  - Distinguishes sudden vs. gradual deceleration
 *  - Requires post-stop immobility within a small radius
 *  - Handles tab-visibility changes gracefully
 */

import type {
  GeoPosition,
  LocationRecord,
  CrashEvent,
  CrashDetectionConfig,
  CrashDetectionCallbacks,
  SpeedTrend,
} from '../types';
import { DetectionState } from '../types';
import { LocationHistoryManager } from './LocationHistoryManager';
import { generateId } from '../utils/geo';

export class CrashDetectionService {
  private state: DetectionState = DetectionState.INITIALIZING;
  private readonly config: CrashDetectionConfig;
  private readonly locationHistory: LocationHistoryManager;
  private readonly callbacks: CrashDetectionCallbacks;

  /** Location where the sudden stop was first detected */
  private suddenStopLocation: GeoPosition | null = null;
  /** Timestamp of the sudden stop */
  private suddenStopTime: number | null = null;
  /** Interval ID for periodic stationary checks */
  private stationaryCheckTimer: ReturnType<typeof setInterval> | null = null;
  /** Track the last speed before the stop for the crash report */
  private preStopMaxSpeed = 0;
  /** Whether the page is currently visible */
  private pageVisible = true;

  constructor(
    config: CrashDetectionConfig,
    locationHistory: LocationHistoryManager,
    callbacks: CrashDetectionCallbacks,
  ) {
    this.config = config;
    this.locationHistory = locationHistory;
    this.callbacks = callbacks;

    // Handle tab visibility
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /* ---------------------------------------------------------------- */
  /*  Public API                                                       */
  /* ---------------------------------------------------------------- */

  /** Start monitoring (call after geolocation permission is granted). */
  start(): void {
    this.setState(DetectionState.MONITORING);
    this.log('info', 'system', 'Crash detection service started');
  }

  /** Stop monitoring and clean up timers. */
  stop(): void {
    this.clearStationaryTimer();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.log('info', 'system', 'Crash detection service stopped');
  }

  /** Reset the state machine back to MONITORING. */
  reset(): void {
    this.clearStationaryTimer();
    this.suddenStopLocation = null;
    this.suddenStopTime = null;
    this.preStopMaxSpeed = 0;
    this.setState(DetectionState.MONITORING);
    this.log('info', 'system', 'State machine reset to MONITORING');
  }

  /** Current state (read-only). */
  getState(): DetectionState {
    return this.state;
  }

  /** Access the underlying location history for external queries. */
  getLocationHistory(): LocationHistoryManager {
    return this.locationHistory;
  }

  /**
   * Feed a new GPS position into the pipeline.
   * This is the main entry point called by the geolocation watcher.
   */
  processLocation(position: GeoPosition): void {
    // Don't process if paused (tab hidden) or in terminal states
    if (
      this.state === DetectionState.PAUSED ||
      this.state === DetectionState.SOS_TRIGGERED ||
      this.state === DetectionState.PERMISSION_DENIED ||
      this.state === DetectionState.ERROR
    ) {
      return;
    }

    const record = this.locationHistory.addPosition(position);
    this.callbacks.onLocationUpdate(record);

    // Skip jitter
    if (record.isJitter) {
      this.log('warn', 'location', 'GPS jitter detected — ignored', {
        accuracy: position.accuracy,
        calculatedSpeed: record.calculatedSpeed,
      });
      return;
    }

    // Update speed callback
    const trend = this.locationHistory.getSpeedTrend(
      this.config.SUDDEN_STOP_TIME_WINDOW,
    );
    this.callbacks.onSpeedUpdate(record.smoothedSpeed, trend);

    this.log('info', 'speed', `Speed: ${record.smoothedSpeed.toFixed(1)} km/h`, {
      raw: record.calculatedSpeed,
      smoothed: record.smoothedSpeed,
      accuracy: position.accuracy,
    });

    // State machine transitions
    switch (this.state) {
      case DetectionState.MONITORING:
        this.checkForSuddenStop(record, trend);
        break;

      case DetectionState.SUDDEN_STOP_DETECTED:
      case DetectionState.STATIONARY_CHECK:
        this.checkIfMovingAgain(record);
        break;

      // CONFIRMATION_COUNTDOWN / SOS_TRIGGERED — handled by SOSManager
      default:
        break;
    }
  }

  /* ---------------------------------------------------------------- */
  /*  State Machine Logic                                              */
  /* ---------------------------------------------------------------- */

  /**
   * Check if the latest reading + speed trend indicate a sudden stop.
   */
  private checkForSuddenStop(record: LocationRecord, trend: SpeedTrend): void {
    // Need enough data points
    if (trend.dataPoints < 2) return;

    const wasMovingFast = trend.maxRecentSpeed >= this.config.MOVING_SPEED_THRESHOLD;
    const isNowSlow = record.smoothedSpeed <= this.config.NEAR_ZERO_SPEED;
    const isSuddenDecel = trend.isSudden;

    if (wasMovingFast && isNowSlow && isSuddenDecel) {
      this.log('critical', 'detection', '⚠ SUDDEN STOP DETECTED', {
        maxRecentSpeed: trend.maxRecentSpeed,
        currentSpeed: record.smoothedSpeed,
        deceleration: trend.deceleration,
        threshold: this.config.MIN_DECELERATION_RATE,
      });

      this.suddenStopLocation = record;
      this.suddenStopTime = Date.now();
      this.preStopMaxSpeed = trend.maxRecentSpeed;

      this.setState(DetectionState.SUDDEN_STOP_DETECTED);
      this.startStationaryCheck();
    }
  }

  /**
   * During SUDDEN_STOP_DETECTED or STATIONARY_CHECK, check whether
   * the user has resumed movement — if so, cancel the detection.
   */
  private checkIfMovingAgain(record: LocationRecord): void {
    if (record.smoothedSpeed > this.config.NEAR_ZERO_SPEED * 2) {
      this.log('info', 'detection', 'User resumed movement — cancelling detection', {
        speed: record.smoothedSpeed,
      });
      this.reset();
    }
  }

  /**
   * Start periodic checks for post-stop immobility.
   */
  private startStationaryCheck(): void {
    this.clearStationaryTimer();
    this.setState(DetectionState.STATIONARY_CHECK);

    this.log('info', 'detection', 'Starting stationary monitoring', {
      radius: this.config.STATIONARY_RADIUS,
      requiredDuration: this.config.STATIONARY_TIME,
    });

    this.stationaryCheckTimer = setInterval(() => {
      if (!this.suddenStopLocation || !this.suddenStopTime) {
        this.clearStationaryTimer();
        return;
      }

      const elapsed = (Date.now() - this.suddenStopTime) / 1000;

      // Check if user has remained within the stationary radius
      const isStationary = this.locationHistory.isStationary(
        this.suddenStopLocation.latitude,
        this.suddenStopLocation.longitude,
        this.config.STATIONARY_RADIUS,
        Math.min(elapsed, this.config.STATIONARY_TIME),
      );

      if (!isStationary) {
        this.log('info', 'detection', 'Movement detected — cancelling');
        this.reset();
        return;
      }

      this.log('info', 'detection', `Stationary: ${elapsed.toFixed(0)}s / ${this.config.STATIONARY_TIME}s`);

      // If we've been stationary long enough → fire crash event
      if (elapsed >= this.config.STATIONARY_TIME) {
        this.clearStationaryTimer();
        this.fireCrashEvent();
      }
    }, 2000); // Check every 2 seconds
  }

  /**
   * Build and emit the crash event, transitioning to CONFIRMATION_COUNTDOWN.
   */
  private fireCrashEvent(): void {
    if (!this.suddenStopLocation) return;

    const event: CrashEvent = {
      id: generateId(),
      timestamp: Date.now(),
      location: this.suddenStopLocation,
      lastKnownSpeed: this.preStopMaxSpeed,
      movementHistory: this.locationHistory.getHistory(),
      crashType: 'sudden_stop',
      confidence: this.calculateConfidence(),
    };

    this.log('critical', 'detection', '🚨 CRASH DETECTED — starting confirmation', {
      id: event.id,
      confidence: event.confidence,
      lastSpeed: event.lastKnownSpeed,
    });

    this.setState(DetectionState.CONFIRMATION_COUNTDOWN);
    this.callbacks.onCrashDetected(event);
  }

  /**
   * Simple confidence score based on available evidence.
   */
  private calculateConfidence(): number {
    let score = 0.5; // Base

    const trend = this.locationHistory.getSpeedTrend(
      this.config.SUDDEN_STOP_TIME_WINDOW,
    );

    // Higher speed before stop → higher confidence
    if (trend.maxRecentSpeed > 30) score += 0.15;
    if (trend.maxRecentSpeed > 50) score += 0.1;

    // Greater deceleration → higher confidence
    if (trend.deceleration > 10) score += 0.1;
    if (trend.deceleration > 20) score += 0.1;

    // More data points → higher confidence
    if (trend.dataPoints > 5) score += 0.05;

    return Math.min(1, score);
  }

  /* ---------------------------------------------------------------- */
  /*  Tab Visibility                                                   */
  /* ---------------------------------------------------------------- */

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.pageVisible = false;
      if (
        this.state === DetectionState.MONITORING ||
        this.state === DetectionState.SUDDEN_STOP_DETECTED ||
        this.state === DetectionState.STATIONARY_CHECK
      ) {
        this.log('warn', 'system', 'Tab hidden — pausing detection');
        this.clearStationaryTimer();
        this.setState(DetectionState.PAUSED);
      }
    } else {
      this.pageVisible = true;
      if (this.state === DetectionState.PAUSED) {
        this.log('info', 'system', 'Tab visible — resuming monitoring');
        this.reset();
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  private setState(newState: DetectionState): void {
    const prev = this.state;
    this.state = newState;
    if (prev !== newState) {
      this.callbacks.onStateChange(newState);
    }
  }

  private clearStationaryTimer(): void {
    if (this.stationaryCheckTimer !== null) {
      clearInterval(this.stationaryCheckTimer);
      this.stationaryCheckTimer = null;
    }
  }

  private log(
    level: 'info' | 'warn' | 'error' | 'critical',
    category: 'location' | 'speed' | 'detection' | 'sos' | 'system',
    message: string,
    data?: Record<string, unknown>,
  ): void {
    const prefix = `[CrashDetection:${category}]`;
    const fn = level === 'critical' || level === 'error' ? console.error
      : level === 'warn' ? console.warn
      : console.log;
    fn(prefix, message, data ?? '');

    this.callbacks.onLog({ level, category, message, data });
  }
}
