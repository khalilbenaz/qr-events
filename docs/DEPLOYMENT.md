# Déploiement

Le projet est **déjà déployé**. Cette page documente l'état et comment reproduire/mettre à jour.

## État actuel

| Élément | Valeur |
|---|---|
| API (Worker) | https://qr-events-api.khalilbenaz.workers.dev |
| Web (GitHub Pages) | https://khalilbenaz.github.io/qr-events/ |
| D1 database | `qr-events` (`c49e10ec-…`) |
| KV namespace | `CACHE` (`1de26c7d…`) |
| Compte Cloudflare | demo@qrevents.app |
| Dépôt | `khalilbenaz/qr-events` (privé) |

> ⚠️ **Visibilité** : le dépôt est privé, mais un site **GitHub Pages publié reste public**
> (les Pages privées nécessitent GitHub Enterprise). Le code source reste donc privé,
> mais l'app web est accessible publiquement à l'URL ci-dessus.

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

## 2. Web — GitHub Pages (automatique)

Le workflow [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml)
se déclenche à chaque push sur `main` touchant `web/**` :

1. `npm ci && npm run build` avec
   - `VITE_BASE=/qr-events/` (sous-chemin du site projet)
   - `VITE_API_URL` = variable de dépôt `VITE_API_URL` (repli sur l'URL du Worker)
2. Copie `index.html` → `404.html` (fallback SPA sous GitHub Pages)
3. Déploiement via `actions/deploy-pages`

Pour changer l'URL de l'API utilisée par le site :

```bash
gh variable set VITE_API_URL --repo khalilbenaz/qr-events --body "https://<nouvelle-url>"
gh workflow run deploy-pages.yml --repo khalilbenaz/qr-events
```

## 3. Mobile — APK Android

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
