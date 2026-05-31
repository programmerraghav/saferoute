import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:uuid/uuid.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/emergency_event.dart';
import 'offline_sync_service.dart';

/// SosService handles the actual emergency dispatch pipeline.
///
/// Responsibilities:
/// - Creates EmergencyEvent records
/// - Persists to Hive (offline-first) via OfflineSyncService
/// - Triggers external notifications (SMS, Firestore alerts)
/// - Notifies emergency contacts
/// - Provides dispatch status stream for UI observation
class SosService {
  static final SosService _instance = SosService._internal();
  factory SosService() => _instance;
  SosService._internal();

  final StreamController<SosDispatchStatus> _statusController =
      StreamController<SosDispatchStatus>.broadcast();
  Stream<SosDispatchStatus> get statusStream => _statusController.stream;

  bool _isDispatching = false;
  String? _lastDispatchedEventId;

  String? get lastDispatchedEventId => _lastDispatchedEventId;
  bool get isDispatching => _isDispatching;

  /// Main dispatch method — called by VerificationService or manual SOS.
  ///
  /// [riskScore] - The sensor fusion confidence score (0-100)
  /// [eventType] - 'AUTO_TIMEOUT', 'MANUAL_SOS', 'CRASH_DETECTED', 'VOICE_CONFIRMED'
  /// [latitude], [longitude] - GPS coordinates at time of event
  Future<String> dispatchSOS({
    required int riskScore,
    required String eventType,
    double? latitude,
    double? longitude,
  }) async {
    if (_isDispatching) {
      debugPrint('[SosService] Already dispatching, skipping duplicate.');
      return _lastDispatchedEventId ?? 'DUPLICATE';
    }
    _isDispatching = true;
    _statusController.add(SosDispatchStatus.dispatching);

    try {
      // 1. Get current GPS if not provided
      double lat = latitude ?? 0.0;
      double lng = longitude ?? 0.0;
      if (lat == 0.0 && lng == 0.0) {
        try {
          Position pos = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
          ).timeout(const Duration(seconds: 5));
          lat = pos.latitude;
          lng = pos.longitude;
        } catch (e) {
          debugPrint('[SosService] GPS fallback failed: $e');
        }
      }

      // 2. Create EmergencyEvent
      final eventId = const Uuid().v4();
      _lastDispatchedEventId = eventId;

      final event = EmergencyEvent(
        eventId: eventId,
        eventType: eventType,
        latitude: lat,
        longitude: lng,
        riskScore: riskScore.toDouble(),
        timestamp: DateTime.now(),
        status: 'DISPATCHED',
      );

      // 3. Persist to Hive (offline-first) and sync to Firestore
      await OfflineSyncService().enqueueEmergencyEvent(event);

      // 4. Notify emergency contacts via Firestore alert document
      await _createFirestoreAlert(eventId, eventType, riskScore, lat, lng);

      // 5. Attempt to contact emergency contacts via SMS/Call
      await _notifyEmergencyContacts(lat, lng, eventType);

      _statusController.add(SosDispatchStatus.dispatched);
      debugPrint('[SosService] ✅ SOS DISPATCHED: $eventId | Type: $eventType | Score: $riskScore');
      return eventId;
    } catch (e) {
      debugPrint('[SosService] ❌ Dispatch error: $e');
      _statusController.add(SosDispatchStatus.error);
      return 'ERROR';
    } finally {
      _isDispatching = false;
    }
  }

  /// Creates a real-time Firestore alert document that can be observed
  /// by dashboards, fleet operators, and emergency contacts.
  Future<void> _createFirestoreAlert(
    String eventId,
    String eventType,
    int riskScore,
    double lat,
    double lng,
  ) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      await FirebaseFirestore.instance
          .collection('sos_alerts')
          .doc(eventId)
          .set({
        'eventId': eventId,
        'userId': user.uid,
        'userName': user.displayName ?? user.email ?? 'Unknown Driver',
        'eventType': eventType,
        'riskScore': riskScore,
        'latitude': lat,
        'longitude': lng,
        'timestamp': FieldValue.serverTimestamp(),
        'status': 'ACTIVE',
        'resolvedAt': null,
        'googleMapsUrl': 'https://maps.google.com/?q=$lat,$lng',
      });
    } catch (e) {
      debugPrint('[SosService] Firestore alert error: $e');
    }
  }

  /// Fetches emergency contacts from Firestore and attempts to alert them.
  Future<void> _notifyEmergencyContacts(
    double lat,
    double lng,
    String eventType,
  ) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      final snapshot = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('emergency_contacts')
          .get();

      for (var doc in snapshot.docs) {
        final data = doc.data();
        final phone = data['phone'] as String?;
        if (phone != null && phone.isNotEmpty) {
          // Try sending SMS with location
          final mapsUrl = 'https://maps.google.com/?q=$lat,$lng';
          final message = 'EMERGENCY ALERT: $eventType detected! '
              'Driver needs help. Location: $mapsUrl';

          final smsUri = Uri.parse(
              'sms:$phone?body=${Uri.encodeComponent(message)}');

          try {
            if (await canLaunchUrl(smsUri)) {
              await launchUrl(smsUri);
            }
          } catch (e) {
            debugPrint('[SosService] SMS launch error for $phone: $e');
          }
        }
      }
    } catch (e) {
      debugPrint('[SosService] Emergency contacts notification error: $e');
    }
  }

  /// Cancel/resolve an active SOS event
  Future<void> resolveSOS(String eventId, {String reason = 'USER_CANCELLED'}) async {
    try {
      await FirebaseFirestore.instance
          .collection('sos_alerts')
          .doc(eventId)
          .update({
        'status': 'RESOLVED',
        'resolvedAt': FieldValue.serverTimestamp(),
        'resolvedReason': reason,
      });
      _statusController.add(SosDispatchStatus.resolved);
      debugPrint('[SosService] SOS Resolved: $eventId');
    } catch (e) {
      debugPrint('[SosService] Resolve error: $e');
    }
  }

  void dispose() {
    _statusController.close();
  }
}

enum SosDispatchStatus {
  idle,
  dispatching,
  dispatched,
  error,
  resolved,
}
