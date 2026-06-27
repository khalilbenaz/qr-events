/// Résultat d'un scan, aligné sur l'API (`result`).
enum ScanStatus { ok, alreadyUsed, invalid, revoked, pending, wrongEvent, wrongCategory, error }

ScanStatus scanStatusFromApi(String? s) {
  switch (s) {
    case 'ok':
      return ScanStatus.ok;
    case 'already_used':
      return ScanStatus.alreadyUsed;
    case 'revoked':
      return ScanStatus.revoked;
    case 'pending':
      return ScanStatus.pending;
    case 'wrong_event':
      return ScanStatus.wrongEvent;
    case 'wrong_category':
      return ScanStatus.wrongCategory;
    case 'invalid':
      return ScanStatus.invalid;
    default:
      return ScanStatus.error;
  }
}

class ScanOutcome {
  final ScanStatus status;
  final String message;
  final String? holderName;
  final String? category;
  final bool offline;

  const ScanOutcome({
    required this.status,
    required this.message,
    this.holderName,
    this.category,
    this.offline = false,
  });
}

/// Session scanner (token + événement) persistée après login.
class ScannerSession {
  final String token;
  final String scannerName;
  final String eventId;
  final String eventName;

  const ScannerSession({
    required this.token,
    required this.scannerName,
    required this.eventId,
    required this.eventName,
  });

  Map<String, dynamic> toJson() => {
        'token': token,
        'scannerName': scannerName,
        'eventId': eventId,
        'eventName': eventName,
      };

  factory ScannerSession.fromJson(Map<String, dynamic> j) => ScannerSession(
        token: j['token'] as String,
        scannerName: j['scannerName'] as String? ?? '',
        eventId: j['eventId'] as String,
        eventName: j['eventName'] as String? ?? '',
      );
}
