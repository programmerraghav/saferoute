import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_tts/flutter_tts.dart';
import 'package:firebase_auth/firebase_auth.dart';

import 'vehicle_service.dart';

class DriverTelemetryService {
  static final DriverTelemetryService _instance =
      DriverTelemetryService._internal();
  factory DriverTelemetryService() => _instance;
  DriverTelemetryService._internal();

  bool _isRunning = false;
  Timer? _timer;
  
  double _currentSpeedKmh = 0;
  VehicleProfile? _profile;

  static const int pollIntervalSec = 3;
  static const double maxGpsAccuracy = 60.0;
  static const String webhookUrl =
      'https://abhinavcheepa7.app.n8n.cloud/webhook/driver-telemetry';

  final List<Map<String, dynamic>> _offlinePayloadQueue = [];
  final Map<String, DateTime> _lastAlertTime = {};
  final Map<String, double> _alertTriggerSpeeds = {};
  final Map<String, bool> _alertAcknowledged = {};

  final StreamController<Map<String, dynamic>> _driverStateController =
      StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get driverStateStream =>
      _driverStateController.stream;

  DateTime? _backgroundSince;
  bool _isInBackground = false;

  // TTS
  final FlutterTts _tts = FlutterTts();

  // Get real userName
  String get _userName {
    final user = FirebaseAuth.instance.currentUser;
    return user?.displayName ?? user?.email ?? 'Driver';
  }

  Future<void> _initTts() async {
    await _tts.setLanguage('hi-IN');
    await _tts.setSpeechRate(0.5);
    await _tts.setVolume(1.0);
  }

  Future<void> _speak(String text) async {
    try {
      await _tts.stop();
      await _tts.speak(text);
    } catch (e) {
      debugPrint('[TTS] Error: $e');
    }
  }

  Future<void> init() async {
    await _initTts();
  }

  void setAppLifecycleState(bool isBackground) {
    _isInBackground = isBackground;
    if (isBackground) {
      _backgroundSince = DateTime.now();
    } else {
      _backgroundSince = null;
      if (_isRunning && _timer == null) {
        start();
      }
    }
  }

  Future<void> start() async {
    if (_isRunning) return;
    _isRunning = true;

    _profile = await VehicleService.getVehicleProfile() ??
        VehicleService.getDefaultsForType('car');

    await init();

    _timer = Timer.periodic(
        const Duration(seconds: pollIntervalSec), (timer) async {
      await _onTick();
    });

    await _onTick();
  }

  void stop() {
    _isRunning = false;
    _timer?.cancel();
    _timer = null;
    _tts.stop();
  }

  Future<void> _onTick() async {
    if (!_isRunning) return;

    if (_isInBackground &&
        _backgroundSince != null &&
        _currentSpeedKmh < 1.0) {
      final idleDuration =
          DateTime.now().difference(_backgroundSince!);
      if (idleDuration.inMinutes >= 2) {
        _timer?.cancel();
        _timer = null;
        debugPrint(
            '[DriverTelemetryService] Battery optimization triggered.');
        return;
      }
    }

    try {
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );

      final double accuracyLimit =
          kIsWeb ? 250.0 : maxGpsAccuracy;
      if (position.accuracy > accuracyLimit) {
        debugPrint(
            '[DriverTelemetryService] Low accuracy skipped: ${position.accuracy}m');
        return;
      }

      _currentSpeedKmh = position.speed * 3.6;

      List<Map<String, dynamic>> nearbyPotholes =
          await _fetchPotholesInBoundingBox(
              position.latitude, position.longitude);

      List<Map<String, dynamic>> processedPotholes = [];
      String currentVerdict = 'NORMAL';
      String? voiceAlertMessage;
      Map<String, dynamic>? closestCriticalPothole;
      double closestDistance = double.infinity;

      for (var pothole in nearbyPotholes) {
        double dist = _calculateDistance(position.latitude,
            position.longitude, pothole['latitude'], pothole['longitude']);

        if (dist <= 500.0) {
          pothole['distance_m'] = dist;

          if (dist <= 50.0) {
            Map<String, dynamic> riskResult =
                _calculateRiskScore(pothole, dist);
            pothole.addAll(riskResult);

            if (dist < closestDistance) {
              closestDistance = dist;
              closestCriticalPothole = pothole;
              currentVerdict = riskResult['alertLevel'];
            }
          }
          processedPotholes.add(pothole);
        }
      }

      _checkSpeedAcknowledgment();

      if (closestCriticalPothole != null) {
        voiceAlertMessage = await _handleVoiceAlerts(
            closestCriticalPothole, closestDistance);
      }

      final payload = {
        'userId': VehicleService.userId,
        'userName': _userName,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'speedKmh': _currentSpeedKmh,
        'vehicleType': _profile?.vehicleType ?? 'car',
        'wheelbaseM': _profile?.wheelbaseM ?? 2.6,
        'groundClearanceMm': _profile?.groundClearanceMm ?? 170.0,
        'nearbyPotholes': processedPotholes
            .where((p) => p['distance_m'] <= 50.0)
            .toList(),
        'timestamp': DateTime.now().toUtc().toIso8601String(),
      };

      await _sendPayload(payload);

      _driverStateController.add({
        'position': position,
        'speed': _currentSpeedKmh,
        'verdict': currentVerdict,
        'potholes': processedPotholes,
        'voiceAlert': voiceAlertMessage,
      });
    } catch (e) {
      debugPrint('[DriverTelemetryService] Error in tick: $e');
    }
  }

  Future<List<Map<String, dynamic>>> _fetchPotholesInBoundingBox(
      double lat, double lng) async {
    const double radiusInMeters = 200.0;
    const double latDegreeDistance = 111000.0;

    double deltaLat = radiusInMeters / latDegreeDistance;
    double deltaLng =
        radiusInMeters / (latDegreeDistance * cos(lat * pi / 180.0));

    double minLat = lat - deltaLat;
    double maxLat = lat + deltaLat;

    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('complaints')
          .where('complaint_type', isEqualTo: 'pothole')
          .where('latitude', isGreaterThanOrEqualTo: minLat)
          .where('latitude', isLessThanOrEqualTo: maxLat)
          .get();

      List<Map<String, dynamic>> potholes = [];
      for (var doc in snapshot.docs) {
        final data = doc.data();
        double pLat = (data['latitude'] ?? 0.0).toDouble();
        double pLng = (data['longitude'] ?? 0.0).toDouble();

        double minLng = lng - deltaLng;
        double maxLng = lng + deltaLng;
        if (pLng >= minLng && pLng <= maxLng) {
          potholes.add({
            'id': doc.id,
            'complaint_id': data['complaint_id'] ?? 'CMP-MOCK',
            'latitude': pLat,
            'longitude': pLng,
            'depthCm':
                (data['depthCm'] ?? data['severity_score'] ?? 5.0).toDouble(),
            'widthCm': (data['widthCm'] ?? 30.0).toDouble(),
            'severity': data['severity_score'] != null &&
                    data['severity_score'] >= 7
                ? 'HIGH'
                : 'MEDIUM',
            'landmark': data['location'] ?? 'Nearby Road',
          });
        }
      }
      return potholes;
    } catch (e) {
      debugPrint(
          '[DriverTelemetryService] Bounding box fetch failed: $e');
      return [];
    }
  }

  double _calculateDistance(
      double lat1, double lon1, double lat2, double lon2) {
    const R = 6371000.0;
    double dLat = (lat2 - lat1) * pi / 180.0;
    double dLon = (lon2 - lon1) * pi / 180.0;
    double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * pi / 180.0) *
            cos(lat2 * pi / 180.0) *
            sin(dLon / 2) *
            sin(dLon / 2);
    double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c;
  }

  Map<String, dynamic> _calculateRiskScore(
      Map<String, dynamic> pothole, double distance) {
    double depth = pothole['depthCm'] ?? 5.0;
    double width = pothole['widthCm'] ?? 30.0;

    int riskScore = 0;
    if (depth > 10.0) {
      riskScore += 3;
    } else if (depth > 5.0) riskScore += 1;
    if (width > 50.0) riskScore += 2;
    if (_currentSpeedKmh > 40.0) riskScore += 2;
    if ((_profile?.vehicleType ?? 'car') == 'bike') riskScore += 2;

    double gcMm = _profile?.groundClearanceMm ?? 170.0;
    if (gcMm < (depth * 10.0)) riskScore += 3;

    String alertLevel = 'CAUTION';
    if (riskScore >= 6) {
      alertLevel = 'CRITICAL';
    } else if (riskScore >= 4) alertLevel = 'WARNING';

    bool canCrossSafely = riskScore < 4;
    double speedMps = _currentSpeedKmh / 3.6;
    double timeToImpact =
        speedMps > 0.5 ? distance / speedMps : double.infinity;

    if (timeToImpact < 4.0 && speedMps > 0.5) {
      if (alertLevel == 'CAUTION') {
        alertLevel = 'WARNING';
      } else if (alertLevel == 'WARNING') alertLevel = 'CRITICAL';
    }

    return {
      'riskScore': riskScore,
      'alertLevel': alertLevel,
      'canCrossSafely': canCrossSafely,
      'timeToImpact': timeToImpact,
    };
  }

  Future<String?> _handleVoiceAlerts(
      Map<String, dynamic> pothole, double distance) async {
    String id = pothole['id'];
    String level = pothole['alertLevel'];
    DateTime now = DateTime.now();

    if (_lastAlertTime.containsKey(id)) {
      final elapsed = now.difference(_lastAlertTime[id]!);
      if (elapsed.inSeconds < 60) {
        bool isAt25mZone = distance <= 27.0 && distance >= 20.0;
        if (isAt25mZone) {
          double prevTriggerSpeed = _alertTriggerSpeeds[id] ?? 0.0;
          if (_currentSpeedKmh >= prevTriggerSpeed * 0.8 &&
              _currentSpeedKmh > 10.0) {
            return await _speakAlert(level, distance, id);
          }
        }
        return null;
      }
    }

    if (distance <= 50.0) {
      _lastAlertTime[id] = now;
      _alertTriggerSpeeds[id] = _currentSpeedKmh;
      _alertAcknowledged[id] = false;
      return await _speakAlert(level, distance, id);
    }

    return null;
  }

  Future<String> _speakAlert(
      String level, double distance, String potholeId) async {
    String text = '';
    int roundedDist = distance.round();

    if (level == 'CRITICAL') {
      text =
          "Rukiye! Aage khatra hai. Pothole bahut gehra hai. Ruk kar rasta badlein.";
    } else if (level == 'WARNING') {
      text =
          "Savdhan! $roundedDist meter par bada pothole hai. Speed kam karein.";
    } else {
      text = "Aage $roundedDist meter par pothole hai. Dheere chalein.";
    }

    debugPrint('[Voice Alert] Alert ($level): $text');

    // TTS se bolega
    await _speak(text);

    return text;
  }

  void _checkSpeedAcknowledgment() {
    DateTime now = DateTime.now();
    _lastAlertTime.forEach((id, alertTime) {
      if (now.difference(alertTime).inSeconds < 30 &&
          !(_alertAcknowledged[id] ?? true)) {
        double initialSpeed = _alertTriggerSpeeds[id] ?? 0.0;
        if (initialSpeed > 15.0) {
          double speedDropPct =
              (initialSpeed - _currentSpeedKmh) / initialSpeed;
          if (speedDropPct >= 0.30) {
            _alertAcknowledged[id] = true;
            debugPrint(
                '[DriverTelemetryService] Alert acknowledged for $id! Speed reduced by ${(speedDropPct * 100).round()}%');
            try {
              FirebaseFirestore.instance
                  .collection('alert_acknowledgments')
                  .add({
                'userId': VehicleService.userId,
                'potholeId': id,
                'initialSpeed': initialSpeed,
                'reducedSpeed': _currentSpeedKmh,
                'reductionPercentage': speedDropPct * 100,
                'timestamp': FieldValue.serverTimestamp(),
              });
            } catch (err) {
              debugPrint('Error logging acknowledgment: $err');
            }
          }
        }
      }
    });
  }

  Future<void> _sendPayload(Map<String, dynamic> payload) async {
    try {
      if (_offlinePayloadQueue.isNotEmpty) {
        List<Map<String, dynamic>> queueCopy =
            List.from(_offlinePayloadQueue);
        _offlinePayloadQueue.clear();
        for (var queued in queueCopy) {
          await _postToWebhook(queued);
        }
      }
      await _postToWebhook(payload);
    } catch (e) {
      debugPrint(
          '[DriverTelemetryService] Webhook failed, queuing: $e');
      _offlinePayloadQueue.add(payload);
      if (_offlinePayloadQueue.length > 100) {
        _offlinePayloadQueue.removeAt(0);
      }
    }
  }

  Future<void> _postToWebhook(Map<String, dynamic> payload) async {
    final response = await http
        .post(
          Uri.parse(webhookUrl),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(payload),
        )
        .timeout(const Duration(seconds: 4));

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Server returned ${response.statusCode}');
    }
  }
}