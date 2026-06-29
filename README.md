# QR Events — plateforme SaaS multi-organisateurs

Monorepo : événements, QR codes signés, pages publiques d'inscription et app
mobile de scan. Tout tient dans le **free tier Cloudflare**.

## 🔗 Live

| Service                                         | URL                                                                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| 🚀 **App** (dashboard + pages publiques + scan) | **https://qr-events.pages.dev** (Cloudflare Pages)                                  |
| 🪧 Vitrine (présentation)                       | https://khalilbenaz.github.io/qr-events/ (GitHub Pages)                             |
| ⚙️ API (Cloudflare Worker)                      | https://qr-events-api.khalilbenaz.workers.dev                                       |
| 📱 Mobile (APK)                                 | [Dernière release GitHub](https://github.com/khalilbenaz/qr-events/releases/latest) |

> 🧪 **Démo** — organisateur : `demo@qrevents.app` / `demo12345`.

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

- 👤 **Comptes & offres** : l'inscription d'un organisateur crée un compte **en attente** ;
  un **administrateur** le valide et lui attribue une **offre** (Découverte / Pro / Business)
  qui plafonne le nombre d'événements et de billets. Voir [Comptes & offres](#comptes--offres).
- 🎨 **Templates par type d'événement** : la page publique adopte une mise en page **différente
  selon le thème** — _Live_ (concert/soirée/festival, immersif néon), _Élégant_ (mariage/gala,
  serif & or), _Pro_ (conférence/atelier/expo, structuré), _Sport_ (nerveux).
- 🗺️ **Carte du lieu** intégrée (Google Maps sans clé) sur la page d'événement **et en aperçu live**
  dans le formulaire de création/édition.
- 🚪 **Portes dédiées par catégorie** : chaque scanner peut n'accepter qu'une catégorie de billets
  (ex. porte VIP) ; un billet d'une autre catégorie est refusé (`wrong_category`) sans être consommé.
- 🎟️ **Deux façons d'obtenir un billet, en parallèle** : génération manuelle de lots
  par l'organisateur **et** inscription publique en ligne (sur le même événement).
- 🏷️ **Catégories de billets** (ex. Standard / VIP / Presse) avec **mode d'inscription par
  catégorie** : chaque catégorie peut être _libre_, _avec validation_ ou _sur invitation_ (fermée).
- 🪧 **Page organisateur** `/{org-slug}` : grille d'affiches de tous ses événements publiés.
- 🔄 **Suivi d'inscription** (mode `approval`) : lien permanent `/ticket/:token` ; dès validation,
  le QR apparaît (page auto-rafraîchie).
- ⏳ **Compte à rebours** et **affiche de couverture** en hero.
- 📦 **APK publié en GitHub Release** à chaque tag `v*`.

### Comptes & offres

- **Administrateur** : le compte dont l'email = `ADMIN_EMAIL` est **auto-validé** avec le rôle
  admin. `ADMIN_EMAIL` est un **secret** (jamais commité) : `npx wrangler secret put ADMIN_EMAIL`
  avec **ton email**, puis `npx wrangler deploy`.
- **Validation** : un nouvel organisateur est `pending` (il voit un écran d'attente et ne peut
  rien créer). L'admin le valide depuis **`/app/admin`** et choisit son offre.
- **Offres** (limites, modifiables dans `api/src/lib/plans.ts` + `web/src/lib/plans.ts`) :

  | Offre      | Événements | Billets / événement |
  | ---------- | ---------- | ------------------- |
  | Découverte | 1          | 100                 |
  | Pro        | 10         | 2000                |
  | Business   | illimité   | illimité            |

## Décisions techniques

- **QR au format SVG** (pas PNG) : la génération PNG nécessite `canvas`, indisponible
  sur le runtime Workers. Le SVG est pur-JS (lib `qrcode`), rendu net partout et
  convertible côté client. Endpoint : `GET /public/t/:token/qr`.
- **Mots de passe : PBKDF2-SHA256** (WebCrypto) — pas de binaire natif type bcrypt.
- **Tokens QR opaques** : `<ticketId>.<HMAC-SHA256 tronqué>`, vérif signature + statut DB.
- **Anti-double-scan** : `UPDATE tickets SET status='used' WHERE id=? AND status='valid'`
  - contrôle de `meta.changes` (atomique côté SQLite/D1).
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

- liens vers l'app) est publié par [`deploy-pages.yml`](.github/workflows/deploy-pages.yml).
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

### Auth & compte

| Méthode | Route            | Description                                                             |
| ------- | ---------------- | ----------------------------------------------------------------------- |
| POST    | `/auth/register` | `{ email, name, password }` → `{ token, organizer }` (statut `pending`) |
| POST    | `/auth/login`    | `{ email, password }` → `{ token, organizer }`                          |
| GET     | `/me`            | Compte courant (rôle, statut, offre)                                    |

### Admin (Bearer admin)

| Méthode | Route                           | Description                            |
| ------- | ------------------------------- | -------------------------------------- |
| GET     | `/admin/organizers`             | Tous les comptes (+ nb d'événements)   |
| GET     | `/admin/plans`                  | Offres disponibles                     |
| POST    | `/admin/organizers/:id/approve` | `{ plan }` → valide + attribue l'offre |
| POST    | `/admin/organizers/:id/suspend` | Suspend le compte                      |
| POST    | `/admin/organizers/:id/plan`    | `{ plan }` → change l'offre            |

### Événements (Bearer organisateur)

| Méthode | Route               | Description                                                                 |
| ------- | ------------------- | --------------------------------------------------------------------------- |
| GET     | `/events`           | Mes événements (+ nb billets)                                               |
| POST    | `/events`           | Créer `{ slug, name, registration_mode, capacity, theme, categories, ... }` |
| GET     | `/events/:id`       | Détail                                                                      |
| PATCH   | `/events/:id`       | Éditer (incl. `status: published`)                                          |
| DELETE  | `/events/:id`       | Supprimer                                                                   |
| GET     | `/events/:id/stats` | Entrées temps réel + affluence/heure                                        |

### Billets (Bearer organisateur)

| Méthode | Route                         | Description                                  |
| ------- | ----------------------------- | -------------------------------------------- |
| GET     | `/events/:id/tickets?status=` | Liste                                        |
| POST    | `/events/:id/tickets/batch`   | `{ count, category }` ou `{ holders:[...] }` |
| PATCH   | `/tickets/:id`                | `{ action: approve \| revoke \| reinstate }` |

### Scanners / portes (Bearer organisateur)

| Méthode | Route                  | Description                                                              |
| ------- | ---------------------- | ------------------------------------------------------------------------ |
| GET     | `/events/:id/scanners` | Liste                                                                    |
| POST    | `/events/:id/scanners` | `{ name, category? }` → `{ access_code }` (porte dédiée à une catégorie) |
| DELETE  | `/scanners/:id`        | Supprimer                                                                |

### Scan (Bearer scanner)

| Méthode | Route            | Description                                                                                        |
| ------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| POST    | `/scanner/login` | `{ access_code }` → token scanner (public)                                                         |
| POST    | `/scan`          | `{ token, deviceId }` → `ok\|already_used\|invalid\|revoked\|pending\|wrong_event\|wrong_category` |
| GET     | `/scan/manifest` | Billets de l'événement (cache offline mobile)                                                      |

`/scan` supporte un header `Idempotency-Key` (rejeu réseau → même résultat, KV 120 s).

### Public (sans auth)

| Méthode | Route                                        | Description                                                                 |
| ------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| GET     | `/public/events`                             | Tous les événements publiés à venir (home publique)                         |
| GET     | `/public/org/:orgSlug`                       | Page organisateur : ses événements publiés                                  |
| GET     | `/public/event/:orgSlug/:eventSlug`          | Landing (capacité restante, catégories+modes)                               |
| POST    | `/public/event/:orgSlug/:eventSlug/register` | Inscription `{ name, email, category? }` (`open`→valid, `approval`→pending) |
| GET     | `/public/ticket/:token`                      | Statut d'un billet + QR si validé (suivi inscription)                       |
| GET     | `/public/t/:token/qr`                        | Image SVG du QR                                                             |

## Sécurité

- CORS restreint à `ALLOWED_ORIGINS`.
- Rate-limit KV sur `/auth/*`, `/scan`, `/scanner/login`, inscription publique.
- Isolation multi-tenant vérifiée sur chaque requête (scope `organizer_id`).
- Validation atomique anti-double-scan en DB.
