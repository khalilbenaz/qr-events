import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// Cache local SQLite : billets connus + file des scans hors-ligne.
class LocalStore {
  Database? _db;

  Future<Database> get _database async {
    if (_db != null) return _db!;
    final dir = await getDatabasesPath();
    _db = await openDatabase(
      p.join(dir, 'qr_events.db'),
      version: 1,
      onCreate: (db, _) async {
        await db.execute('''
          CREATE TABLE tickets (
            qr_token TEXT PRIMARY KEY,
            ticket_id TEXT,
            event_id TEXT,
            holder_name TEXT,
            category TEXT,
            status TEXT
          )''');
        await db.execute('''
          CREATE TABLE pending_scans (
            idem_key TEXT PRIMARY KEY,
            token TEXT,
            device_id TEXT,
            scanned_at TEXT
          )''');
      },
    );
    return _db!;
  }

  /// Remplace le cache des billets pour un événement (manifeste).
  Future<void> replaceManifest(String eventId, List<Map<String, dynamic>> tickets) async {
    final db = await _database;
    final batch = db.batch();
    batch.delete('tickets', where: 'event_id = ?', whereArgs: [eventId]);
    for (final t in tickets) {
      batch.insert('tickets', {
        'qr_token': t['qr_token'],
        'ticket_id': t['id'],
        'event_id': eventId,
        'holder_name': t['holder_name'],
        'category': t['category'],
        'status': t['status'],
      }, conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true);
  }

  Future<Map<String, dynamic>?> findByToken(String token) async {
    final db = await _database;
    final rows = await db.query('tickets', where: 'qr_token = ?', whereArgs: [token], limit: 1);
    return rows.isEmpty ? null : rows.first;
  }

  /// Marque localement un billet comme utilisé (validation offline).
  Future<void> markUsedLocal(String token) async {
    final db = await _database;
    await db.update('tickets', {'status': 'used'}, where: 'qr_token = ?', whereArgs: [token]);
  }

  // --- File des scans hors-ligne -------------------------------------------
  Future<void> queueScan(String idemKey, String token, String deviceId, String at) async {
    final db = await _database;
    await db.insert('pending_scans', {
      'idem_key': idemKey, 'token': token, 'device_id': deviceId, 'scanned_at': at,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> pendingScans() async {
    final db = await _database;
    return db.query('pending_scans', orderBy: 'scanned_at');
  }

  Future<void> removePending(String idemKey) async {
    final db = await _database;
    await db.delete('pending_scans', where: 'idem_key = ?', whereArgs: [idemKey]);
  }

  Future<int> pendingCount() async {
    final db = await _database;
    final r = await db.rawQuery('SELECT COUNT(*) AS c FROM pending_scans');
    return Sqflite.firstIntValue(r) ?? 0;
  }

  Future<void> clearAll() async {
    final db = await _database;
    await db.delete('tickets');
    await db.delete('pending_scans');
  }
}
