# QR Events — plateforme SaaS multi-organisateurs

Monorepo : événements, QR codes signés, pages publiques d'inscription et app
mobile de scan. Tout tient dans le **free tier Cloudflare**.

```
api/     Cloudflare Workers + Hono + D1 + KV   ← Étape 1 (fait)
web/     React + Vite (dashboard + pages)      ← Étape 2/3 (à venir)
mobile/  Flutter Android (scan)                ← Étape 4 (à venir)
```

## État

- ✅ **Étape 1 — Backend API** : auth JWT organisateur, isolation multi-tenant,
  CRUD events, génération de billets (token HMAC signé), `/scan` atomique
  anti-double-scan, scanners/portes, stats temps réel, pages publiques + inscription.
- ⬜ Étape 2 — Pages publiques (web)
- ⬜ Étape 3 — Dashboard organisateur (web)
- ⬜ Étape 4 — App mobile Flutter

## Décisions techniques

- **QR au format SVG** (pas PNG) : la génération PNG nécessite `canvas`, indisponible
  sur le runtime Workers. Le SVG est pur-JS (lib `qrcode`), rendu net partout et
  convertible côté client. Endpoint : `GET /public/t/:token/qr`.
- **Mots de passe : PBKDF2-SHA256** (WebCrypto) — pas de binaire natif type bcrypt.
- **Tokens QR opaques** : `<ticketId>.<HMAC-SHA256 tronqué>`, vérif signature + statut DB.
- **Anti-double-scan** : `UPDATE tickets SET status='used' WHERE id=? AND status='valid'`
  + contrôle de `meta.changes` (atomique côté SQLite/D1).
- **Scanners** : JWT de portée `scanner` distinct du JWT organisateur (rejeté sur les
  routes organisateur).

---

## Démarrage API (local)

```bash
cd api
npm install
cp .dev.vars.example .dev.vars            # secrets locaux
npx wrangler d1 migrations apply qr-events --local
npm run dev                                # http://localhost:8787
```

## Déploiement Cloudflare

```bash
cd api
npx wrangler d1 create qr-events           # → coller database_id dans wrangler.toml
npx wrangler kv namespace create CACHE     # → coller id dans wrangler.toml
npx wrangler secret put JWT_SECRET
npx wrangler secret put QR_HMAC_SECRET
npx wrangler d1 migrations apply qr-events --remote
npm run deploy
```

---

## Endpoints

Réponse uniforme : `{ ok: true, data }` ou `{ ok: false, error: { code, message } }`.

### Auth organisateur
| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/register` | `{ email, name, password }` → `{ token, organizer }` |
| POST | `/auth/login` | `{ email, password }` → `{ token, organizer }` |

### Événements (Bearer organisateur)
| Méthode | Route | Description |
|---|---|---|
| GET | `/events` | Mes événements (+ nb billets) |
| POST | `/events` | Créer `{ slug, name, registration_mode, capacity, ... }` |
| GET | `/events/:id` | Détail |
| PATCH | `/events/:id` | Éditer (incl. `status: published`) |
| DELETE | `/events/:id` | Supprimer |
| GET | `/events/:id/stats` | Entrées temps réel + affluence/heure |

### Billets (Bearer organisateur)
| Méthode | Route | Description |
|---|---|---|
| GET | `/events/:id/tickets?status=` | Liste |
| POST | `/events/:id/tickets/batch` | `{ count, category }` ou `{ holders:[...] }` |
| PATCH | `/tickets/:id` | `{ action: approve \| revoke \| reinstate }` |

### Scanners / portes (Bearer organisateur)
| Méthode | Route | Description |
|---|---|---|
| GET | `/events/:id/scanners` | Liste |
| POST | `/events/:id/scanners` | `{ name }` → `{ access_code }` |
| DELETE | `/scanners/:id` | Supprimer |

### Scan (Bearer scanner)
| Méthode | Route | Description |
|---|---|---|
| POST | `/scanner/login` | `{ access_code }` → token scanner (public) |
| POST | `/scan` | `{ token, deviceId }` → `ok\|already_used\|invalid\|revoked\|pending\|wrong_event` |

`/scan` supporte un header `Idempotency-Key` (rejeu réseau → même résultat, KV 120 s).

### Public (sans auth)
| Méthode | Route | Description |
|---|---|---|
| GET | `/public/:orgSlug/:eventSlug` | Landing (capacité restante) |
| POST | `/public/:orgSlug/:eventSlug/register` | Inscription (`open`→valid, `approval`→pending) |
| GET | `/public/t/:token/qr` | Image SVG du QR |

## Sécurité
- CORS restreint à `ALLOWED_ORIGINS`.
- Rate-limit KV sur `/auth/*`, `/scan`, `/scanner/login`, inscription publique.
- Isolation multi-tenant vérifiée sur chaque requête (scope `organizer_id`).
- Validation atomique anti-double-scan en DB.
