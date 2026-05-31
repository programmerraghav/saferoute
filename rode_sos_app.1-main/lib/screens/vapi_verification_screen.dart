import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:vibration/vibration.dart';

import '../services/verification_service.dart';
import '../services/vapi_service.dart';

/// VapiVerificationScreen — DUMB OBSERVER of VerificationService.
///
/// This screen does NOT manage any timers, countdowns, or escalation logic.
/// It ONLY observes [VerificationService.stateStream] and renders the UI.
///
/// The entire verification workflow runs headlessly in VerificationService.
/// If this screen is closed, popped, or the app is minimized,
/// the verification continues and auto-SOS will still dispatch.
class VapiVerificationScreen extends StatefulWidget {
  final int initialScore;

  const VapiVerificationScreen({
    super.key,
    required this.initialScore,
  });

  @override
  State<VapiVerificationScreen> createState() => _VapiVerificationScreenState();
}

class _VapiVerificationScreenState extends State<VapiVerificationScreen>
    with TickerProviderStateMixin {
  StreamSubscription<VerificationUpdate>? _verificationSub;
  StreamSubscription<VapiCallState>? _vapiSub;

  VerificationState _currentState = VerificationState.idle;
  int _attempt = 1;
  int _countdown = 10;
  bool _isTerminal = false;

  late AnimationController _pulseController;
  late AnimationController _waveController;

  VapiCallState _vapiCallState = VapiCallState.idle;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    // Subscribe to the HEADLESS VerificationService state
    _verificationSub = VerificationService().stateStream.listen((update) {
      if (!mounted) return;
      setState(() {
        _currentState = update.state;
        _attempt = update.attempt;
        _countdown = update.countdown;
        _isTerminal = update.isTerminal;
      });

      // Auto-close screen on terminal states
      if (update.isTerminal && mounted) {
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            Navigator.of(context).pop();
            _showResultSnackbar(update.state);
          }
        });
      }
    });

    // Subscribe to VapiService call state for voice animation
    _vapiSub = VapiService().callStateStream.listen((state) {
      if (!mounted) return;
      setState(() => _vapiCallState = state);
    });
  }

  void _showResultSnackbar(VerificationState state) {
    if (!mounted) return;
    final msg = state == VerificationState.cancelled
        ? '✅ Emergency cancelled — you are safe.'
        : '🚨 SOS DISPATCHED — Help is on the way!';
    final color = state == VerificationState.cancelled
        ? Colors.green
        : Colors.red;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: color,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _markAsSafe() {
    VerificationService().markAsSafe();
  }

  void _dispatchSOSNow() {
    VerificationService().confirmEmergency();
  }

  @override
  void dispose() {
    _verificationSub?.cancel();
    _vapiSub?.cancel();
    _pulseController.dispose();
    _waveController.dispose();
    Vibration.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      body: SafeArea(
        child: Stack(
          children: [
            // Animated danger gradient background
            _buildAnimatedBackground(),

            // Main content
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Column(
                children: [
                  const SizedBox(height: 40),
                  // Header
                  _buildHeader(),
                  const SizedBox(height: 12),
                  _buildRiskBadge(),
                  const Spacer(flex: 1),
                  // Voice Orb
                  _buildVoiceOrb(),
                  const SizedBox(height: 36),
                  // Prompt Text
                  _buildPromptText(),
                  const SizedBox(height: 20),
                  // Countdown
                  _buildCountdownDisplay(),
                  const Spacer(flex: 1),
                  // Attempt Indicators
                  _buildAttemptIndicators(),
                  const SizedBox(height: 24),
                  // Action Buttons
                  if (!_isTerminal) _buildActionButtons(),
                  if (_isTerminal) _buildTerminalStatus(),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAnimatedBackground() {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        final pulseValue = _pulseController.value;
        return Container(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.center,
              radius: 1.2 + (pulseValue * 0.3),
              colors: [
                Colors.red.withValues(alpha: 0.1 + (pulseValue * 0.05)),
                const Color(0xFF0A0A0A),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Text(
          _isTerminal ? _getTerminalTitle() : 'CRASH DETECTED',
          style: TextStyle(
            color: _isTerminal
                ? (_currentState == VerificationState.cancelled
                    ? Colors.greenAccent
                    : Colors.redAccent)
                : Colors.redAccent,
            fontSize: 28,
            fontWeight: FontWeight.w900,
            letterSpacing: 3,
          ),
        ),
        const SizedBox(height: 4),
        if (!_isTerminal)
          Text(
            'Emergency Verification in Progress',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.6),
              fontSize: 13,
              letterSpacing: 1,
            ),
          ),
      ],
    );
  }

  String _getTerminalTitle() {
    switch (_currentState) {
      case VerificationState.cancelled:
        return 'ALL CLEAR';
      case VerificationState.dispatched:
      case VerificationState.autoDispatch:
      case VerificationState.confirmed:
        return 'SOS DISPATCHED';
      default:
        return 'PROCESSING';
    }
  }

  Widget _buildRiskBadge() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.redAccent.withValues(alpha: 0.3)),
          ),
          child: Text(
            'Risk Score: ${widget.initialScore}/100',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
              fontWeight: FontWeight.w500,
              letterSpacing: 0.5,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildVoiceOrb() {
    final bool isListening = _vapiCallState == VapiCallState.active;

    return SizedBox(
      width: 200,
      height: 200,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Outer pulse rings
          ...List.generate(3, (index) {
            return AnimatedBuilder(
              animation: _waveController,
              builder: (context, child) {
                final delay = index * 0.33;
                final value = ((_waveController.value + delay) % 1.0);
                return Container(
                  width: 140 + (value * 60),
                  height: 140 + (value * 60),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: (isListening ? Colors.cyanAccent : Colors.redAccent)
                          .withValues(alpha: (1.0 - value) * 0.4),
                      width: 2,
                    ),
                  ),
                );
              },
            );
          }),
          // Core orb
          ScaleTransition(
            scale: Tween<double>(begin: 0.95, end: 1.08).animate(
              CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
            ),
            child: Container(
              width: 130,
              height: 130,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    (isListening ? Colors.cyanAccent : Colors.redAccent)
                        .withValues(alpha: 0.9),
                    (isListening ? Colors.cyan : Colors.red)
                        .withValues(alpha: 0.2),
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: (isListening ? Colors.cyanAccent : Colors.red)
                        .withValues(alpha: 0.5),
                    blurRadius: 40,
                    spreadRadius: 15,
                  ),
                ],
              ),
              child: Center(
                child: Icon(
                  isListening ? Icons.mic : Icons.warning_amber_rounded,
                  color: Colors.white,
                  size: 50,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPromptText() {
    String prompt;
    if (_isTerminal) {
      prompt = _currentState == VerificationState.cancelled
          ? 'Emergency cancelled. Stay safe.'
          : 'Emergency services have been notified.\nHelp is on the way.';
    } else {
      switch (_attempt) {
        case 1:
          prompt = '"Are you safe? Please respond."';
          break;
        case 2:
          prompt = '"No response detected.\nAttempt 2 — Are you okay?"';
          break;
        case 3:
          prompt = '"⚠ FINAL WARNING ⚠\nSOS will be dispatched automatically!"';
          break;
        default:
          prompt = '"Verifying your status..."';
      }
    }

    return Text(
      prompt,
      textAlign: TextAlign.center,
      style: TextStyle(
        color: _attempt == 3 && !_isTerminal ? Colors.redAccent : Colors.white,
        fontSize: _attempt == 3 && !_isTerminal ? 20 : 18,
        fontWeight: FontWeight.w500,
        height: 1.4,
      ),
    );
  }

  Widget _buildCountdownDisplay() {
    if (_isTerminal) return const SizedBox.shrink();

    return Column(
      children: [
        Text(
          '$_countdown',
          style: TextStyle(
            color: _countdown <= 3 ? Colors.redAccent : Colors.white,
            fontSize: 56,
            fontWeight: FontWeight.w900,
            letterSpacing: 2,
          ),
        ),
        Text(
          'seconds remaining',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.5),
            fontSize: 13,
            letterSpacing: 1,
          ),
        ),
      ],
    );
  }

  Widget _buildAttemptIndicators() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (index) {
        final attemptNum = index + 1;
        final isActive = attemptNum == _attempt && !_isTerminal;
        final isCompleted = attemptNum < _attempt || _isTerminal;

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 8),
          child: Column(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isCompleted
                      ? Colors.redAccent.withValues(alpha: 0.8)
                      : isActive
                          ? Colors.redAccent
                          : Colors.white.withValues(alpha: 0.1),
                  border: Border.all(
                    color: isActive
                        ? Colors.redAccent
                        : Colors.white.withValues(alpha: 0.2),
                    width: isActive ? 2 : 1,
                  ),
                  boxShadow: isActive
                      ? [BoxShadow(color: Colors.redAccent.withValues(alpha: 0.5), blurRadius: 12)]
                      : null,
                ),
                child: Center(
                  child: isCompleted
                      ? const Icon(Icons.close, color: Colors.white, size: 18)
                      : Text(
                          '$attemptNum',
                          style: TextStyle(
                            color: isActive ? Colors.white : Colors.white54,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Attempt $attemptNum',
                style: TextStyle(
                  color: isActive
                      ? Colors.white
                      : Colors.white.withValues(alpha: 0.4),
                  fontSize: 10,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.green.withValues(alpha: 0.3),
                  blurRadius: 16,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1B5E20),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 20),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              onPressed: _markAsSafe,
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shield_outlined, size: 22),
                  SizedBox(width: 8),
                  Text("I'm Safe", style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.red.withValues(alpha: 0.4),
                  blurRadius: 16,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB71C1C),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 20),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              onPressed: _dispatchSOSNow,
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.emergency, size: 22),
                  SizedBox(width: 8),
                  Text("SOS NOW", style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTerminalStatus() {
    final isSafe = _currentState == VerificationState.cancelled;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: (isSafe ? Colors.green : Colors.red).withValues(alpha: 0.15),
        border: Border.all(
          color: (isSafe ? Colors.greenAccent : Colors.redAccent).withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            isSafe ? Icons.check_circle_outline : Icons.emergency,
            color: isSafe ? Colors.greenAccent : Colors.redAccent,
            size: 28,
          ),
          const SizedBox(width: 12),
          Text(
            isSafe ? 'All Clear' : 'SOS Active',
            style: TextStyle(
              color: isSafe ? Colors.greenAccent : Colors.redAccent,
              fontSize: 18,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
        ],
      ),
    );
  }
}
