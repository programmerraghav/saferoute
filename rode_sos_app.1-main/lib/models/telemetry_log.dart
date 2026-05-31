import 'package:hive/hive.dart';

part 'telemetry_log.g.dart';

@HiveType(typeId: 0)
class TelemetryLog extends HiveObject {
  @HiveField(0)
  final double latitude;

  @HiveField(1)
  final double longitude;

  @HiveField(2)
  final double speedKmh;

  @HiveField(3)
  final double accelerationG;

  @HiveField(4)
  final DateTime timestamp;

  @HiveField(5)
  bool isSynced;

  TelemetryLog({
    required this.latitude,
    required this.longitude,
    required this.speedKmh,
    required this.accelerationG,
    required this.timestamp,
    this.isSynced = false,
  });

  Map<String, dynamic> toJson() => {
        'latitude': latitude,
        'longitude': longitude,
        'speedKmh': speedKmh,
        'accelerationG': accelerationG,
        'timestamp': timestamp.toIso8601String(),
      };
}
