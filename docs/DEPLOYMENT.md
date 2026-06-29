# Déploiement

Le projet est **déjà déployé**. Cette page documente l'état et comment reproduire/mettre à jour.

## État actuel

| Élément           | Valeur                                                             |
| ----------------- | ------------------------------------------------------------------ |
| **App** (web)     | **https://qr-events.pages.dev** — Cloudflare Pages                 |
| Vitrine           | https://khalilbenaz.github.io/qr-events/ — GitHub Pages (statique) |
| API (Worker)      | https://qr-events-api.khalilbenaz.workers.dev                      |
| D1 database       | `qr-events` (`c49e10ec-…`)                                         |
| KV namespace      | `CACHE` (`1de26c7d…`)                                              |
| Compte Cloudflare | _(privé — voir `wrangler whoami`)_                                 |
| Dépôt             | `khalilbenaz/qr-events` (public)                                   |

> ℹ️ **Répartition** : l'**application** (dashboard + pages publiques + scan) tourne sur
> **Cloudflare Pages** (même plateforme que l'API). **GitHub Pages** n'héberge plus que la
> **vitrine** statique (`vitrine/`). Le rendu visuel est identique quel que soit l'hébergeur :
> il dépend du code, pas de la plateforme.

## 1. Backend — Cloudflare Workers

```bash
cd api
# (première fois) créer les ressources
npx wrangler d1 create qr-events            # → database_id dans wrangler.toml
npx wrangler kv namespace create CACHE      # → id dans wrangler.toml

# secrets (valeurs aléatoires, distinctes)
openssl rand -hex 32 | npx wrangler secret put JWT_SECRET
openssl rand -hex 32 | npx wrangler secret put QR_HMAC_SECRET

# migrations + déploiement
npx wrangler d1 migrations apply qr-events --remote
npx wrangler deploy
```

Variables (`wrangler.toml [vars]`) :

- `ALLOWED_ORIGINS` — origines CORS autorisées (inclut `https://khalilbenaz.github.io`).
- `PUBLIC_API_URL` — URL publique de l'API (liens QR).

## 2. App web — Cloudflare Pages

Déploiement manuel (authentifié via `wrangler login`) :

```bash
cd web
npm run deploy   # = npm run build + wrangler pages deploy dist --project-name qr-events
```

Build avec `VITE_API_URL=https://qr-events-api.khalilbenaz.workers.dev` (base `/`).
L'origine `https://qr-events.pages.dev` est dans `ALLOWED_ORIGINS` de l'API.

**Auto-déploiement (opt-in)** via [`deploy-cloudflare.yml`](../.github/workflows/deploy-cloudflare.yml) :

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo khalilbenaz/qr-events   # token "Pages: Edit"
gh secret set CLOUDFLARE_ACCOUNT_ID --repo khalilbenaz/qr-events --body 88ab66d1187457a9b98ccf75e1a4f0fd
gh variable set CF_DEPLOY --repo khalilbenaz/qr-events --body true
```

## 3. Vitrine — GitHub Pages

Site statique [`vitrine/index.html`](../vitrine/index.html) publié par
[`deploy-pages.yml`](../.github/workflows/deploy-pages.yml) à chaque push touchant `vitrine/**`.
Présentation + liens vers l'app Cloudflare ; ne contient aucune logique applicative.

## 4. Mobile — APK Android

```bash
cd mobile
flutter build apk --release \
  --dart-define=API_URL=https://qr-events-api.khalilbenaz.workers.dev
# → build/app/outputs/flutter-apk/app-release.apk
```

Distribuer l'APK directement au staff (pas de store requis). Pour une vraie
signature de distribution, configurer un keystore (`key.properties` +
`android/app/build.gradle.kts`).

## CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) : typecheck API + build Web +
`flutter analyze` à chaque push / PR.
