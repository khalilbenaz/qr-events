import 'package:dio/dio.dart';
import '../config.dart';
import '../models/models.dart';

/// Exception métier renvoyée par l'API ({ ok:false, error:{code,message} }).
class ApiException implements Exception {
  final int status;
  final String code;
  final String message;
  ApiException(this.status, this.code, this.message);
  @override
  String toString() => message;
}

class ApiService {
  final Dio _dio;
  String? _token;

  ApiService()
      : _dio = Dio(BaseOptions(
          baseUrl: Config.apiBaseUrl,
          connectTimeout: const Duration(seconds: 8),
          receiveTimeout: const Duration(seconds: 8),
          headers: {'Content-Type': 'application/json'},
          validateStatus: (_) => true, // on gère les codes nous-mêmes
        ));

  void setToken(String? token) {
    _token = token;
    if (token != null) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    } else {
      _dio.options.headers.remove('Authorization');
    }
  }

  bool get hasToken => _token != null;

  Map<String, dynamic> _unwrap(Response res) {
    final data = res.data;
    if (data is Map && data['ok'] == false) {
      final err = (data['error'] as Map?) ?? {};
      throw ApiException(res.statusCode ?? 0,
          err['code']?.toString() ?? 'error', err['message']?.toString() ?? 'Erreur');
    }
    if (res.statusCode == null || res.statusCode! >= 400) {
      throw ApiException(res.statusCode ?? 0, 'http_error', 'Erreur ${res.statusCode}');
    }
    return (data is Map && data['data'] is Map)
        ? Map<String, dynamic>.from(data['data'] as Map)
        : Map<String, dynamic>.from(data as Map);
  }

  /// Login scanner via code d'accès porte.
  Future<ScannerSession> loginScanner(String accessCode) async {
    final res = await _dio.post('/scanner/login', data: {'access_code': accessCode});
    final d = _unwrap(res);
    final ev = (d['event'] as Map);
    final sc = (d['scanner'] as Map);
    return ScannerSession(
      token: d['token'] as String,
      scannerName: sc['name']?.toString() ?? '',
      eventId: ev['id'].toString(),
      eventName: ev['name']?.toString() ?? '',
    );
  }

  /// Valide un billet en ligne. Idempotency-Key évite les doublons sur retry.
  Future<ScanOutcome> scan(String token, {required String deviceId, required String idempotencyKey}) async {
    final res = await _dio.post(
      '/scan',
      data: {'token': token, 'deviceId': deviceId},
      options: Options(headers: {'Idempotency-Key': idempotencyKey}),
    );
    final d = _unwrap(res);
    final ticket = d['ticket'] as Map?;
    return ScanOutcome(
      status: scanStatusFromApi(d['result']?.toString()),
      message: d['message']?.toString() ?? '',
      holderName: ticket?['holder_name']?.toString(),
      category: ticket?['category']?.toString(),
    );
  }

  /// Télécharge le manifeste des billets de l'événement (cache offline).
  Future<List<Map<String, dynamic>>> fetchManifest() async {
    final res = await _dio.get('/scan/manifest');
    final d = _unwrap(res);
    return (d['tickets'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
}
