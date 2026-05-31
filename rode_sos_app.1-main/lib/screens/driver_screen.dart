import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';

import '../services/sensor_monitor_service.dart';
import '../services/verification_service.dart';
import 'emergency_contacts_screen.dart';
import 'vapi_verification_screen.dart';

class DriverScreen extends StatefulWidget {
  const DriverScreen({super.key});

  @override
  State<DriverScreen> createState() => _DriverScreenState();
}

class _DriverScreenState extends State<DriverScreen> with TickerProviderStateMixin {
  bool _isActive = false;

  // Real-time stats
  double _currentSpeedKmh = 0.0;
  double _currentGForce = 1.0;
  int _riskScore = 0;
  LatLng _currentLocation = const LatLng(23.1815, 79.9864);

  StreamSubscription<SensorState>? _sensorSub;
  StreamSubscription<VerificationUpdate>? _verificationSub;
  final MapController _mapController = MapController();

  late AnimationController _sosPulseController;
  late AnimationController _shieldGlowController;

  @override
  void initState() {
    super.initState();
    _sosPulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _shieldGlowController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);

    _initLocation();

    // Listen to VerificationService for emergency navigation
    _verificationSub = VerificationService().stateStream.listen((update) {
      if (!mounted) return;
      if (update.state == VerificationState.attempt1 &&
          update.attempt == 1) {
        // Auto-navigate to verification screen when emergency is triggered
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => VapiVerificationScreen(
              initialScore: update.riskScore,
            ),
          ),
        );
      }
    });
  }

  Future<void> _initLocation() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    try {
      Position pos = await Geolocator.getCurrentPosition();
      if (mounted) {
        setState(() {
          _currentLocation = LatLng(pos.latitude, pos.longitude);
        });
        _mapController.move(_currentLocation, 16.0);
      }
    } catch (e) {
      debugPrint('[DriverScreen] Location init error: $e');
    }
  }

  void _toggleAgent() {
    setState(() {
      _isActive = !_isActive;
    });

    if (_isActive) {
      SensorMonitorService().start();
      _sensorSub = SensorMonitorService().stateStream.listen((state) {
        if (!mounted) return;

        // Handle emergency trigger → navigate to verification screen
        if (state.emergencyTriggered) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => VapiVerificationScreen(initialScore: state.riskScore),
            ),
          );
          return;
        }

        setState(() {
          _currentSpeedKmh = state.speed;
          _currentGForce = state.gForce;
          _riskScore = state.riskScore;
          _currentLocation = LatLng(state.latitude, state.longitude);
          _mapController.move(_currentLocation, 16.0);
        });
      });
    } else {
      SensorMonitorService().stop();
      _sensorSub?.cancel();
      setState(() {
        _currentSpeedKmh = 0.0;
        _currentGForce = 1.0;
        _riskScore = 0;
      });
    }
  }

  @override
  void dispose() {
    _sensorSub?.cancel();
    _verificationSub?.cancel();
    _sosPulseController.dispose();
    _shieldGlowController.dispose();
    super.dispose();
  }

  void _triggerManualSOS() {
    // Manual SOS triggers verification at max score
    VerificationService().startVerification(
      score: 100,
      lat: _currentLocation.latitude,
      lng: _currentLocation.longitude,
    );

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const VapiVerificationScreen(initialScore: 100),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            AnimatedBuilder(
              animation: _shieldGlowController,
              builder: (context, child) {
                return Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _isActive
                        ? Colors.greenAccent.withValues(
                            alpha: 0.5 + (_shieldGlowController.value * 0.5))
                        : Colors.grey.withValues(alpha: 0.4),
                    boxShadow: _isActive
                        ? [
                            BoxShadow(
                              color: Colors.greenAccent.withValues(alpha: 0.6),
                              blurRadius: 8,
                              spreadRadius: 2,
                            ),
                          ]
                        : null,
                  ),
                );
              },
            ),
            const SizedBox(width: 10),
            const Text(
              'COMMAND CENTER',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 16,
                letterSpacing: 2,
                shadows: [Shadow(color: Colors.black, blurRadius: 10)],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.contacts, color: Colors.white),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const EmergencyContactsScreen()),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          // 1. Live Map Background
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _currentLocation,
              initialZoom: 16.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.road_safety',
                tileBuilder: _darkModeTileBuilder,
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: _currentLocation,
                    width: 60,
                    height: 60,
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.blueAccent.withValues(alpha: 0.5),
                            blurRadius: 16,
                            spreadRadius: 4,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.navigation,
                        color: Colors.blueAccent,
                        size: 40,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),

          // 2. Glassmorphism Top Stats Bar
          Positioned(
            top: 100,
            left: 16,
            right: 16,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 20),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.45),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildStatColumn(
                        'SPEED',
                        _currentSpeedKmh.toStringAsFixed(0),
                        'km/h',
                        Colors.cyanAccent,
                        Icons.speed,
                      ),
                      Container(
                        width: 1,
                        height: 40,
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                      _buildStatColumn(
                        'G-FORCE',
                        _currentGForce.toStringAsFixed(1),
                        'G',
                        _currentGForce > 3.0 ? Colors.redAccent : Colors.greenAccent,
                        Icons.vibration,
                      ),
                      Container(
                        width: 1,
                        height: 40,
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                      _buildStatColumn(
                        'RISK',
                        '$_riskScore',
                        '/ 100',
                        _riskScore > 60
                            ? Colors.redAccent
                            : _riskScore > 30
                                ? Colors.amberAccent
                                : Colors.greenAccent,
                        Icons.shield,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // 3. Floating Action Controls (Bottom)
          Positioned(
            bottom: 40,
            left: 16,
            right: 16,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                // Floating SOS Button
                GestureDetector(
                  onLongPress: _triggerManualSOS,
                  child: ScaleTransition(
                    scale: Tween<double>(begin: 1.0, end: 1.1).animate(
                      CurvedAnimation(parent: _sosPulseController, curve: Curves.easeInOut),
                    ),
                    child: Container(
                      width: 72,
                      height: 72,
                      margin: const EdgeInsets.only(bottom: 24),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const RadialGradient(
                          colors: [Color(0xFFFF1744), Color(0xFFB71C1C)],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.red.withValues(alpha: 0.6),
                            blurRadius: 24,
                            spreadRadius: 6,
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.emergency, color: Colors.white, size: 22),
                            Text(
                              'SOS',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 11,
                                letterSpacing: 1,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),

                // Agent Toggle Card
                ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: _isActive
                              ? Colors.greenAccent.withValues(alpha: 0.4)
                              : Colors.white.withValues(alpha: 0.08),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  color: _isActive
                                      ? Colors.greenAccent.withValues(alpha: 0.15)
                                      : Colors.white.withValues(alpha: 0.05),
                                ),
                                child: Icon(
                                  _isActive ? Icons.shield : Icons.shield_outlined,
                                  color: _isActive ? Colors.greenAccent : Colors.grey,
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _isActive ? 'SHIELD ACTIVE' : 'SYSTEM STANDBY',
                                    style: TextStyle(
                                      color: _isActive ? Colors.greenAccent : Colors.grey,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 14,
                                      letterSpacing: 1.2,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _isActive
                                        ? 'Monitoring sensors & GPS...'
                                        : 'Tap to start protection',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.5),
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          Switch(
                            value: _isActive,
                            activeThumbColor: Colors.greenAccent,
                            activeTrackColor: Colors.greenAccent.withValues(alpha: 0.3),
                            onChanged: (v) => _toggleAgent(),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatColumn(
    String label,
    String value,
    String unit,
    Color valueColor,
    IconData icon,
  ) {
    return Column(
      children: [
        Icon(icon, color: Colors.white38, size: 14),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.45),
            fontSize: 10,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 4),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              value,
              style: TextStyle(
                color: valueColor,
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(width: 2),
            Text(
              unit,
              style: TextStyle(
                color: valueColor.withValues(alpha: 0.6),
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _darkModeTileBuilder(BuildContext context, Widget tileWidget, TileImage tile) {
    return ColorFiltered(
      colorFilter: const ColorFilter.matrix([
        -1,  0,  0, 0, 255,
         0, -1,  0, 0, 255,
         0,  0, -1, 0, 255,
         0,  0,  0, 1,   0,
      ]),
      child: tileWidget,
    );
  }
}