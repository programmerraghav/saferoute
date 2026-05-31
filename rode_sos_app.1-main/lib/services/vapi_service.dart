import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// VapiService handles all voice AI verification interactions.
///
/// Architecture Decision:
/// - VAPI API keys are NOT stored in Flutter source code.
/// - All calls route through Firebase Functions (or a secure backend proxy).
/// - The Flutter app sends requests to our Firebase Function endpoint,
///   which holds the VAPI_PUBLIC_KEY and ASSISTANT_ID server-side.
///
/// If no Firebase Function is deployed yet, the service operates in
/// MOCK mode — simulating voice verification with timers.
class VapiService {
  static final VapiService _instance = VapiService._internal();
  factory VapiService() => _instance;
  VapiService._internal();

  /// Firebase Functions endpoint for VAPI proxy.
  /// Set this to your deployed Cloud Function URL.
  /// When null/empty, the service runs in mock mode.
  String? _firebaseFunctionUrl;

  bool _isMockMode = true;
  bool get isMockMode => _isMockMode;

  final StreamController<VapiCallState> _callStateController =
      StreamController<VapiCallState>.broadcast();
  Stream<VapiCallState> get callStateStream => _callStateController.stream;

  VapiCallState _currentState = VapiCallState.idle;
  VapiCallState get currentState => _currentState;

  /// Initialize — attempt to fetch the proxy URL from Firestore config.
  Future<void> initialize() async {
    try {
      final configDoc = await FirebaseFirestore.instance
          .collection('app_config')
          .doc('vapi')
          .get();

      if (configDoc.exists) {
        _firebaseFunctionUrl = configDoc.data()?['proxyUrl'] as String?;
        if (_firebaseFunctionUrl != null && _firebaseFunctionUrl!.isNotEmpty) {
          _isMockMode = false;
          debugPrint('[VapiService] ✅ Live mode: $_firebaseFunctionUrl');
        }
      }
    } catch (e) {
      debugPrint('[VapiService] Config fetch failed, using mock mode: $e');
    }

    if (_isMockMode) {
      debugPrint('[VapiService] ⚠️ Running in MOCK mode (no VAPI proxy configured)');
    }
  }

  /// Start a verification call.
  ///
  /// In LIVE mode: Calls the Firebase Function which proxies to VAPI.
  /// In MOCK mode: Simulates a 5-second voice interaction that returns no response.
  ///
  /// Returns a [VapiCallResult] indicating whether the user responded as "safe".
  Future<VapiCallResult> startVerificationCall({
    required int attemptNumber,
    required int riskScore,
  }) async {
    _updateState(VapiCallState.connecting);

    if (_isMockMode) {
      return _mockVerificationCall(attemptNumber, riskScore);
    } else {
      return _liveVerificationCall(attemptNumber, riskScore);
    }
  }

  /// Live mode — calls the Firebase Function proxy.
  Future<VapiCallResult> _liveVerificationCall(
    int attemptNumber,
    int riskScore,
  ) async {
    try {
      _updateState(VapiCallState.active);

      final user = FirebaseAuth.instance.currentUser;
      final response = await http.post(
        Uri.parse(_firebaseFunctionUrl!),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': user?.uid ?? 'unknown',
          'attemptNumber': attemptNumber,
          'riskScore': riskScore,
          'action': 'startVerification',
        }),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final intent = data['intent'] as String? ?? 'NO_RESPONSE';

        if (intent == 'SAFE' || intent == 'I_AM_SAFE') {
          _updateState(VapiCallState.completed);
          return VapiCallResult(
            responded: true,
            isSafe: true,
            transcript: data['transcript'] ?? 'User confirmed safety',
          );
        } else if (intent == 'HELP' || intent == 'EMERGENCY') {
          _updateState(VapiCallState.completed);
          return VapiCallResult(
            responded: true,
            isSafe: false,
            transcript: data['transcript'] ?? 'User requested help',
          );
        }
      }

      _updateState(VapiCallState.noResponse);
      return VapiCallResult(responded: false, isSafe: false);
    } catch (e) {
      debugPrint('[VapiService] Live call error: $e');
      _updateState(VapiCallState.error);
      return VapiCallResult(responded: false, isSafe: false);
    }
  }

  /// Mock mode — simulates a voice verification attempt.
  /// Always returns NO_RESPONSE after a short delay (simulating no user input).
  /// This ensures the escalation loop progresses naturally during testing.
  Future<VapiCallResult> _mockVerificationCall(
    int attemptNumber,
    int riskScore,
  ) async {
    _updateState(VapiCallState.active);
    debugPrint('[VapiService] MOCK: Attempt $attemptNumber — '
        'Simulating voice prompt for ${_getAttemptDuration(attemptNumber)}s...');

    // Simulate the voice interaction duration
    await Future.delayed(Duration(seconds: _getAttemptDuration(attemptNumber)));

    // In mock mode, simulate no response (worst case for testing)
    _updateState(VapiCallState.noResponse);
    return VapiCallResult(responded: false, isSafe: false);
  }

  /// Returns the voice prompt duration per attempt.
  /// Attempt 1: 10s, Attempt 2: 10s, Attempt 3: 10s (final warning)
  int _getAttemptDuration(int attempt) {
    return 10; // Each attempt gives user 10 seconds to respond
  }

  /// Cancel any active call.
  void cancelCall() {
    _updateState(VapiCallState.cancelled);
    debugPrint('[VapiService] Call cancelled by user.');
  }

  /// Log verification attempt to Firestore for audit trail.
  Future<void> logVerificationAttempt({
    required String eventId,
    required int attemptNumber,
    required VapiCallResult result,
  }) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      await FirebaseFirestore.instance
          .collection('users')
          .doc(user?.uid ?? 'anonymous')
          .collection('voice_verification_logs')
          .add({
        'eventId': eventId,
        'attemptNumber': attemptNumber,
        'responded': result.responded,
        'isSafe': result.isSafe,
        'transcript': result.transcript,
        'mode': _isMockMode ? 'MOCK' : 'LIVE',
        'timestamp': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      debugPrint('[VapiService] Log error: $e');
    }
  }

  void _updateState(VapiCallState state) {
    _currentState = state;
    _callStateController.add(state);
  }

  void dispose() {
    _callStateController.close();
  }
}

/// Represents the state of a VAPI call.
enum VapiCallState {
  idle,
  connecting,
  active,
  noResponse,
  completed,
  cancelled,
  error,
}

/// Result of a single voice verification attempt.
class VapiCallResult {
  final bool responded;
  final bool isSafe;
  final String? transcript;

  VapiCallResult({
    required this.responded,
    required this.isSafe,
    this.transcript,
  });

  @override
  String toString() =>
      'VapiCallResult(responded: $responded, isSafe: $isSafe, transcript: $transcript)';
}
