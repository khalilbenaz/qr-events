# QR Events — plateforme SaaS multi-organisateurs

Monorepo : événements, QR codes signés, pages publiques d'inscription et app
mobile de scan. Tout tient dans le **free tier Cloudflare**.

## 🔗 Live

| Service | URL |
|---|---|
| 🚀 **App** (dashboard + pages publiques + scan) | **https://qr-events.pages.dev** (Cloudflare Pages) |
| 🪧 Vitrine (présentation) | https://khalilbenaz.github.io/qr-events/ (GitHub Pages) |
| ⚙️ API (Cloudflare Worker) | https://qr-events-api.khalilbenaz.workers.dev |
| 📱 Mobile (APK) | [Dernière release GitHub](https://github.com/khalilbenaz/qr-events/releases/latest) |

> 🧪 **Compte démo** : `demo@qrevents.app` / `demo12345` (dashboard organisateur).

📖 Docs : [Architecture](docs/ARCHITECTURE.md) · [Déploiement](docs/DEPLOYMENT.md)

```
api/     Cloudflare Workers + Hono + D1 + KV   ← Étape 1 ✅
web/     React + Vite (dashboard + pages)      ← Étapes 2 & 3 ✅
mobile/  Flutter Android (scan)                ← Étape 4 ✅
```

## État

- ✅ **Étape 1 — Backend API** : auth JWT organisateur, isolation multi-tenant,
  CRUD events, génération de billets (token HMAC signé), `/scan` atomique
  anti-double-scan, scanners/portes, stats temps réel, pages publiques + inscription.
- ✅ **Étape 2 — Pages publiques** (`web/`) : landing `/{org-slug}/{event-slug}`,
  inscription optionnelle (none/open/approval), affichage + lien du QR.
- ✅ **Étape 3 — Dashboard organisateur** (`web/`) : login/register, liste &
  CRUD events, génération de lots de billets + QR, validation des inscriptions,
  révocation, scanners/portes, stats live (10 s) + affluence/heure, export CSV.
- ✅ **Étape 4 — App mobile Flutter** (`mobile/`, Android) : login scanner par
  code de porte (token en `flutter_secure_storage`), scan caméra (`mobile_scanner`),
  validation `/scan` (`dio`) avec feedback couleur/son/vibration, compteur d'entrées
  temps réel, **mode offline** (cache `sqflite` + file de scans + sync auto au retour
  réseau). Build : `flutter build apk --release`.

### Fonctionnalités additionnelles
- 🎟️ **Deux façons d'obtenir un billet, en parallèle** : génération manuelle de lots
  par l'organisateur **et** inscription publique en ligne (sur le même événement).
- 🏷️ **Catégories de billets** (ex. Standard / VIP / Presse) définies par l'organisateur,
  proposées au choix à l'inscription et validées côté API.
- 🎨 **Thèmes d'événement** (concert, conférence, fête, sport, mariage, expo, atelier,
  gala, festival…) : couleurs + emoji appliqués aux cartes et à la page publique.
- 🔄 **Suivi d'inscription** (mode `approval`) : l'inscrit reçoit un lien permanent
  `/ticket/:token` ; dès que l'organisateur valide, son QR apparaît (page auto-rafraîchie).
- 📦 **APK publié en GitHub Release** à chaque tag `v*`.

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

## Démarrage Web (dashboard + pages publiques)

```bash
cd web
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:8787
npm run dev                 # http://localhost:5173
```

Routes : `/` (accueil), `/app/login` · `/app/events` (dashboard organisateur),
`/{org-slug}/{event-slug}` (page publique), `/ticket/:token` (suivi d'un billet).

**Hébergement de l'app : Cloudflare Pages** (`https://qr-events.pages.dev`).
Déploiement : `cd web && npm run deploy` (build + `wrangler pages deploy`).
Le fichier `public/_redirects` assure le fallback SPA. L'origine est déjà dans
`ALLOWED_ORIGINS` de l'API. Auto-déploiement CI possible via
[`deploy-cloudflare.yml`](.github/workflows/deploy-cloudflare.yml) (opt-in : secret
`CLOUDFLARE_API_TOKEN` + variable `CF_DEPLOY=true`).

**GitHub Pages = vitrine uniquement** : le site statique [`vitrine/`](vitrine/) (présentation
+ liens vers l'app) est publié par [`deploy-pages.yml`](.github/workflows/deploy-pages.yml).
Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## App mobile (Flutter, Android)

```bash
cd mobile
flutter pub get
# Émulateur : l'API locale est joignable via 10.0.2.2 (déjà par défaut).
flutter run

# APK distribuable (pointant vers l'API de prod) :
flutter build apk --release --dart-define=API_URL=https://qr-events-api.<sous-domaine>.workers.dev
# → build/app/outputs/flutter-apk/app-release.apk
```

Le code de porte se crée dans le dashboard (onglet **Scanners**). Le scanner se
connecte avec ce code ; le token est stocké chiffré. Mode offline : au premier
login en ligne, l'app télécharge le manifeste des billets (`GET /scan/manifest`)
puis peut valider sans réseau ; les scans hors-ligne sont rejoués automatiquement.

**APK publié sur GitHub Releases** : pousser un tag `v*` déclenche le workflow
[`release-apk.yml`](.github/workflows/release-apk.yml) qui build l'APK et l'attache
à une Release (API de prod embarquée). Déclenchement manuel possible
(`Actions → Release APK Android → Run workflow`) → APK en artefact.

> Signature APK : par défaut le build release utilise la clé debug (installable en
> direct). Pour une vraie distribution, créer un keystore et configurer
> `android/app/build.gradle.kts` + `key.properties`.

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
| POST | `/events` | Créer `{ slug, name, registration_mode, capacity, theme, categories, ... }` |
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
| GET | `/scan/manifest` | Billets de l'événement (cache offline mobile) |

`/scan` supporte un header `Idempotency-Key` (rejeu réseau → même résultat, KV 120 s).

### Public (sans auth)
| Méthode | Route | Description |
|---|---|---|
| GET | `/public/event/:orgSlug/:eventSlug` | Landing (capacité restante) |
| POST | `/public/event/:orgSlug/:eventSlug/register` | Inscription `{ name, email, category? }` (`open`→valid, `approval`→pending) |
| GET | `/public/ticket/:token` | Statut d'un billet + QR si validé (suivi inscription) |
| GET | `/public/t/:token/qr` | Image SVG du QR |

## Sécurité
- CORS restreint à `ALLOWED_ORIGINS`.
- Rate-limit KV sur `/auth/*`, `/scan`, `/scanner/login`, inscription publique.
- Isolation multi-tenant vérifiée sur chaque requête (scope `organizer_id`).
- Validation atomique anti-double-scan en DB.
