# Architecture

```
┌──────────────┐         ┌───────────────────────────┐         ┌──────────────┐
│  Web (Pages) │  HTTPS  │   API — Cloudflare Worker  │         │   D1 (SQL)   │
│  React/Vite  │────────▶│        Hono router         │────────▶│   tickets…   │
│ dashboard +  │  JSON   │  JWT · multi-tenant · HMAC │         └──────────────┘
│ pages publ.  │         │                            │         ┌──────────────┐
└──────────────┘         │                            │────────▶│  KV (cache)  │
                         │                            │         │ rate-limit · │
┌──────────────┐  HTTPS  │                            │         │ idempotence  │
│ Mobile (APK) │────────▶│                            │         └──────────────┘
│   Flutter    │  /scan  └───────────────────────────┘
└──────────────┘
```

## Composants

| Module | Techno | Rôle |
|---|---|---|
| `api/` | Workers + Hono + D1 + KV | API REST, auth, billets, scan, stats |
| `web/` | React + Vite | Dashboard organisateur + pages publiques d'inscription |
| `mobile/` | Flutter (Android) | Scan des entrées, mode offline |

## Modèle de données (D1 / SQLite)

- `organizers (id, email, slug, name, password_hash)` — **tenant**. `slug` = identifiant public.
- `events (id, organizer_id, slug, name, …, registration_mode, capacity, status)`
  - `registration_mode` : `none` (billets pré-générés) · `open` (inscription libre) · `approval` (validation manuelle)
  - `status` : `draft` · `published` · `closed`
- `tickets (id, event_id, holder_*, category, qr_token, status)`
  - `status` : `valid` · `used` · `revoked` · `pending`
- `scans (id, ticket_id, event_id, scanned_at, scanned_by, device_id, result)` — journal
- `scanners (id, event_id, name, access_code)` — postes/portes

## Flux clés

### Génération & scan d'un billet
1. L'organisateur génère des billets → chaque billet reçoit un `qr_token` = `<ticketId>.<HMAC-SHA256 tronqué>`.
2. Le QR (SVG) encode ce token opaque.
3. Le scanner (mobile) lit le QR → `POST /scan { token, deviceId }`.
4. Le serveur **vérifie la signature HMAC**, puis valide de façon **atomique** :
   `UPDATE tickets SET status='used' WHERE id=? AND event_id=? AND status='valid'`.
   `changes === 1` ⇒ entrée acceptée ; sinon on lit le statut pour renvoyer la raison
   (`already_used`, `revoked`, `pending`, `wrong_event`, `invalid`).

### Inscription publique
- `none` : pas d'inscription, billets distribués par l'organisateur.
- `open` : inscription → billet `valid` immédiat + QR renvoyé.
- `approval` : inscription → billet `pending` ; l'organisateur approuve depuis le dashboard.

### Mode offline (mobile)
- Au login en ligne, l'app télécharge `GET /scan/manifest` (billets de l'événement) en cache `sqflite`.
- Hors-ligne, la validation se fait sur le cache (token connu + non déjà utilisé localement),
  et chaque scan est mis en file.
- Au retour réseau, la file est rejouée (`POST /scan` avec `Idempotency-Key`) — le serveur
  reste l'autorité finale anti-double-scan.

## Sécurité

- **Isolation multi-tenant** : chaque requête organisateur est scopée par `organizer_id`
  (un 404 est renvoyé pour une ressource d'un autre tenant).
- **Deux portées de JWT** : organisateur vs scanner (`scope: "scanner"`). Un token scanner
  est rejeté (403) sur les routes organisateur.
- **Mots de passe** : PBKDF2-SHA256 (WebCrypto), 100 000 itérations.
- **Tokens QR** : HMAC opaques, comparaison à temps constant.
- **Rate-limit** (KV) sur `/auth/*`, `/scan`, `/scanner/login`, inscription publique.
- **CORS** restreint à `ALLOWED_ORIGINS`.

## Choix d'implémentation notables

- **QR en SVG** (pas PNG) : le runtime Workers n'a pas de `canvas`. La lib `qrcode` génère
  du SVG en pur JS, net et léger.
- **`slug` ajouté à `organizers`** : requis pour la route publique `/{org-slug}/{event-slug}`.
- **`GET /scan/manifest`** : endpoint dédié au cache offline du scanner.
