# Native integrations

Capacitor 8 plugins in use, why, and what has to be configured outside the code.
Each plugin is wrapped in `src/services/*` so screens never import Capacitor directly
and every wrapper has a browser fallback for development.

| Plugin | Wrapper | Purpose |
| --- | --- | --- |
| `@aparajita/capacitor-secure-storage` | `secureStore.ts` | bearer token in Keychain / Android Keystore |
| `@capacitor/preferences` | `preferences.ts` | non-sensitive settings (theme, onboarding flag, recent searches, push device id) |
| `@capacitor/camera` | `camera.ts` | listing photos, dispute evidence, KYC documents and selfie |
| `@capacitor/browser` | `checkoutBrowser.ts` | hosted payment pages, external links |
| `@capacitor/app` | `appLinks.ts`, `lifecycle.ts`, `App.vue` | deep links, resume/pause, Android back button |
| `@capacitor/push-notifications` | `push.ts` | FCM/APNs device registration and taps |
| `@capacitor/network` | `network.ts` | offline banner, fail-fast mutations |
| `@capacitor/device` | `push.ts` | device name for the push device record |
| `@capacitor/keyboard`, `status-bar`, `splash-screen` | `platform.ts` | keyboard resize, status bar style per theme, splash hide after bootstrap |
| `@capacitor/share` | `ListingDetailPage` | native share sheet for listing links (falls back to clipboard) |

## Secure storage

- Key prefix `pw.`; iOS accessibility `afterFirstUnlockThisDeviceOnly`, iCloud sync off
  (tokens never leave the device and are excluded from backups).
- Android: `allowBackup="false"` and `fullBackupContent="false"` in the manifest.
- Stored value = `{ token, expiresAt }`. Expired tokens are dropped at launch.
- Sign-out (or any 401) clears the token, the in-memory copy, per-user Preferences
  and KYC flow state.

## Camera & photos

`camera.ts` → `pickPhotos({ source: 'camera' | 'library' })`, JPEG quality 82, max
width 2000 px, then uploaded through `POST /media` (≤ 15 MB). Permission denial
raises `PhotoPermissionError`; screens explain and offer "Open settings".

Declared permissions:

- **Android** `CAMERA`, `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE` (≤ API 32);
  camera feature `required="false"`.
- **iOS** `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`,
  `NSPhotoLibraryAddUsageDescription` in `ios/App/App/Info.plist`.

KYC capture (K3) uses the system camera UI; the frame's live document overlay would
need a custom camera plugin (see assumptions).

## Payments (hosted checkout)

1. `POST /orders` (or `POST /listings/{id}/promote` for S9) with an `Idempotency-Key`.
2. `POST /payments/initialize` with the order/promotion id, chosen gateway and
   `return_url = ${VITE_WEB_APP_URL}/payment/callback`, again with an idempotency key
   that is reused if the user retries the same attempt.
3. The returned `authorization_url` is opened only if its host is in the allow-list
   (`utils/security.ts → PAYMENT_GATEWAY_HOSTS`: checkout.stripe.com, paypal.com,
   checkout.paystack.com, flutterwave.com, monnify.com — identical to the backend
   `redirect_hosts`). Otherwise the attempt is aborted.
4. The page opens in SFSafariViewController / Chrome Custom Tabs; card data never
   passes through the app.
5. When the browser closes, or the return link reopens the app, or the user simply
   waits, `usePaymentFlow` polls `GET /payments/{reference}` (1.5 s → 8 s backoff,
   60 s budget, resumes on app foreground). Only a server status of `succeeded` leads
   to C5; `failed`, `cancelled`, `expired` show the reason with "Try again".
6. Non-production builds can use the backend `sandbox` gateway, resolved in-app via
   `POST /sandbox/payments/{reference}/{approve|decline|cancel}`.

There is no Apple Pay / Google Pay or saved card support in the backend; gateways
provide their own wallets inside the hosted page.

## Deep links & app links

`appLinks.ts` listens for `appUrlOpen` and maps the URL with
`utils/routeMapping.ts → deepLinkToAppRoute()` (unit-tested). Accepted forms:

- Custom scheme: `pilotwardrobe://listing/<slug>`, `pilotwardrobe://hangar/orders/<id>` …
- Web links on the production host: `https://pilotwardrobe.com/marketplace/...`,
  `/hangar/...`, `/messages/...`, `/orders/...`, `/seller/...`, `/auth/reset?token=`,
  `/auth/verify`, `/payment/callback?reference=` → `/payment/<reference>` (status
  polling, never "paid" by itself).

Web paths are the web SPA's routes (backend e-mails and push `link` payloads use
them), translated to app routes; unknown paths go to Notifications/Home instead of
a dead screen.

Configuration:

- **Android** `AndroidManifest.xml`: `VIEW` intent filter for scheme `pilotwardrobe`,
  and an `autoVerify` filter for `https://pilotwardrobe.com` with the path prefixes
  above. Verification requires `https://pilotwardrobe.com/.well-known/assetlinks.json`
  listing `com.pilotwardrobe.app` and the release signing certificate SHA-256.
  For staging, add a second `<data android:host>` for the staging web host.
- **iOS** `Info.plist`: URL scheme `pilotwardrobe`. Universal links additionally need
  the *Associated Domains* capability (`applinks:pilotwardrobe.com`) in Xcode and
  `https://pilotwardrobe.com/.well-known/apple-app-site-association` on the web host
  (Team ID + bundle id, same paths). Both files are owned by the web deployment.

## Push notifications

The backend owns Firebase credentials and sends via FCM; the app only registers its
token. Flow (`push.ts`):

- Enabled only when `VITE_PUSH_ENABLED=true` (registering on Android without Firebase
  config crashes natively).
- After sign-in the permission is requested once, in context; the token is sent with
  `POST /me/devices { token, platform, device_name, app_version }` and the returned id
  kept in Preferences.
- Before sign-out `DELETE /me/devices/{id}` runs while the token is still valid.
- Foreground: badge counts refresh and an in-app toast offers "View".
- Tap: `data.notification_id` is marked read, `data.link` (web path) is mapped to an
  app route.

To enable:

- **Android**: put the Firebase project's `google-services.json` in `android/app/`
  (gitignored; the Gradle file applies the Google services plugin only when it is
  present). `POST_NOTIFICATIONS` is declared for Android 13+.
- **iOS**: enable *Push Notifications* and *Background Modes → Remote notifications* in
  Xcode, upload the APNs key to Firebase, add `GoogleService-Info.plist` to the App
  target, and follow the Capacitor push guide for the `AppDelegate` token forwarding
  to Firebase Messaging (the backend sends FCM tokens, so iOS must register through
  Firebase, not raw APNs tokens).

## Network security

- Release: HTTPS only, system CAs only
  (`android/app/src/main/res/xml/network_security_config.xml`); iOS ATS defaults
  (no exceptions).
- Debug only: `android/app/src/debug/res/xml/network_security_config.xml` also trusts
  user-installed CAs for a local backend certificate. This file is not packaged in
  release builds. TLS validation is never disabled in code.

## Platform behaviour

- Android hardware back: dismiss overlay → pop stack → from a tab root go Home →
  exit from Home.
- Keyboard: `resize: ionic`, inputs scrolled into view; accessory bar on iOS.
- Status bar: light/dark content follows the theme (`syncStatusBar`).
- Splash: `launchAutoHide: false`; hidden after bootstrap and first route render, so
  the user never sees an unguarded screen.
- WebView origin: `server.hostname = app.pilotwardrobe.local` (see setup → CORS).
