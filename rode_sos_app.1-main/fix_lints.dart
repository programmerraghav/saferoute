import 'dart:io';

void main() {
  var fixes = {
    'lib/screens/complaint_screen.dart': [
      ['bool _submitted = false;', ''],
      ['desiredAccuracy: LocationAccuracy.high', 'locationSettings: const LocationSettings(accuracy: LocationAccuracy.high)'],
      ['.withOpacity(0.1)', '.withValues(alpha: 0.1)'],
      ['.withOpacity(0.5)', '.withValues(alpha: 0.5)'],
      ['.withOpacity(0.8)', '.withValues(alpha: 0.8)'],
    ],
    'lib/screens/home_screen.dart': [
      ['.withOpacity(0.2)', '.withValues(alpha: 0.2)'],
      ['.withOpacity(0.1)', '.withValues(alpha: 0.1)'],
      ['.withOpacity(0.5)', '.withValues(alpha: 0.5)'],
    ],
    'lib/screens/my_complaints_screen.dart': [
      ['.withOpacity(0.5)', '.withValues(alpha: 0.5)'],
      ['.withOpacity(0.1)', '.withValues(alpha: 0.1)'],
    ],
    'lib/screens/splash_screen.dart': [
      ['.withOpacity(0.2)', '.withValues(alpha: 0.2)'],
    ],
    'lib/services/driver_telemetry_service.dart': [
      ['Position? _lastPosition;', ''],
      ['desiredAccuracy: LocationAccuracy.high', 'locationSettings: const LocationSettings(accuracy: LocationAccuracy.high)'],
    ],
    'lib/services/offline_sync_service.dart': [
      ["print('Failed to sync", "debugPrint('Failed to sync"],
    ],
    'lib/services/sensor_monitor_service.dart': [
      ['accelerometerEvents.listen', 'accelerometerEventStream().listen'],
      ['gyroscopeEvents.listen', 'gyroscopeEventStream().listen'],
      ['desiredAccuracy: LocationAccuracy.high', 'locationSettings: const LocationSettings(accuracy: LocationAccuracy.high)'],
    ],
    'lib/services/sos_service.dart': [
      ['desiredAccuracy: LocationAccuracy.high', 'locationSettings: const LocationSettings(accuracy: LocationAccuracy.high)'],
    ],
    'lib/services/vehicle_service.dart': [
      ["print('Failed to load", "debugPrint('Failed to load"],
    ],
  };

  for (var file in fixes.keys) {
    var f = File(file);
    if (!f.existsSync()) continue;
    var content = f.readAsStringSync();
    for (var fix in fixes[file]!) {
      content = content.replaceAll(fix[0], fix[1]);
    }
    f.writeAsStringSync(content);
  }
}
