/**
 * useGeolocation — React hook for the browser Geolocation API
 *
 * Handles permission requests, continuous position watching,
 * and error recovery. Exposes the raw position stream for
 * consumption by the crash detection hook.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GeoPosition, GeoPermissionState } from '../types';
import type { CrashDetectionConfig } from '../types';

interface UseGeolocationReturn {
  /** Current GPS position (null until first fix) */
  position: GeoPosition | null;
  /** Permission state */
  permission: GeoPermissionState;
  /** Human-readable error message */
  error: string | null;
  /** Whether the watcher is actively running */
  isWatching: boolean;
  /** Request permission and start watching */
  startWatching: () => void;
  /** Stop the watcher */
  stopWatching: () => void;
}

export function useGeolocation(
  config: CrashDetectionConfig,
  onPosition?: (pos: GeoPosition) => void,
): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [permission, setPermission] = useState<GeoPermissionState>('prompt');
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  // Check if Geolocation API is available
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPermission('unavailable');
      setError('Geolocation API is not supported in this browser.');
      return;
    }

    // Check existing permission state (non-blocking)
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermission(result.state as GeoPermissionState);
        result.addEventListener('change', () => {
          setPermission(result.state as GeoPermissionState);
        });
      }).catch(() => {
        // permissions API not supported — leave as 'prompt'
      });
    }
  }, []);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    const geoPos: GeoPosition = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      altitude: pos.coords.altitude,
      timestamp: pos.timestamp,
      speed: pos.coords.speed,
      heading: pos.coords.heading,
      accuracy: pos.coords.accuracy,
      altitudeAccuracy: pos.coords.altitudeAccuracy,
    };

    setPosition(geoPos);
    setError(null);
    onPositionRef.current?.(geoPos);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setPermission('denied');
        setError('Location permission denied. Please enable in browser settings.');
        break;
      case err.POSITION_UNAVAILABLE:
        setError('Position unavailable. Check GPS signal.');
        break;
      case err.TIMEOUT:
        setError('Location request timed out. Retrying…');
        break;
      default:
        setError(`Geolocation error: ${err.message}`);
    }
    console.warn('[useGeolocation] Error:', err.code, err.message);
  }, []);

  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    if (watchIdRef.current !== null) return; // Already watching

    console.log('[useGeolocation] Starting position watcher');

    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      config.GEO_OPTIONS,
    );

    watchIdRef.current = id;
    setIsWatching(true);
    setPermission('granted');
    setError(null);
  }, [config.GEO_OPTIONS, handleSuccess, handleError]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      console.log('[useGeolocation] Stopping position watcher');
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsWatching(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    position,
    permission,
    error,
    isWatching,
    startWatching,
    stopWatching,
  };
}
