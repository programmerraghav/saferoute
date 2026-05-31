import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class MyComplaintsScreen extends StatefulWidget {
  const MyComplaintsScreen({super.key});

  @override
  State<MyComplaintsScreen> createState() => _MyComplaintsScreenState();
}

class _MyComplaintsScreenState extends State<MyComplaintsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  Color _getStatusColor(String status) {
    switch (status) {
      case 'resolved':
        return const Color(0xFF22C55E);
      case 'assigned':
        return const Color(0xFF3B82F6);
      default:
        return const Color(0xFFF97316);
    }
  }

  Color _getSeverityColor(int severity) {
    if (severity >= 7) return const Color(0xFFEF4444);
    if (severity >= 4) return const Color(0xFFF97316);
    return const Color(0xFF22C55E);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        title: const Text(
          'Meri Complaints',
          style: TextStyle(color: Colors.white),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Complaint ID se search karein...',
                hintStyle: const TextStyle(color: Color(0xFF64748B)),
                prefixIcon:
                    const Icon(Icons.search, color: Color(0xFF64748B)),
                filled: true,
                fillColor: const Color(0xFF1E293B),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (val) => setState(() => _searchQuery = val),
            ),
          ),

          // Complaints List
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance
                  .collection('complaints')
                  .orderBy('timestamp', descending: true)
                  .snapshots(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: CircularProgressIndicator(
                        color: Color(0xFF3B82F6)),
                  );
                }

                if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.inbox,
                            size: 64, color: Color(0xFF334155)),
                        SizedBox(height: 16),
                        Text(
                          'Koi complaint nahi mili',
                          style: TextStyle(color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  );
                }

                var docs = snapshot.data!.docs;

                // Search filter
                if (_searchQuery.isNotEmpty) {
                  docs = docs.where((doc) {
                    final data = doc.data() as Map<String, dynamic>;
                    final id = (data['complaint_id'] ?? '')
                        .toString()
                        .toLowerCase();
                    final location =
                        (data['location'] ?? '').toString().toLowerCase();
                    return id.contains(_searchQuery.toLowerCase()) ||
                        location.contains(_searchQuery.toLowerCase());
                  }).toList();
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: docs.length,
                  itemBuilder: (context, index) {
                    final data =
                        docs[index].data() as Map<String, dynamic>;
                    final status = data['status'] ?? 'pending';
                    final severity =
                        (data['severity_score'] ?? 0) as int;
                    final complaintId =
                        data['complaint_id'] ?? 'N/A';
                    final location = data['location'] ?? 'N/A';
                    final type = data['complaint_type'] ?? 'N/A';
                    final timestamp =
                        (data['timestamp'] ?? '').toString();

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                            color: const Color(0xFF334155)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment:
                                MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                complaintId,
                                style: const TextStyle(
                                  color: Color(0xFF3B82F6),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _getStatusColor(status)
                                      .withValues(alpha: 0.15),
                                  borderRadius:
                                      BorderRadius.circular(20),
                                ),
                                child: Text(
                                  status.toUpperCase(),
                                  style: TextStyle(
                                    color: _getStatusColor(status),
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(Icons.location_on,
                                  size: 14,
                                  color: Color(0xFF64748B)),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  location,
                                  style: const TextStyle(
                                    color: Color(0xFF94A3B8),
                                    fontSize: 12,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment:
                                MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0F172A),
                                  borderRadius:
                                      BorderRadius.circular(8),
                                ),
                                child: Text(
                                  type.toUpperCase(),
                                  style: const TextStyle(
                                    color: Color(0xFF94A3B8),
                                    fontSize: 10,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: _getSeverityColor(severity)
                                      .withValues(alpha: 0.15),
                                  borderRadius:
                                      BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'Severity: $severity/10',
                                  style: TextStyle(
                                    color: _getSeverityColor(severity),
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              Text(
                                timestamp.length > 10
                                    ? timestamp.substring(0, 10)
                                    : timestamp,
                                style: const TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}