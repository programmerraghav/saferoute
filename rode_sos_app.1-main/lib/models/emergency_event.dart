import 'package:hive/hive.dart';

part 'emergency_event.g.dart';

@HiveType(typeId: 1)
class EmergencyEvent extends HiveObject {
  @HiveField(0)
  final String eventId;

  @HiveField(1)
  final String eventType; // "MANUAL_SOS", "CRASH_DETECTED", "MEDICAL_EMERGENCY"

  @HiveField(2)
  final double latitude;

  @HiveField(3)
  final double longitude;

  @HiveField(4)
  final double riskScore;

  @HiveField(5)
  final DateTime timestamp;

  @HiveField(6)
  final String status; // "PENDING_VERIFICATION", "VERIFIED", "DISPATCHED", "RESOLVED", "FALSE_ALARM"

  @HiveField(7)
  bool isSynced;

  EmergencyEvent({
    required this.eventId,
    required this.eventType,
    required this.latitude,
    required this.longitude,
    required this.riskScore,
    required this.timestamp,
    required this.status,
    this.isSynced = false,
  });

  Map<String, dynamic> toJson() => {
        'eventId': eventId,
        'eventType': eventType,
        'latitude': latitude,
        'longitude': longitude,
        'riskScore': riskScore,
        'timestamp': timestamp.toIso8601String(),
        'status': status,
      };
}
