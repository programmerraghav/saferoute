import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../models/telemetry_log.dart';
import 'offline_sync_service.dart';
import 'verification_service.dart';

/// SensorMonitorService — Emergency Detection via Sensor Fusion.
///
/// This service is responsible ONLY for:
/// 1. Reading accelerometer + gyroscope sensors
/// 2. Tracking GPS speed
/// 3. Computing a 0-100 risk/confidence score
/// 4. Triggering VerificationService when risk thresholds are met
///
/// It does NOT handle verification, VAPI calls, or SOS dispatch.
/// Those responsibilities belong to the decoupled service pipeline:
///   SensorMonitorService → VerificationService → VapiService → SosService
class SensorMonitorService {
  static final SensorMonitorService _instance = SensorMonitorService._internal();
  factory SensorMonitorService() => _instance;
  SensorMonitorService._internal();

  bool _isRunning = false;
  bool get isRunning => _isRunning;

  StreamSubscription<AccelerometerEvent>? _accelSub;
  StreamSubscription<GyroscopeEvent>? _gyroSub;
  Timer? _processingTimer;

  double _accelX = 0.0, _accelY = 0.0, _accelZ = 0.0;
  double _gyroX = 0.0, _gyroY = 0.0, _gyroZ = 0.0;

  double _currentSpeedKmh = 0.0;
  final List<double> _speedHistory = [];

  double _maxGForceLast3Secs = 1.0;
  final List<double> _gForceWindow = [];

  // Cooldown to prevent rapid re-triggers
  DateTime? _lastEmergencyTrigger;
  static const _emergencyCooldown = Duration(seconds: 60);

  // ── Stream for UI observation (speed, gForce, riskScore, location) ──
  final StreamController<SensorState> _stateController =
      StreamController<SensorState>.broadcast();
  Stream<SensorState> get stateStream => _stateController.stream;

  Future<void> start() async {
    if (_isRunning) return;
    _isRunning = true;

    if (!kIsWeb) {
      _accelSub = accelerometerEventStream().listen((AccelerometerEvent event) {
        _accelX = event.x;
        _accelY = event.y;
        _accelZ = event.z;

        double gForce =
            sqrt(event.x * event.x + event.y * event.y + event.z * event.z) / 9.8;
        _gForceWindow.add(gForce);
        if (_gForceWindow.length > 30) _gForceWindow.removeAt(0);
      });

      _gyroSub = gyroscopeEventStream().listen((GyroscopeEvent event) {
        _gyroX = event.x;
        _gyroY = event.y;
        _gyroZ = event.z;
      });
    }

    _processingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _processSensorFusion();
    });

    debugPrint('[SensorMonitorService] ✅ Started — sensor fusion active.');
  }

  void stop() {
    _isRunning = false;
    _accelSub?.cancel();
    _gyroSub?.cancel();
    _processingTimer?.cancel();
    debugPrint('[SensorMonitorService] ⛔ Stopped.');
  }

  Future<void> _processSensorFusion() async {
    if (!_isRunning) return;

    try {
      // 1. Get GPS Data
      Position pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      _currentSpeedKmh = pos.speed * 3.6;

      _speedHistory.add(_currentSpeedKmh);
      if (_speedHistory.length > 5) _speedHistory.removeAt(0);

      // 2. Determine Max G-Force in this window
      double currentMaxG =
          _gForceWindow.isNotEmpty ? _gForceWindow.reduce(max) : 1.0;
      _gForceWindow.clear();

      if (currentMaxG > _maxGForceLast3Secs) {
        _maxGForceLast3Secs = currentMaxG;
        Timer(const Duration(seconds: 3), () {
          _maxGForceLast3Secs = 1.0;
        });
      }

      // 3. Log Telemetry via Offline Sync Service
      final log = TelemetryLog(
        latitude: pos.latitude,
        longitude: pos.longitude,
        speedKmh: _currentSpeedKmh,
        accelerationG: currentMaxG,
        timestamp: DateTime.now(),
      );
      await OfflineSyncService().enqueueTelemetryLog(log);

      // 4. Calculate Confidence Score (0-100)
      int riskScore = _calculateRiskScore(currentMaxG);

      // 5. Publish state to UI observers
      _stateController.add(SensorState(
        speed: _currentSpeedKmh,
        gForce: currentMaxG,
        riskScore: riskScore,
        latitude: pos.latitude,
        longitude: pos.longitude,
        accelX: _accelX,
        accelY: _accelY,
        accelZ: _accelZ,
        gyroX: _gyroX,
        gyroY: _gyroY,
        gyroZ: _gyroZ,
      ));

      // 6. Trigger emergency verification if threshold met
      if (riskScore >= 61) {
        _handleHighRisk(riskScore, pos.latitude, pos.longitude);
      }
    } catch (e) {
      debugPrint('[SensorMonitorService] Error: $e');
    }
  }

  /// Risk score calculation using multi-signal fusion.
  ///
  /// Thresholds:
  ///   Impact Strength (max 35 pts):
  ///     > 6.0G = 35 pts (Severe impact)
  ///     > 4.0G = 15 pts (Warning impact)
  ///     > 2.5G = 5 pts  (Minor bump — ignored for emergency)
  ///
  ///   Speed Drop (max 20 pts):
  ///     > 40 km/h → < 5 km/h in 3s = 20 pts (Sudden stop)
  ///     > 20 km/h → < 2 km/h = 10 pts
  ///
  ///   Phone Orientation Anomaly (max 15 pts):
  ///     Z < -7.0 + G > 3.0 = 15 pts (phone upside down after impact)
  ///     X > 7.0 + G > 3.0 = 10 pts (phone on its side after impact)
  ///
  ///   Gyroscope Tumble (max 15 pts):
  ///     Angular velocity > 8 rad/s = 15 pts (phone tumbling violently)
  ///     Angular velocity > 5 rad/s = 10 pts
  ///
  ///   Sustained Stillness After Impact (max 15 pts):
  ///     G was > 4.0 in last 3s AND speed is now < 2 km/h = 15 pts
  int _calculateRiskScore(double maxG) {
    int score = 0;

    // A. Impact Strength (Max 35)
    if (maxG > 6.0) {
      score += 35;
    } else if (maxG > 4.0) {
      score += 15;
    } else if (maxG > 2.5) {
      score += 5;
    }

    // B. Speed Drop Context (Max 20)
    if (_speedHistory.length >= 3) {
      double oldestSpeed = _speedHistory.first;
      if (oldestSpeed > 40.0 && _currentSpeedKmh < 5.0) {
        score += 20;
      } else if (oldestSpeed > 20.0 && _currentSpeedKmh < 2.0) {
        score += 10;
      }
    }

    // C. Phone Orientation Anomaly (Max 15)
    if (_accelZ < -7.0 && maxG > 3.0) {
      score += 15;
    } else if (maxG > 3.0 && _accelX.abs() > 7.0) {
      score += 10;
    }

    // D. Gyroscope Tumble Detection (Max 15) — NEW
    double angularVelocity = sqrt(_gyroX * _gyroX + _gyroY * _gyroY + _gyroZ * _gyroZ);
    if (angularVelocity > 8.0 && maxG > 2.5) {
      score += 15;
    } else if (angularVelocity > 5.0 && maxG > 2.0) {
      score += 10;
    }

    // E. Sustained Stillness After Impact (Max 15) — NEW
    if (_maxGForceLast3Secs > 4.0 && _currentSpeedKmh < 2.0) {
      score += 15;
    }

    return min(100, score);
  }

  /// Handle high risk detection — trigger VerificationService.
  void _handleHighRisk(int score, double lat, double lng) {
    // Cooldown check to prevent rapid re-triggers
    if (_lastEmergencyTrigger != null) {
      final elapsed = DateTime.now().difference(_lastEmergencyTrigger!);
      if (elapsed < _emergencyCooldown) {
        debugPrint('[SensorMonitorService] Emergency cooldown active. Ignoring.');
        return;
      }
    }

    // Check if VerificationService is already running
    if (VerificationService().state != VerificationState.idle &&
        VerificationService().state != VerificationState.cancelled &&
        VerificationService().state != VerificationState.dispatched) {
      debugPrint('[SensorMonitorService] Verification already in progress. Ignoring.');
      return;
    }

    _lastEmergencyTrigger = DateTime.now();

    debugPrint('[SensorMonitorService] ═══════════════════════════════════');
    debugPrint('[SensorMonitorService] 🚨 HIGH RISK DETECTED: $score');
    debugPrint('[SensorMonitorService] Triggering VerificationService...');
    debugPrint('[SensorMonitorService] ═══════════════════════════════════');

    // Trigger the headless verification pipeline
    VerificationService().startVerification(
      score: score,
      lat: lat,
      lng: lng,
    );

    // Also notify UI that emergency workflow has started
    _stateController.add(SensorState(
      speed: _currentSpeedKmh,
      gForce: _maxGForceLast3Secs,
      riskScore: score,
      latitude: lat,
      longitude: lng,
      accelX: _accelX,
      accelY: _accelY,
      accelZ: _accelZ,
      gyroX: _gyroX,
      gyroY: _gyroY,
      gyroZ: _gyroZ,
      emergencyTriggered: true,
    ));
  }

  void dispose() {
    stop();
    _stateController.close();
  }
}

/// Typed state snapshot emitted by SensorMonitorService.
class SensorState {
  final double speed;
  final double gForce;
  final int riskScore;
  final double latitude;
  final double longitude;
  final double accelX, accelY, accelZ;
  final double gyroX, gyroY, gyroZ;
  final bool emergencyTriggered;

  SensorState({
    required this.speed,
    required this.gForce,
    required this.riskScore,
    required this.latitude,
    required this.longitude,
    this.accelX = 0.0,
    this.accelY = 0.0,
    this.accelZ = 0.0,
    this.gyroX = 0.0,
    this.gyroY = 0.0,
    this.gyroZ = 0.0,
    this.emergencyTriggered = false,
  });
}