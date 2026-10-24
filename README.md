# pilotwardrobe-mobile

The Pilotwardrobe aviation marketplace app for iOS and Android: buy, sell and swap
pilot gear with escrow-protected payments, offers, messaging, disputes, a seller
wallet and identity verification.

Built with **Ionic Vue 3 + TypeScript + Capacitor 8**, Pinia and Vue Router, on the
Pilotwardrobe Laravel API (`/api/v1`).

## Quick start

```bash
npm install
npm run dev            # http://localhost:8100, proxies /api to the local backend
```

Requires Node ≥ 22.15 and the backend running (default `https://pilotwardrobe-api.test`).
Demo account: `pilot@example.com` / `Password1`.

Native:

```bash
npm run android        # build, sync, open Android Studio
npm run ios            # build, sync, open Xcode (macOS)
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | dev server with API proxy |
| `npm run type-check` | vue-tsc |
| `npm test` | unit + component tests |
| `npm run test:e2e` | Playwright journeys against the local API |
| `npm run build` / `build:staging` / `build:production` | type-check + bundle for an environment |
| `npm run cap:sync` | sync web build and plugins to `android/` and `ios/` |
| `npm run assets` | regenerate icons and splash screens |

## Configuration

Environment lives in `.env.development`, `.env.staging`, `.env.production`
(documented in `.env.example`; personal overrides in gitignored `.env.*.local`).
`VITE_*` values are public — never put server secrets in them.

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/mobile-architecture.md](docs/mobile-architecture.md) | structure, API client, auth, state, business-rule boundaries |
| [docs/mobile-screen-api-mapping.md](docs/mobile-screen-api-mapping.md) | every design frame → route → screen → endpoints |
| [docs/mobile-setup.md](docs/mobile-setup.md) | local setup, backend CORS/TLS, devices, troubleshooting |
| [docs/mobile-native-integrations.md](docs/mobile-native-integrations.md) | secure storage, camera, payments, deep links, push |
| [docs/mobile-build-release.md](docs/mobile-build-release.md) | environments, versioning, signing, store release |
| [docs/mobile-testing.md](docs/mobile-testing.md) | unit, E2E and device checklist |
| [docs/mobile-implementation-assumptions.md](docs/mobile-implementation-assumptions.md) | deviations from the designs and open items |

Source material: `docs/mobile-designs` (UI), `docs/web-frontend` (behaviour),
`docs/backend` (API contract).

## License

MIT — see [LICENSE](LICENSE).
