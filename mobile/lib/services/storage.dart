import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/models.dart';

/// Persistance sécurisée de la session scanner (token chiffré).
class SecureStore {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  static const _key = 'scanner_session';

  Future<void> save(ScannerSession s) =>
      _storage.write(key: _key, value: jsonEncode(s.toJson()));

  Future<ScannerSession?> load() async {
    final raw = await _storage.read(key: _key);
    if (raw == null) return null;
    try {
      return ScannerSession.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> clear() => _storage.delete(key: _key);

  /// Identifiant d'appareil stable (généré une fois, pour le journal des scans).
  Future<String> deviceId() async {
    var id = await _storage.read(key: 'device_id');
    if (id == null) {
      id = 'dev-${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}';
      await _storage.write(key: 'device_id', value: id);
    }
    return id;
  }
}
