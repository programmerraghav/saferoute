import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class VehicleProfile {
  final String vehicleType; // bike / car / truck / auto
  final double wheelbaseM;
  final double tyreWidthMm;
  final double groundClearanceMm;
  final double maxSafeDepthCm;

  VehicleProfile({
    required this.vehicleType,
    required this.wheelbaseM,
    required this.tyreWidthMm,
    required this.groundClearanceMm,
    required this.maxSafeDepthCm,
  });

  Map<String, dynamic> toMap() {
    return {
      'vehicleType': vehicleType,
      'wheelbaseM': wheelbaseM,
      'tyreWidthMm': tyreWidthMm,
      'groundClearanceMm': groundClearanceMm,
      'maxSafeDepthCm': maxSafeDepthCm,
      'lastUpdated': FieldValue.serverTimestamp(),
    };
  }

  factory VehicleProfile.fromMap(Map<String, dynamic> map) {
    return VehicleProfile(
      vehicleType: map['vehicleType'] ?? 'car',
      wheelbaseM: (map['wheelbaseM'] ?? 2.6).toDouble(),
      tyreWidthMm: (map['tyreWidthMm'] ?? 195.0).toDouble(),
      groundClearanceMm: (map['groundClearanceMm'] ?? 170.0).toDouble(),
      maxSafeDepthCm: (map['maxSafeDepthCm'] ?? 8.5).toDouble(),
    );
  }
}

class VehicleService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  static String get userId {
    final user = FirebaseAuth.instance.currentUser;
    return user?.uid ?? 'uid_123';
  }

  // Pre-filled defaults based on vehicle type
  static VehicleProfile getDefaultsForType(String type) {
    switch (type.toLowerCase()) {
      case 'bike':
        return VehicleProfile(
          vehicleType: 'bike',
          wheelbaseM: 1.35,
          tyreWidthMm: 120.0,
          groundClearanceMm: 165.0,
          maxSafeDepthCm: 165.0 / 20.0, // 8.25 cm
        );
      case 'truck':
        return VehicleProfile(
          vehicleType: 'truck',
          wheelbaseM: 4.50,
          tyreWidthMm: 295.0,
          groundClearanceMm: 250.0,
          maxSafeDepthCm: 250.0 / 20.0, // 12.5 cm
        );
      case 'auto':
        return VehicleProfile(
          vehicleType: 'auto',
          wheelbaseM: 2.00,
          tyreWidthMm: 145.0,
          groundClearanceMm: 180.0,
          maxSafeDepthCm: 180.0 / 20.0, // 9.0 cm
        );
      case 'car':
      default:
        return VehicleProfile(
          vehicleType: 'car',
          wheelbaseM: 2.60,
          tyreWidthMm: 195.0,
          groundClearanceMm: 170.0,
          maxSafeDepthCm: 170.0 / 20.0, // 8.5 cm
        );
    }
  }

  // Save vehicle profile in Firestore
  static Future<void> saveVehicleProfile(VehicleProfile profile) async {
    final docRef = _firestore.collection('users').doc(userId).collection('vehicle_profile').doc('current');
    await docRef.set(profile.toMap(), SetOptions(merge: true));
  }

  // Fetch vehicle profile from Firestore
  static Future<VehicleProfile?> getVehicleProfile() async {
    try {
      final docSnapshot = await _firestore.collection('users').doc(userId).collection('vehicle_profile').doc('current').get();
      if (docSnapshot.exists && docSnapshot.data() != null) {
        return VehicleProfile.fromMap(docSnapshot.data()!);
      }
    } catch (e) {
      print('Error fetching vehicle profile: $e');
    }
    return null;
  }
}
