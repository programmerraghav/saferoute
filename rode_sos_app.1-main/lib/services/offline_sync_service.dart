import 'package:hive/hive.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/telemetry_log.dart';
import '../models/emergency_event.dart';

class OfflineSyncService {
  static final OfflineSyncService _instance = OfflineSyncService._internal();
  factory OfflineSyncService() => _instance;
  OfflineSyncService._internal();

  bool _isSyncing = false;

  Future<void> syncAllUnsyncedData() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return; // Cannot sync if not logged in

      final firestore = FirebaseFirestore.instance;

      // Sync Telemetry Logs
      final telemetryBox = Hive.box<TelemetryLog>('telemetry');
      final unsyncedLogs = telemetryBox.values.where((log) => !log.isSynced).toList();
      
      for (var log in unsyncedLogs) {
        await firestore
            .collection('users')
            .doc(user.uid)
            .collection('telemetry_logs')
            .add(log.toJson());
        
        log.isSynced = true;
        await log.save(); // update Hive
      }

      // Sync Emergency Events
      final emergencyBox = Hive.box<EmergencyEvent>('emergencies');
      final unsyncedEvents = emergencyBox.values.where((event) => !event.isSynced).toList();

      for (var event in unsyncedEvents) {
        await firestore
            .collection('users')
            .doc(user.uid)
            .collection('incidents')
            .doc(event.eventId) // Use eventId as doc ID
            .set(event.toJson(), SetOptions(merge: true));
        
        event.isSynced = true;
        await event.save();
      }
    } catch (e) {
      print('OfflineSyncService Error: $e');
    } finally {
      _isSyncing = false;
    }
  }

  // Add event to queue and attempt sync
  Future<void> enqueueEmergencyEvent(EmergencyEvent event) async {
    final box = Hive.box<EmergencyEvent>('emergencies');
    await box.add(event);
    syncAllUnsyncedData();
  }

  Future<void> enqueueTelemetryLog(TelemetryLog log) async {
    final box = Hive.box<TelemetryLog>('telemetry');
    await box.add(log);
    syncAllUnsyncedData();
  }
}
