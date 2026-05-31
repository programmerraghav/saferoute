/**
 * useCrashDetection — React hook that wires together the full
 * crash detection pipeline:
 *
 *   useGeolocation → CrashDetectionService → SOSManager → UI state
 *
 * This is the single hook a consuming component needs to integrate
 * the entire SOS system.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  GeoPosition,
  LocationRecord,
  CrashEvent,
  LogEntry,
  SpeedTrend,
  SOSResponse,
  CrashDetectionConfig,
} from '../types';
import { DetectionState } from '../types';
import { DEFAULT_CONFIG } from '../config';
import { LocationHistoryManager } from '../services/LocationHistoryManager';
import { CrashDetectionService } from '../services/CrashDetectionService';
import { SOSManager } from '../services/SOSManager';
import { useGeolocation } from './useGeolocation';
import { generateId } from '../utils/geo';

interface UseCrashDetectionReturn {
  /** Current detection state */
  state: DetectionState;
  /** Current GPS position */
  position: GeoPosition | null;
  /** Current smoothed speed in km/h */
  speed: number;
  /** Latest speed trend analysis */
  speedTrend: SpeedTrend | null;
  /** Active crash event (during countdown) */
  crashEvent: CrashEvent | null;
  /** Countdown seconds remaining */
  countdown: number;
  /** SOS response from backend */
  sosResponse: SOSResponse | null;
  /** Log entries for the debug panel */
  logs: LogEntry[];
  /** Location history for visualization */
  locationHistory: LocationRecord[];
  /** Geolocation permission state */
  permission: string;
  /** Error message */
  error: string | null;
  /** Whether geo watcher is active */
  isWatching: boolean;
  /** Start monitoring */
  start: () => void;
  /** Stop monitoring */
  stop: () => void;
  /** Cancel SOS (user says "I'm Safe") */
  cancelSOS: () => void;
  /** Immediately send SOS */
  sendSOSNow: () => void;
  /** Reset to monitoring state */
  reset: () => void;
}

const MAX_LOGS = 200;

export function useCrashDetection(
  configOverrides?: Partial<CrashDetectionConfig>,
): UseCrashDetectionReturn {
  const config = useMemo<CrashDetectionConfig>(
    () => ({ ...DEFAULT_CONFIG, ...configOverrides }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── UI state ──
  const [state, setState] = useState<DetectionState>(DetectionState.INITIALIZING);
  const [speed, setSpeed] = useState(0);
  const [speedTrend, setSpeedTrend] = useState<SpeedTrend | null>(null);
  const [crashEvent, setCrashEvent] = useState<CrashEvent | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [sosResponse, setSosResponse] = useState<SOSResponse | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [locationHistory, setLocationHistory] = useState<LocationRecord[]>([]);

  // ── Service refs (stable across re-renders) ──
  const locationHistoryRef = useRef<LocationHistoryManager | null>(null);
  const crashServiceRef = useRef<CrashDetectionService | null>(null);
  const sosManagerRef = useRef<SOSManager | null>(null);

  // ── Log helper ──
  const addLog = useCallback(
    (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
      const full: LogEntry = {
        ...entry,
        id: generateId(),
        timestamp: Date.now(),
      };
      setLogs((prev) => [...prev.slice(-(MAX_LOGS - 1)), full]);
    },
    [],
  );

  // ── Initialize services ──
  useEffect(() => {
    const locHistory = new LocationHistoryManager(config);
    locationHistoryRef.current = locHistory;

    const sosManager = new SOSManager(config, {
      onCountdownTick: (s) => setCountdown(s),
      onSOSTriggered: (resp) => {
        setSosResponse(resp);
        setState(DetectionState.SOS_TRIGGERED);
      },
      onSOSCancelled: () => {
        setCrashEvent(null);
        setCountdown(0);
        setSosResponse(null);
        // crashService will reset to MONITORING
        crashServiceRef.current?.reset();
      },
      onLog: (msg) =>
        addLog({ level: 'info', category: 'sos', message: msg }),
    });
    sosManagerRef.current = sosManager;

    const crashService = new CrashDetectionService(config, locHistory, {
      onStateChange: (s) => setState(s),
      onCrashDetected: (event) => {
        setCrashEvent(event);
        sosManager.startCountdown(event);
      },
      onLocationUpdate: (record) => {
        setLocationHistory(locHistory.getHistory());
        // Suppress noisy location logs in the UI (still goes to console)
        if (!record.isJitter) {
          // Only log every 5th update to keep the log panel readable
        }
      },
      onSpeedUpdate: (s, trend) => {
        setSpeed(s);
        setSpeedTrend(trend);
      },
      onLog: addLog,
    });
    crashServiceRef.current = crashService;

    return () => {
      crashService.stop();
      sosManager.dispose();
    };
  }, [config, addLog]);

  // ── Geolocation → CrashDetectionService ──
  const handlePosition = useCallback((pos: GeoPosition) => {
    crashServiceRef.current?.processLocation(pos);
  }, []);

  const {
    position,
    permission,
    error,
    isWatching,
    startWatching,
    stopWatching,
  } = useGeolocation(config, handlePosition);

  // ── Public actions ──
  const start = useCallback(() => {
    addLog({ level: 'info', category: 'system', message: 'Starting crash detection…' });
    startWatching();
    crashServiceRef.current?.start();
  }, [startWatching, addLog]);

  const stop = useCallback(() => {
    addLog({ level: 'info', category: 'system', message: 'Stopping crash detection' });
    stopWatching();
    crashServiceRef.current?.stop();
    setState(DetectionState.INITIALIZING);
  }, [stopWatching, addLog]);

  const cancelSOS = useCallback(() => {
    sosManagerRef.current?.cancel();
  }, []);

  const sendSOSNow = useCallback(() => {
    sosManagerRef.current?.sendImmediately();
  }, []);

  const reset = useCallback(() => {
    setCrashEvent(null);
    setCountdown(0);
    setSosResponse(null);
    crashServiceRef.current?.reset();
  }, []);

  return {
    state,
    position,
    speed,
    speedTrend,
    crashEvent,
    countdown,
    sosResponse,
    logs,
    locationHistory,
    permission,
    error,
    isWatching,
    start,
    stop,
    cancelSOS,
    sendSOSNow,
    reset,
  };
}
