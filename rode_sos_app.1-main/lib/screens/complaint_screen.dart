import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:io';

class ComplaintScreen extends StatefulWidget {
  const ComplaintScreen({super.key});

  @override
  State<ComplaintScreen> createState() => _ComplaintScreenState();
}

class _ComplaintScreenState extends State<ComplaintScreen> {
  File? _image;
  Position? _position;
  String _selectedType = 'pothole';
  bool _loadingLocation = false;
  final List<Map<String, dynamic>> _complaintTypes = [
    {'type': 'pothole', 'label': 'Pothole', 'icon': Icons.warning_amber},
    {'type': 'waterlogging', 'label': 'Waterlogging', 'icon': Icons.water},
    {'type': 'drainage', 'label': 'Drainage', 'icon': Icons.plumbing},
    {'type': 'streetlight', 'label': 'Street Light', 'icon': Icons.lightbulb},
    {'type': 'garbage', 'label': 'Garbage', 'icon': Icons.delete},
    {'type': 'other', 'label': 'Other', 'icon': Icons.more_horiz},
  ];

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.camera);
    if (picked != null) {
      setState(() => _image = File(picked.path));
      await _getLocation();
    }
  }

  Future<void> _getLocation() async {
    setState(() => _loadingLocation = true);
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever) return;

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      setState(() => _position = position);
    } catch (e) {
      debugPrint('Location error: $e');
    }
    setState(() => _loadingLocation = false);
  }

  Future<void> _callAgent() async {
    // VAPI call number
    const vapiNumber = 'tel:+1XXXXXXXXXX';
    final uri = Uri.parse(vapiNumber);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _openWhatsApp() async {
    const waNumber = 'https://wa.me/14155238886';
    final uri = Uri.parse(waNumber);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        title: const Text(
          'Complaint Register',
          style: TextStyle(color: Colors.white),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Photo Section
            const Text(
              'Photo Lein',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: _pickImage,
              child: Container(
                width: double.infinity,
                height: 200,
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _image != null
                        ? const Color(0xFF22C55E)
                        : const Color(0xFF334155),
                  ),
                ),
                child: _image != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.file(_image!, fit: BoxFit.cover),
                      )
                    : const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.camera_alt,
                              size: 48, color: Color(0xFF3B82F6)),
                          SizedBox(height: 12),
                          Text(
                            'Camera se photo click karein',
                            style: TextStyle(color: Color(0xFF94A3B8)),
                          ),
                          Text(
                            'Location automatically save hogi',
                            style: TextStyle(
                                color: Color(0xFF64748B), fontSize: 12),
                          ),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 16),

            // Location Status
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(
                    _position != null ? Icons.location_on : Icons.location_off,
                    color: _position != null
                        ? const Color(0xFF22C55E)
                        : const Color(0xFF64748B),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _loadingLocation
                        ? const Text('Location fetch ho rahi hai...',
                            style: TextStyle(color: Color(0xFF94A3B8)))
                        : Text(
                            _position != null
                                ? 'Lat: ${_position!.latitude.toStringAsFixed(4)}, Lng: ${_position!.longitude.toStringAsFixed(4)}'
                                : 'Location nahi mili',
                            style: const TextStyle(color: Color(0xFF94A3B8)),
                          ),
                  ),
                  if (!_loadingLocation && _position == null)
                    TextButton(
                      onPressed: _getLocation,
                      child: const Text('Retry'),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Complaint Type
            const Text(
              'Complaint Type',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.2,
              ),
              itemCount: _complaintTypes.length,
              itemBuilder: (context, index) {
                final type = _complaintTypes[index];
                final isSelected = _selectedType == type['type'];
                return GestureDetector(
                  onTap: () => setState(() => _selectedType = type['type']),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xFF1E3A5F)
                          : const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? const Color(0xFF3B82F6)
                            : const Color(0xFF334155),
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          type['icon'],
                          color: isSelected
                              ? const Color(0xFF3B82F6)
                              : const Color(0xFF64748B),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          type['label'],
                          style: TextStyle(
                            color: isSelected
                                ? const Color(0xFF3B82F6)
                                : const Color(0xFF94A3B8),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),

            // Action Buttons
            const Text(
              'Complaint Kaise Register Karein?',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),

            // Call Agent Button
            GestureDetector(
              onTap: _callAgent,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1F1035),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: const Color(0xFF8B5CF6).withValues(alpha: 0.5)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.phone, color: Color(0xFF8B5CF6), size: 28),
                    SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Voice Agent ko Call Karein',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Apki complaint register kar dega',
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // WhatsApp Button
            GestureDetector(
              onTap: _openWhatsApp,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1F1035),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: const Color(0xFF22C55E).withValues(alpha: 0.5)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.chat, color: Color(0xFF22C55E), size: 28),
                    SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'WhatsApp pe Register Karein',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Apki complaint register kar dega',
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );  
  }
}