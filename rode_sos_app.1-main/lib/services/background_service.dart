import 'dart:async';
import 'dart:ui';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';

Future<void> initializeBackgroundService() async {
  if (kIsWeb) {
    debugPrint("Background service not supported on Web. Skipping initialization.");
    return;
  }
  if (!Platform.isAndroid && !Platform.isIOS) {
    debugPrint("Background service only supported on Android and iOS. Skipping initialization.");
    return;
  }

  final service = FlutterBackgroundService();

  await service.configure(
    androidConfiguration: AndroidConfiguration(
      onStart: onStart,
      autoStart: false, // Start explicitly via UI toggle
      isForegroundMode: true,
      notificationChannelId: 'road_safety_channel',
      initialNotificationTitle: 'Safety Shield Active',
      initialNotificationContent: 'Monitoring GPS and sensors',
      foregroundServiceNotificationId: 888,
    ),
    iosConfiguration: IosConfiguration(
      autoStart: false,
      onForeground: onStart,
      onBackground: onIosBackground,
    ),
  );
}

@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async {
  WidgetsFlutterBinding.ensureInitialized();
  DartPluginRegistrant.ensureInitialized();
  return true;
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  if (service is AndroidServiceInstance) {
    service.on('setAsForeground').listen((event) {
      service.setAsForegroundService();
    });
    service.on('setAsBackground').listen((event) {
      service.setAsBackgroundService();
    });
  }

  service.on('stopService').listen((event) {
    service.stopSelf();
  });

  // Continuous monitoring loop (will be expanded in Phase 2)
  Timer.periodic(const Duration(seconds: 2), (timer) async {
    if (service is AndroidServiceInstance) {
      if (await service.isForegroundService()) {
        service.setForegroundNotificationInfo(
          title: "Safety Shield Active",
          content: "Background telemetry running...",
        );
      }
    }

    // Send heartbeat to main UI
    service.invoke('update', {
      "timestamp": DateTime.now().toIso8601String(),
      "status": "RUNNING",
    });
  });
}
