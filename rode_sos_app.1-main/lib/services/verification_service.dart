import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import 'package:vibration/vibration.dart';

import 'vapi_service.dart';
import 'sos_service.dart';

/// VerificationService — The headless emergency verification state machine.
///
/// This is the CORE architectural improvement. This service:
/// 1. Runs entirely independent of any UI screen.
/// 2. Survives screen closure, navigation, and app minimize.
/// 3. Manages the 3-attempt escalation loop with countdown timers.
/// 4. Orchestrates VapiService for voice verification.
/// 5. Auto-dispatches SOS via SosService if all attempts fail.
///
/// State Machine:
///   IDLE → PENDING → ATTEMPT_1 → ATTEMPT_2 → ATTEMPT_3 → AUTO_DISPATCH
///   Any state → CANCELLED (user marks safe)
///   Any state → CONFIRMED (user/voice confirms emergency)
///
/// The UI (VapiVerificationScreen) is a DUMB OBSERVER — it reads the
/// [stateStream] to display countdown, attempt number, and status.
/// Even if the UI is closed, this service continues running.
class VerificationService {
  static final VerificationService _instance = VerificationService._internal();
  factory VerificationService() => _instance;
  VerificationService._internal();

  // ── State ──
  VerificationState _state = VerificationState.idle;
  VerificationState get state => _state;

  int _currentAttempt = 0;
  int get currentAttempt => _currentAttempt;

  int _countdown = 10;
  int get countdown => _countdown;

  int _riskScore = 0;
  int get riskScore => _riskScore;

  String? _activeEventId;
  String? get activeEventId => _activeEventId;

  double? _eventLatitude;
  double? _eventLongitude;

  Timer? _countdownTimer;
  bool _isRunning = false;

  // ── Streams for UI observation ──
  final StreamController<VerificationUpdate> _stateController =
      StreamController<VerificationUpdate>.broadcast();
  Stream<VerificationUpdate> get stateStream => _stateController.stream;

  /// Start the verification workflow.
  ///
  /// Called by SensorMonitorService when a crash/emergency is detected.
  /// [score] - the sensor fusion risk score (0-100)
  /// [lat], [lng] - GPS coordinates at detection time
  void startVerification({
    required int score,
    double? lat,
    double? lng,
  }) {
    if (_isRunning) {
      debugPrint('[VerificationService] Already running, ignoring duplicate trigger.');
      return;
    }

    _isRunning = true;
    _riskScore = score;
    _currentAttempt = 0;
    _activeEventId = const Uuid().v4();
    _eventLatitude = lat;
    _eventLongitude = lng;

    debugPrint('[VerificationService] ═══════════════════════════════════');
    debugPrint('[VerificationService] 🚨 VERIFICATION STARTED');
    debugPrint('[VerificationService] Event: $_activeEventId');
    debugPrint('[VerificationService] Risk Score: $score');
    debugPrint('[VerificationService] ═══════════════════════════════════');

    // If score >= 81: IMMEDIATE AUTO DISPATCH (no verification needed)
    if (score >= 81) {
      _updateState(VerificationState.autoDispatch);
      _dispatchSOS('CRASH_DETECTED');
      return;
    }

    // Score 61-80: Start 3-attempt escalation loop
    _startNextAttempt();
  }

  /// Advance to the next verification attempt.
  void _startNextAttempt() {
    _currentAttempt++;

    if (_currentAttempt > 3) {
      // All 3 attempts exhausted — AUTO DISPATCH
      _updateState(VerificationState.autoDispatch);
      _dispatchSOS('AUTO_TIMEOUT');
      return;
    }

    _countdown = 10;
    _updateState(VerificationState.values.firstWhere(
      (s) => s.name == 'attempt$_currentAttempt',
      orElse: () => VerificationState.attempt1,
    ));

    // Haptic feedback
    _vibrateAlert();

    // Start the countdown timer
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!_isRunning) {
        timer.cancel();
        return;
      }

      _countdown--;
      _emitUpdate();

      if (_countdown <= 0) {
        timer.cancel();
        _handleAttemptTimeout();
      }
    });

    // Initiate VAPI voice call in parallel
    _initiateVoiceVerification();

    _emitUpdate();
  }

  /// Handle timeout of a single attempt.
  void _handleAttemptTimeout() {
    debugPrint('[VerificationService] ⏰ Attempt $_currentAttempt timed out.');

    // Log this attempt
    VapiService().logVerificationAttempt(
      eventId: _activeEventId ?? 'unknown',
      attemptNumber: _currentAttempt,
      result: VapiCallResult(responded: false, isSafe: false),
    );

    // Move to next attempt
    _startNextAttempt();
  }

  /// Initiate voice verification via VapiService.
  Future<void> _initiateVoiceVerification() async {
    try {
      final result = await VapiService().startVerificationCall(
        attemptNumber: _currentAttempt,
        riskScore: _riskScore,
      );

      if (!_isRunning) return; // Check if cancelled during call

      // Log the attempt
      await VapiService().logVerificationAttempt(
        eventId: _activeEventId ?? 'unknown',
        attemptNumber: _currentAttempt,
        result: result,
      );

      if (result.responded) {
        if (result.isSafe) {
          // User confirmed safe — cancel everything
          markAsSafe();
        } else {
          // User confirmed emergency — dispatch immediately
          confirmEmergency();
        }
      }
      // If no response, the countdown timer handles the timeout
    } catch (e) {
      debugPrint('[VerificationService] Voice verification error: $e');
    }
  }

  /// User presses "I'm Safe" — cancel all timers and close workflow.
  void markAsSafe() {
    debugPrint('[VerificationService] ✅ User marked as SAFE.');
    _countdownTimer?.cancel();
    _updateState(VerificationState.cancelled);
    VapiService().cancelCall();
    _cleanup();
  }

  /// User presses "SOS NOW" or voice confirms emergency.
  void confirmEmergency() {
    debugPrint('[VerificationService] 🚨 Emergency CONFIRMED by user/voice.');
    _countdownTimer?.cancel();
    _updateState(VerificationState.confirmed);
    _dispatchSOS('VOICE_CONFIRMED');
  }

  /// Dispatch SOS via SosService.
  Future<void> _dispatchSOS(String eventType) async {
    debugPrint('[VerificationService] ═══════════════════════════════════');
    debugPrint('[VerificationService] 🆘 DISPATCHING SOS: $eventType');
    debugPrint('[VerificationService] ═══════════════════════════════════');

    final dispatchedId = await SosService().dispatchSOS(
      riskScore: _riskScore,
      eventType: eventType,
      latitude: _eventLatitude,
      longitude: _eventLongitude,
    );

    _activeEventId = dispatchedId;
    _updateState(VerificationState.dispatched);
    _cleanup();
  }

  /// Haptic feedback for emergency alert.
  void _vibrateAlert() {
    try {
      Vibration.vibrate(pattern: [0, 500, 200, 500, 200, 1000]);
    } catch (e) {
      debugPrint('[VerificationService] Vibration error: $e');
    }
  }

  /// Update state and emit to stream.
  void _updateState(VerificationState newState) {
    _state = newState;
    _emitUpdate();
  }

  /// Emit current state snapshot to all listeners.
  void _emitUpdate() {
    if (!_stateController.isClosed) {
      _stateController.add(VerificationUpdate(
        state: _state,
        attempt: _currentAttempt,
        countdown: _countdown,
        riskScore: _riskScore,
        eventId: _activeEventId,
      ));
    }
  }

  /// Reset internal state after workflow completes.
  void _cleanup() {
    _isRunning = false;
    _countdownTimer?.cancel();
    _countdownTimer = null;
    // Do NOT reset _state — keep it so UI can show final status
  }

  /// Force abort (e.g., app shutdown).
  void abort() {
    _countdownTimer?.cancel();
    _isRunning = false;
    _updateState(VerificationState.idle);
  }

  void dispose() {
    _countdownTimer?.cancel();
    _stateController.close();
  }
}

/// Verification state machine states.
enum VerificationState {
  idle,
  attempt1,
  attempt2,
  attempt3,
  autoDispatch,
  confirmed,
  dispatched,
  cancelled,
}

/// Snapshot of the verification workflow state.
/// UI screens observe this to render countdown, attempt info, etc.
class VerificationUpdate {
  final VerificationState state;
  final int attempt;
  final int countdown;
  final int riskScore;
  final String? eventId;

  VerificationUpdate({
    required this.state,
    required this.attempt,
    required this.countdown,
    required this.riskScore,
    this.eventId,
  });

  bool get isActive =>
      state == VerificationState.attempt1 ||
      state == VerificationState.attempt2 ||
      state == VerificationState.attempt3;

  bool get isTerminal =>
      state == VerificationState.dispatched ||
      state == VerificationState.cancelled ||
      state == VerificationState.autoDispatch;

  @override
  String toString() =>
      'VerificationUpdate(state: $state, attempt: $attempt, countdown: $countdown, score: $riskScore)';
}
