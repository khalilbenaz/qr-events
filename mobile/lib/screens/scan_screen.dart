import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../models/models.dart';
import '../services/api_service.dart';
import '../services/local_store.dart';
import '../services/scan_engine.dart';
import '../services/storage.dart';

class ScanScreen extends StatefulWidget {
  final ApiService api;
  final LocalStore store;
  final SecureStore secure;
  final ScannerSession session;
  final Future<void> Function() onLogout;

  const ScanScreen({
    super.key,
    required this.api,
    required this.store,
    required this.secure,
    required this.session,
    required this.onLogout,
  });

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  late final ScanEngine _engine;
  final _camera = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );

  ScanOutcome? _overlay;
  bool _processing = false;
  String? _lastToken;
  DateTime _lastAt = DateTime.fromMillisecondsSinceEpoch(0);

  @override
  void initState() {
    super.initState();
    _engine = ScanEngine(
      api: widget.api,
      store: widget.store,
      secure: widget.secure,
      session: widget.session,
    );
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_processing) return;
    final raw = capture.barcodes.isNotEmpty ? capture.barcodes.first.rawValue : null;
    if (raw == null || raw.isEmpty) return;

    // Anti-rebond : ignore le même QR scanné dans les 2,5 s.
    final now = DateTime.now();
    if (raw == _lastToken && now.difference(_lastAt) < const Duration(milliseconds: 2500)) {
      return;
    }
    _lastToken = raw;
    _lastAt = now;

    setState(() => _processing = true);
    final outcome = await _engine.processScan(raw);
    await _feedback(outcome.status);
    if (!mounted) return;
    setState(() => _overlay = outcome);

    // Efface l'overlay après un court instant, puis réautorise le scan.
    Timer(const Duration(milliseconds: 1600), () {
      if (mounted) setState(() => _overlay = null);
      _processing = false;
    });
  }

  Future<void> _feedback(ScanStatus s) async {
    if (s == ScanStatus.ok) {
      await HapticFeedback.mediumImpact();
      await SystemSound.play(SystemSoundType.click);
    } else {
      await HapticFeedback.heavyImpact();
      await Future.delayed(const Duration(milliseconds: 120));
      await HapticFeedback.heavyImpact();
    }
  }

  @override
  void dispose() {
    _camera.dispose();
    _engine.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.session.eventName, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            icon: const Icon(Icons.flip_camera_ios),
            onPressed: () => _camera.switchCamera(),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              final ok = await showDialog<bool>(
                context: context,
                builder: (c) => AlertDialog(
                  title: const Text('Déconnexion'),
                  content: const Text('Quitter ce poste de scan ?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Annuler')),
                    FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Quitter')),
                  ],
                ),
              );
              if (ok == true) await widget.onLogout();
            },
          ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(controller: _camera, onDetect: _onDetect),
          _ScanFrame(),
          if (_overlay != null) _ResultOverlay(outcome: _overlay!),
          _StatusBar(engine: _engine, session: widget.session),
        ],
      ),
    );
  }
}

/// Cadre de visée au centre.
class _ScanFrame extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 250,
        height: 250,
        decoration: BoxDecoration(
          border: Border.all(color: Colors.white70, width: 3),
          borderRadius: BorderRadius.circular(20),
        ),
      ),
    );
  }
}

/// Barre basse : compteur d'entrées + état réseau/sync (temps réel).
class _StatusBar extends StatelessWidget {
  final ScanEngine engine;
  final ScannerSession session;
  const _StatusBar({required this.engine, required this.session});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.bottomCenter,
      child: AnimatedBuilder(
        animation: engine,
        builder: (context, _) {
          return Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.confirmation_number, size: 20),
                const SizedBox(width: 8),
                Text('${engine.entryCount} entrée(s)',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(width: 18),
                Icon(engine.online ? Icons.wifi : Icons.wifi_off,
                    size: 18, color: engine.online ? const Color(0xFF2FBF71) : const Color(0xFFF0A020)),
                if (engine.pendingSync > 0) ...[
                  const SizedBox(width: 8),
                  Text('${engine.pendingSync} à sync',
                      style: const TextStyle(color: Color(0xFFF0A020), fontSize: 13)),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Overlay plein écran coloré indiquant le résultat du scan.
class _ResultOverlay extends StatelessWidget {
  final ScanOutcome outcome;
  const _ResultOverlay({required this.outcome});

  @override
  Widget build(BuildContext context) {
    final (color, icon, title) = switch (outcome.status) {
      ScanStatus.ok => (const Color(0xFF2FBF71), Icons.check_circle, 'VALIDE'),
      ScanStatus.alreadyUsed => (const Color(0xFFF0A020), Icons.error, 'DÉJÀ UTILISÉ'),
      ScanStatus.pending => (const Color(0xFF5B8DEF), Icons.hourglass_top, 'EN ATTENTE'),
      ScanStatus.revoked => (const Color(0xFFEF4F5A), Icons.block, 'RÉVOQUÉ'),
      ScanStatus.wrongEvent => (const Color(0xFFEF4F5A), Icons.event_busy, 'AUTRE ÉVÉNEMENT'),
      ScanStatus.wrongCategory => (const Color(0xFFF0A020), Icons.door_front_door, 'MAUVAISE PORTE'),
      ScanStatus.invalid => (const Color(0xFFEF4F5A), Icons.close, 'INVALIDE'),
      ScanStatus.error => (const Color(0xFFEF4F5A), Icons.warning, 'ERREUR'),
    };

    return Container(
      color: color.withValues(alpha: 0.92),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 110, color: Colors.white),
            const SizedBox(height: 12),
            Text(title,
                style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 1)),
            const SizedBox(height: 8),
            if (outcome.holderName != null && outcome.holderName!.isNotEmpty)
              Text(outcome.holderName!, style: const TextStyle(fontSize: 22, color: Colors.white)),
            if (outcome.category != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(outcome.category!.toUpperCase(),
                    style: const TextStyle(fontSize: 14, color: Colors.white70, letterSpacing: 2)),
              ),
            const SizedBox(height: 10),
            Text(outcome.message, style: const TextStyle(color: Colors.white)),
            if (outcome.offline)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('• hors-ligne •', style: TextStyle(color: Colors.white70, fontSize: 12)),
              ),
          ],
        ),
      ),
    );
  }
}
