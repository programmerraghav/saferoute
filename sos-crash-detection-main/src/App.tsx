/**
 * App — Root component for the SOS Crash Detection System
 *
 * Wires the useCrashDetection hook to the StatusDashboard
 * and EmergencyModal components.
 */

import React from 'react';
import { useCrashDetection } from './hooks/useCrashDetection';
import { StatusDashboard } from './components/StatusDashboard';
import { EmergencyModal } from './components/EmergencyModal';
import { DetectionState } from './types';
import './App.css';

const App: React.FC = () => {
  const {
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
  } = useCrashDetection();

  const showEmergencyModal =
    state === DetectionState.CONFIRMATION_COUNTDOWN ||
    state === DetectionState.SOS_TRIGGERED;

  return (
    <>
      <StatusDashboard
        state={state}
        position={position}
        speed={speed}
        speedTrend={speedTrend}
        logs={logs}
        locationHistory={locationHistory}
        permission={permission}
        error={error}
        isWatching={isWatching}
        onStart={start}
        onStop={stop}
      />

      {showEmergencyModal && (
        <EmergencyModal
          countdown={countdown}
          sosResponse={sosResponse}
          isSOSTriggered={state === DetectionState.SOS_TRIGGERED}
          onCancel={cancelSOS}
          onSendNow={sendSOSNow}
          onDismiss={reset}
        />
      )}
    </>
  );
};

export default App;
