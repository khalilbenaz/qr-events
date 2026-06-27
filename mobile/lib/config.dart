/// Configuration de l'application scanner.
class Config {
  /// URL de base de l'API Workers.
  ///
  /// - Émulateur Android → http://10.0.2.2:8787 (proxy vers localhost de l'hôte)
  /// - Appareil physique en dev → `http://<IP-LAN-de-votre-PC>:8787`
  /// - Production → `https://qr-events-api.<sous-domaine>.workers.dev`
  ///
  /// Surchargable au build : `flutter build apk --dart-define=API_URL=https://...`
  static const String apiBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:8787',
  );
}
