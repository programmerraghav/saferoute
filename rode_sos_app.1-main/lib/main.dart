import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import 'firebase_options.dart';
import 'screens/splash_screen.dart';
import 'models/telemetry_log.dart';
import 'models/emergency_event.dart';
import 'services/offline_sync_service.dart';
import 'services/background_service.dart';
import 'services/vapi_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive Offline Storage
  await Hive.initFlutter();
  Hive.registerAdapter(TelemetryLogAdapter());
  Hive.registerAdapter(EmergencyEventAdapter());
  await Hive.openBox<TelemetryLog>('telemetry');
  await Hive.openBox<EmergencyEvent>('emergencies');

  // Initialize Background Monitoring Layer
  await initializeBackgroundService();

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );

    // Anonymous sign-in for prototyping 
    if (FirebaseAuth.instance.currentUser == null) {
      FirebaseAuth.instance.signInAnonymously().catchError((e) {
        debugPrint('Firebase Auth Error: $e');
        return Future<UserCredential>.error(e);
      });
    }
  } catch (e) {
    debugPrint('Firebase init error: $e');
  }

  // Initialize VAPI Service (fetches config from Firestore)
  await VapiService().initialize();

  // Monitor Network state for Offline Sync queueing
  Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> results) {
    if (!results.contains(ConnectivityResult.none)) {
      OfflineSyncService().syncAllUnsyncedData();
    }
  });

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Driver Safety Platform',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F172A),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}