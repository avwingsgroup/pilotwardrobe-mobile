# Build & release

## Identifiers

| | Value |
| --- | --- |
| App name | Pilotwardrobe |
| Bundle id / applicationId | `com.pilotwardrobe.app` (assumed — confirm before the first store upload; it cannot change afterwards) |
| URL scheme | `pilotwardrobe://` |
| Web host for app links | `pilotwardrobe.com` |

## Environments

| Build | Command | API | Web app | Sandbox gateway |
| --- | --- | --- | --- | --- |
| development | `npm run build` | `.env.development` | `.env.development` | shown |
| staging | `npm run build:staging` | `.env.staging` | `.env.staging` | shown |
| production | `npm run build:production` | `https://api.pilotwardrobe.com` | `https://pilotwardrobe.com` | hidden |

`.env.staging` contains placeholder hosts — set the real staging API/web hosts before
the first staging build. Every build runs `vue-tsc` first and fails on type errors.

Per-environment native builds use the same native project; only `dist/` differs:

```bash
npm run build:production && npx cap sync
```

For side-by-side staging and production installs, add an Android `staging`
product flavour with `applicationIdSuffix ".staging"` and an iOS scheme/configuration
with a different bundle id. This is not set up yet.

## Versioning

- `package.json` `version` is the marketing version (e.g. `1.2.0`).
- Android: `android/app/build.gradle` → `versionName` (same as marketing) and
  `versionCode` (integer, +1 for every upload).
- iOS: Xcode target → *Version* (`MARKETING_VERSION`) and *Build*
  (`CURRENT_PROJECT_VERSION`, +1 for every upload).
- The app sends its version when registering a push device, so keep them in sync.

## Icons & splash

Sources in `assets/` (`icon-only.png`, `icon-foreground.png`, `icon-background.png`,
`splash.png`, `splash-dark.png`, 1024–2732 px, generated from `docs/logos`).
Regenerate after changes:

```bash
npm run assets && npx cap sync
```

## Android release

1. Create an upload keystore once (keep it out of the repo — `*.jks`/`*.keystore` are gitignored):
   ```bash
   keytool -genkey -v -keystore pilotwardrobe-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Provide signing values via `~/.gradle/gradle.properties` or CI secrets, and add a
   `signingConfigs.release` block in `android/app/build.gradle` that reads them.
3. Bump `versionCode` / `versionName`.
4. Build:
   ```bash
   npm run build:production && npx cap sync android
   cd android && ./gradlew bundleRelease     # app/build/outputs/bundle/release/app-release.aab
   ```
5. Upload the AAB to Play Console (internal testing first). Enrol in Play App Signing
   and copy the **app signing** SHA-256 into `assetlinks.json` on the web host so app
   links verify.
6. Play Console declarations: camera and photos (listings, disputes, identity
   verification), data safety (account, photos, identity documents processed by the
   backend; payments handled by third-party gateways), notifications.

Release builds include only `src/main/res/xml/network_security_config.xml`
(HTTPS + system CAs). Keep `minifyEnabled` decisions in mind: if enabling R8, keep
Capacitor plugin classes (Capacitor's proguard rules ship with the plugins).

## iOS release (macOS)

1. `npm run build:production && npx cap sync ios && npx cap open ios`.
2. Xcode → App target → *Signing & Capabilities*: team, bundle id, and add
   *Associated Domains* (`applinks:pilotwardrobe.com`), *Push Notifications*,
   *Background Modes → Remote notifications* (when push is enabled).
3. Bump Version / Build.
4. *Product → Archive*, then distribute to App Store Connect / TestFlight.
5. App Store privacy details mirror the Play data-safety answers. Usage-description
   strings are already in `Info.plist`; `ITSAppUsesNonExemptEncryption = false`
   (only standard HTTPS).
6. Host `apple-app-site-association` on the web host for universal links.

## Pre-release checklist

- [ ] `npm run type-check && npm test` green; `npm run test:e2e` green against staging
- [ ] `.env.production` hosts correct; no `.local` overrides on the build machine
- [ ] Backend production `CORS_ALLOWED_ORIGINS` includes `https://app.pilotwardrobe.local` and `capacitor://app.pilotwardrobe.local`
- [ ] Backend `APP_FRONTEND_URL` host = `VITE_WEB_APP_URL` host (payment return URLs)
- [ ] Sandbox gateway not offered (production build) and disabled on the backend
- [ ] Firebase config files present if `VITE_PUSH_ENABLED=true`
- [ ] `assetlinks.json` / `apple-app-site-association` deployed and verified
- [ ] Device checklist in `mobile-testing.md` passed on one iOS and one Android device
- [ ] Version / build numbers bumped
