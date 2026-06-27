import 'package:flutter/material.dart';

import 'models/models.dart';
import 'services/api_service.dart';
import 'services/local_store.dart';
import 'services/storage.dart';
import 'screens/login_screen.dart';
import 'screens/scan_screen.dart';

void main() => runApp(const ScannerApp());

const seed = Color(0xFF7C5CFF);

class ScannerApp extends StatelessWidget {
  const ScannerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QR Events Scan',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: seed,
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF0F1117),
      ),
      home: const AppRoot(),
    );
  }
}

/// Racine : charge la session stockée et route vers login ou scan.
class AppRoot extends StatefulWidget {
  const AppRoot({super.key});
  @override
  State<AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<AppRoot> {
  final api = ApiService();
  final secure = SecureStore();
  final store = LocalStore();

  ScannerSession? _session;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final s = await secure.load();
    if (s != null) api.setToken(s.token);
    setState(() {
      _session = s;
      _loading = false;
    });
  }

  void _onLoggedIn(ScannerSession s) {
    api.setToken(s.token);
    setState(() => _session = s);
  }

  Future<void> _logout() async {
    await secure.clear();
    await store.clearAll();
    api.setToken(null);
    setState(() => _session = null);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_session == null) {
      return LoginScreen(api: api, secure: secure, onLoggedIn: _onLoggedIn);
    }
    return ScanScreen(
      api: api,
      store: store,
      secure: secure,
      session: _session!,
      onLogout: _logout,
    );
  }
}
