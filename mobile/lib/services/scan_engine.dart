import 'dart:async';
import 'dart:math';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

import '../models/models.dart';
import 'api_service.dart';
import 'local_store.dart';
import 'storage.dart';

/// Orchestration du scan : validation en ligne (atomique côté serveur) avec
/// repli hors-ligne sur le cache local, compteur d'entrées et sync différée.
class ScanEngine extends ChangeNotifier {
  final ApiService api;
  final LocalStore store;
  final SecureStore secure;
  final ScannerSession session;

  ScanEngine({
    required this.api,
    required this.store,
    required this.secure,
    required this.session,
  }) {
    _connSub = Connectivity().onConnectivityChanged.listen(_onConnChange);
    _init();
  }

  int entryCount = 0; // entrées validées dans cette session
  int pendingSync = 0; // scans en attente de synchronisation
  bool online = true;
  late String _deviceId;
  StreamSubscription? _connSub;
  final _rand = Random();

  Future<void> _init() async {
    _deviceId = await secure.deviceId();
    final conn = await Connectivity().checkConnectivity();
    online = conn.any((c) => c != ConnectivityResult.none);
    await _refreshPending();
    if (online) {
      await syncManifest();
      await flushPending();
    }
    notifyListeners();
  }

  void _onConnChange(List<ConnectivityResult> result) async {
    online = result.any((c) => c != ConnectivityResult.none);
    notifyListeners();
    if (online) {
      await flushPending();
      await syncManifest();
    }
  }

  Future<void> _refreshPending() async {
    pendingSync = await store.pendingCount();
  }

  String _newIdemKey(String token) =>
      '${_deviceId}_${DateTime.now().microsecondsSinceEpoch}_${_rand.nextInt(1 << 20)}';

  /// Télécharge le manifeste des billets pour la validation hors-ligne.
  Future<void> syncManifest() async {
    try {
      final tickets = await api.fetchManifest();
      await store.replaceManifest(session.eventId, tickets);
    } catch (_) {
      /* hors-ligne ou erreur : on garde le cache existant */
    }
  }

  /// Traite un QR scanné. Renvoie l'issue à afficher.
  Future<ScanOutcome> processScan(String token) async {
    final idem = _newIdemKey(token);

    if (online) {
      try {
        final outcome = await api.scan(token, deviceId: _deviceId, idempotencyKey: idem);
        if (outcome.status == ScanStatus.ok) {
          entryCount++;
          await store.markUsedLocal(token); // garde le cache cohérent
        }
        notifyListeners();
        return outcome;
      } on ApiException catch (e) {
        return ScanOutcome(status: ScanStatus.error, message: e.message);
      } catch (_) {
        // Erreur réseau → bascule hors-ligne pour ce scan.
        online = false;
      }
    }

    return _processOffline(token, idem);
  }

  Future<ScanOutcome> _processOffline(String token, String idem) async {
    final t = await store.findByToken(token);
    if (t == null) {
      return const ScanOutcome(
        status: ScanStatus.invalid,
        message: "QR inconnu (non vérifiable hors-ligne)",
        offline: true,
      );
    }
    final status = t['status']?.toString();
    if (status == 'used') {
      return ScanOutcome(
        status: ScanStatus.alreadyUsed,
        message: "Déjà utilisé",
        holderName: t['holder_name']?.toString(),
        category: t['category']?.toString(),
        offline: true,
      );
    }
    if (status == 'revoked') {
      return const ScanOutcome(status: ScanStatus.revoked, message: "Billet révoqué", offline: true);
    }
    if (status == 'pending') {
      return const ScanOutcome(status: ScanStatus.pending, message: "En attente de validation", offline: true);
    }
    // valid → on valide localement et on met en file pour la synchro.
    await store.markUsedLocal(token);
    await store.queueScan(idem, token, _deviceId, DateTime.now().toIso8601String());
    entryCount++;
    await _refreshPending();
    notifyListeners();
    return ScanOutcome(
      status: ScanStatus.ok,
      message: "Entrée validée (hors-ligne)",
      holderName: t['holder_name']?.toString(),
      category: t['category']?.toString(),
      offline: true,
    );
  }

  /// Rejoue les scans hors-ligne en attente lorsque la connexion revient.
  Future<void> flushPending() async {
    final pending = await store.pendingScans();
    for (final s in pending) {
      try {
        await api.scan(
          s['token'] as String,
          deviceId: s['device_id'] as String,
          idempotencyKey: s['idem_key'] as String,
        );
        // Réponse définitive du serveur (ok / déjà utilisé / etc.) → on dépile.
        await store.removePending(s['idem_key'] as String);
      } catch (_) {
        break; // toujours hors-ligne : on réessaiera plus tard
      }
    }
    await _refreshPending();
    notifyListeners();
  }

  @override
  void dispose() {
    _connSub?.cancel();
    super.dispose();
  }
}
