/**
 * LocationHistoryManager
 *
 * Maintains a rolling buffer of GPS readings and provides:
 * - Distance calculations between positions
 * - Speed computation from position deltas
 * - Speed trend analysis over configurable windows
 * - GPS noise / jitter filtering
 *
 * This class is stateful but side-effect-free — it doesn't call
 * the Geolocation API itself, it only stores and analyses data.
 */

import type {
  GeoPosition,
  LocationRecord,
  SpeedTrend,
  CrashDetectionConfig,
} from '../types';
import { haversineDistance, msToKmh } from '../utils/geo';

export class LocationHistoryManager {
  private history: LocationRecord[] = [];
  private readonly config: CrashDetectionConfig;

  constructor(config: CrashDetectionConfig) {
    this.config = config;
  }

  /* ---------------------------------------------------------------- */
  /*  Public API                                                       */
  /* ---------------------------------------------------------------- */

  /**
   * Add a raw GPS position. The manager enriches it with calculated
   * speed, applies smoothing, and returns the resulting record.
   */
  addPosition(position: GeoPosition): LocationRecord {
    const record = this.createRecord(position);
    this.history.push(record);
    this.pruneOld();
    return record;
  }

  /** Most recent record, or `null` if buffer is empty. */
  getLatest(): LocationRecord | null {
    return this.history.length > 0
      ? this.history[this.history.length - 1]
      : null;
  }

  /** Full history (defensive copy). */
  getHistory(): LocationRecord[] {
    return [...this.history];
  }

  /** Number of records in the buffer. */
  get size(): number {
    return this.history.length;
  }

  /** Reset all stored data. */
  clear(): void {
    this.history = [];
  }

  /**
   * Compute speed trend over the last `windowSeconds`.
   * Used by the crash detection engine to identify sudden stops.
   */
  getSpeedTrend(windowSeconds: number): SpeedTrend {
    const now = Date.now();
    const cutoff = now - windowSeconds * 1000;

    const windowRecords = this.history.filter(
      (r) => r.timestamp >= cutoff && !r.isJitter,
    );

    if (windowRecords.length < 2) {
      const current = this.getLatestValidSpeed();
      return {
        currentSpeed: current,
        averageSpeed: current,
        maxRecentSpeed: current,
        deceleration: 0,
        isDecelerating: false,
        isSudden: false,
        dataPoints: windowRecords.length,
      };
    }

    const speeds = windowRecords.map((r) => r.smoothedSpeed);
    const currentSpeed = speeds[speeds.length - 1];
    const maxRecentSpeed = Math.max(...speeds);
    const averageSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

    // Calculate deceleration (km/h per second)
    const first = windowRecords[0];
    const last = windowRecords[windowRecords.length - 1];
    const timeDelta = (last.timestamp - first.timestamp) / 1000;

    let deceleration = 0;
    if (timeDelta > 0) {
      deceleration = (first.smoothedSpeed - last.smoothedSpeed) / timeDelta;
    }

    const isDecelerating = deceleration > 0;
    const isSudden =
      isDecelerating && deceleration >= this.config.MIN_DECELERATION_RATE;

    return {
      currentSpeed,
      averageSpeed,
      maxRecentSpeed,
      deceleration,
      isDecelerating,
      isSudden,
      dataPoints: windowRecords.length,
    };
  }

  /**
   * Check whether the user has stayed within `radiusMeters` of a
   * reference point for the last `durationSeconds`.
   */
  isStationary(
    referenceLat: number,
    referenceLon: number,
    radiusMeters: number,
    durationSeconds: number,
  ): boolean {
    const now = Date.now();
    const cutoff = now - durationSeconds * 1000;

    const recentRecords = this.history.filter(
      (r) => r.timestamp >= cutoff && !r.isJitter,
    );

    if (recentRecords.length < 2) return false;

    return recentRecords.every((record) => {
      const distance = haversineDistance(
        referenceLat,
        referenceLon,
        record.latitude,
        record.longitude,
      );
      return distance <= radiusMeters;
    });
  }

  /**
   * Get the maximum displacement from a reference point within
   * recent records — useful for stationary check debugging.
   */
  getMaxDisplacement(
    referenceLat: number,
    referenceLon: number,
    durationSeconds: number,
  ): number {
    const cutoff = Date.now() - durationSeconds * 1000;
    const recent = this.history.filter(
      (r) => r.timestamp >= cutoff && !r.isJitter,
    );

    if (recent.length === 0) return 0;

    return Math.max(
      ...recent.map((r) =>
        haversineDistance(referenceLat, referenceLon, r.latitude, r.longitude),
      ),
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Internal helpers                                                 */
  /* ---------------------------------------------------------------- */

  private createRecord(position: GeoPosition): LocationRecord {
    const previous = this.getLatest();
    let calculatedSpeed = 0;
    let isJitter = false;

    if (previous) {
      const distance = haversineDistance(
        previous.latitude,
        previous.longitude,
        position.latitude,
        position.longitude,
      );
      const timeDelta = (position.timestamp - previous.timestamp) / 1000;

      // Only compute speed if we have a reasonable time delta
      if (timeDelta > 0 && timeDelta < 30) {
        calculatedSpeed = msToKmh(distance / timeDelta);
      }

      // GPS jitter: unrealistic speed jump
      if (calculatedSpeed > this.config.SPEED_JUMP_THRESHOLD) {
        isJitter = true;
        calculatedSpeed = previous.smoothedSpeed;
      }

      // Very poor accuracy → treat as jitter
      if (position.accuracy > this.config.GPS_ACCURACY_THRESHOLD * 3) {
        isJitter = true;
        calculatedSpeed = previous.smoothedSpeed;
      }
    }

    // Prefer GPS-reported speed when available and reasonable
    if (
      position.speed !== null &&
      position.speed >= 0 &&
      position.accuracy <= this.config.GPS_ACCURACY_THRESHOLD
    ) {
      const gpsSpeedKmh = msToKmh(position.speed);
      // Use GPS speed if it doesn't deviate too wildly from calculated
      if (
        !previous ||
        Math.abs(gpsSpeedKmh - calculatedSpeed) < this.config.SPEED_JUMP_THRESHOLD / 2
      ) {
        calculatedSpeed = gpsSpeedKmh;
      }
    }

    const smoothedSpeed = this.smoothSpeed(calculatedSpeed);

    return {
      ...position,
      calculatedSpeed,
      smoothedSpeed,
      isJitter,
    };
  }

  /**
   * Simple moving-average smoothing over the last N valid readings.
   */
  private smoothSpeed(currentSpeed: number): number {
    const window = this.config.SPEED_SMOOTHING_WINDOW;
    const validRecent = this.history
      .filter((r) => !r.isJitter)
      .slice(-window);

    if (validRecent.length === 0) return currentSpeed;

    const speeds = [...validRecent.map((r) => r.calculatedSpeed), currentSpeed];
    return speeds.reduce((a, b) => a + b, 0) / speeds.length;
  }

  /** Latest valid (non-jitter) speed, or 0. */
  private getLatestValidSpeed(): number {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (!this.history[i].isJitter) {
        return this.history[i].smoothedSpeed;
      }
    }
    return 0;
  }

  /** Remove records older than the configured history window. */
  private pruneOld(): void {
    const cutoff = Date.now() - this.config.HISTORY_DURATION * 1000;
    this.history = this.history.filter((r) => r.timestamp >= cutoff);
  }
}
