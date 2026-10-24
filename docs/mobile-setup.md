# Mobile setup (local development)

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | ≥ 22.15 | needed for `--use-system-ca` (see TLS below) |
| npm | 10+ | |
| Android Studio | current | SDK 35/36, an emulator image; JDK 17+ (bundled JBR works) |
| Xcode | 16+ (macOS only) | iOS builds; CocoaPods not required (Swift Package Manager) |
| Laravel API | `docs/backend` | running locally, e.g. Laragon at `https://pilotwardrobe-api.test` |

## First run

```bash
npm install
cp .env.example .env.development.local   # optional: override .env.development
npm run dev                              # http://localhost:8100
```

The browser build is for fast UI work. Native features (secure storage, camera,
push, in-app browser, deep links, status bar) degrade to web fallbacks there.

Demo account seeded by the backend: `pilot@example.com` / `Password1`.

## Environment files

| File | Used by | Committed |
| --- | --- | --- |
| `.env.example` | documentation of every variable | yes |
| `.env.development` | `npm run dev`, `npm run build` | yes (no secrets) |
| `.env.staging` | `npm run build:staging` | yes (no secrets) |
| `.env.production` | `npm run build:production` | yes (no secrets) |
| `.env.*.local` | personal overrides | **no** (gitignored) |

All `VITE_*` values end up in the shipped JavaScript bundle and are public. Only
client-safe values belong there; payment, Cloudinary, Prembly, Termii, Twilio,
Firebase server keys and Laravel secrets stay on the backend.

`src/config/env.ts` validates these at startup and is the only place URLs come from.

## Talking to the local backend

### Browser (`npm run dev`)

`VITE_DEV_PROXY=true` makes Vite proxy `/api` to `VITE_API_BASE_URL`, so the browser
never makes a cross-origin call and CORS does not matter.

**TLS:** Laragon serves `*.test` with its own CA. The dev script runs Vite with
`node --use-system-ca`, which trusts certificates in the Windows/macOS store. Install
the Laragon root CA into the OS store once (Laragon → Menu → SSL → "Add laragon.crt
to Trust Store"). Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

### Emulator / device

Native builds call the API host directly, so three things must line up:

1. **Reachable host.** `pilotwardrobe-api.test` resolves only on your PC. Either
   - create `.env.development.local` with `VITE_API_BASE_URL=https://<your-LAN-IP-or-tunnel-host>` and serve the API on that name, or
   - on the Android emulator, map the name: `adb root && adb remount` then add
     `10.0.2.2 pilotwardrobe-api.test` to `/system/etc/hosts` (emulator images without Play Store), or use a tunnel (ngrok / Cloudflare Tunnel) with a public certificate — the simplest option for physical devices.
   Set `VITE_DEV_PROXY=false` for native builds pointed at a real host.
2. **Trusted certificate.**
   - Android debug builds include `android/app/src/debug/res/xml/network_security_config.xml`, which trusts user-installed CAs. Install `laragon.crt` on the device (Settings → Security → Encryption & credentials → Install a certificate → CA). Release builds trust system CAs only.
   - iOS simulator/device: AirDrop/mail the CA, install the profile, then enable it under Settings → General → About → Certificate Trust Settings.
   - A tunnel with a public certificate avoids both steps.
3. **CORS + Sanctum on the backend.** The WebView origin is
   `https://app.pilotwardrobe.local` (Android) and `capacitor://app.pilotwardrobe.local`
   (iOS), set by `server.hostname` in `capacitor.config.ts`. Add them to the backend
   `.env`:

   ```dotenv
   CORS_ALLOWED_ORIGINS=http://localhost:5173,https://app.pilotwardrobe.local,capacitor://app.pilotwardrobe.local,http://localhost:8100
   ```

   then `php artisan config:clear`. Do **not** add these origins to
   `SANCTUM_STATEFUL_DOMAINS`: the app authenticates with bearer tokens, and a
   stateful origin makes Sanctum require a CSRF cookie (that is why the default
   `https://localhost` origin returned 419 and the custom hostname is used).

### Payments in development

The backend's `sandbox` gateway (`PAYMENTS_SANDBOX_ENABLED=true`) is shown as
"Sandbox" in C3 only when `VITE_APP_ENV` is not `production`. The payment status
screen then offers Approve / Decline / Cancel, which call the backend sandbox
endpoints; the order is still confirmed only by polling `GET /payments/{reference}`.

`return_url` is `${VITE_WEB_APP_URL}/payment/callback`; it must be on the backend's
`APP_FRONTEND_URL` host or initialisation is rejected.

## Running on devices

```bash
npm run android     # build, cap sync android, open Android Studio
npm run ios         # build, cap sync ios, open Xcode (macOS)
npx cap run android --target <id>   # straight to a device/emulator
```

After changing plugins or `capacitor.config.ts`, run `npm run cap:sync`.
After changing `assets/*.png`, run `npm run assets` to regenerate icons and splash.

Live reload on a device (optional):

```bash
npx cap run android -l --external   # serves from your PC; keep VITE_DEV_PROXY=true
```

## Useful scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Vite dev server on :8100 with API proxy |
| `npm run type-check` | `vue-tsc --noEmit` |
| `npm test` | unit + component tests (Vitest) |
| `npm run test:e2e` | Playwright journeys against the dev server + local API |
| `npm run build[:staging\|:production]` | type-check and bundle into `dist/` |
| `npm run cap:sync` | copy `dist/` and plugins into `android/` and `ios/` |
| `npm run assets` | regenerate app icons and splash screens |

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `self-signed certificate` in the Vite terminal | Laragon CA not in the OS store, or Node < 22.15 |
| Login returns 419 on a device | origin listed in `SANCTUM_STATEFUL_DOMAINS`; remove it (bearer mode) |
| Network error only on device, browser fine | CORS origins missing, host not resolvable, or CA not trusted on the device |
| "Payment could not be started" | `VITE_WEB_APP_URL` host differs from backend `APP_FRONTEND_URL` |
| Images show placeholders | seeded Cloudinary URLs return 404 (backend seed data) |
| Push never registers | `VITE_PUSH_ENABLED=false` or Firebase files missing — see `mobile-native-integrations.md` |
