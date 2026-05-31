import 'package:flutter/material.dart';
import 'complaint_screen.dart';
import 'my_complaints_screen.dart';
import 'driver_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              // Header
              Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E3A5F),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.directions_car,
                      color: Color(0xFF3B82F6),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Road Complaint System',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Namaskar! Aap kya karna chahte hain?',
                        style: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 40),

              // Main Options
              Expanded(
                child: Column(
                  children: [
                    // Report Complaint
                    _buildMainCard(
                      context,
                      icon: Icons.report_problem,
                      iconColor: const Color(0xFFEF4444),
                      bgColor: const Color(0xFF1F1035),
                      borderColor: const Color(0xFFEF4444),
                      title: 'Complaint Register Karein',
                      subtitle: 'Pothole, waterlogging ya koi bhi road problem report karein',
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ComplaintScreen()),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // My Complaints
                    _buildMainCard(
                      context,
                      icon: Icons.list_alt,
                      iconColor: const Color(0xFF3B82F6),
                      bgColor: const Color(0xFF0F1F35),
                      borderColor: const Color(0xFF3B82F6),
                      title: 'Meri Complaints',
                      subtitle: 'Apni complaints ka status check karein',
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const MyComplaintsScreen()),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Driver Mode
                    _buildMainCard(
                      context,
                      icon: Icons.directions_car,
                      iconColor: const Color(0xFF22C55E),
                      bgColor: const Color(0xFF0F1F15),
                      borderColor: const Color(0xFF22C55E),
                      title: 'Driver Mode',
                      subtitle: 'Real-time pothole warnings aur drowsiness detection',
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const DriverScreen()),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Stats Row
                    Row(
                      children: [
                        _buildStatCard('🛣️', 'Road Safety', 'Active'),
                        const SizedBox(width: 12),
                        _buildStatCard('📍', 'GPS', 'Connected'),
                        const SizedBox(width: 12),
                        _buildStatCard('🔔', 'Alerts', 'ON'),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMainCard(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required Color borderColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: iconColor, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              color: iconColor,
              size: 16,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String emoji, String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 20)),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                color: Color(0xFF22C55E),
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }
}