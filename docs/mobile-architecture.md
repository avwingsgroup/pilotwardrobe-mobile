# Pilotwardrobe mobile — architecture

Ionic Vue 3 + TypeScript (strict) + Capacitor 8, one codebase for iOS and Android.
The Laravel API (`docs/backend`) is the source of truth for every business rule; the
app renders what the API returns and never decides money, permissions or state
transitions on its own.

## Stack

| Concern | Choice |
| --- | --- |
| UI | Ionic 9 (`@ionic/vue`, `@ionic/vue-router`), Vue 3.5 `<script setup>` |
| State | Pinia 3 (small, session-scoped stores) |
| Routing | vue-router 4 through Ionic's router (stack navigation, tabs) |
| HTTP | axios, wrapped once in `src/api/client.ts` |
| Native | Capacitor 8: app, browser, camera, device, keyboard, network, preferences, push-notifications, share, splash-screen, status-bar; `@aparajita/capacitor-secure-storage` (Keychain / Keystore) |
| Build | Vite 7, vue-tsc |
| Tests | Vitest + Vue Test Utils (unit/component), Playwright (browser E2E) |

## Source layout

```
src/
  config/env.ts        typed, validated VITE_* config (the only place URLs come from)
  api/                 HTTP client + one typed module per backend area
  types/               domain types (camelCase), mirroring docs/backend resources
  services/            native wrappers: secure storage, camera, push, browser, links, network…
  stores/              Pinia: auth, settings, network, badges, catalogue
  composables/         useAsync, usePagedList, useForm, useFeedback, useAuthGate, …
  router/              routes, pure guard logic, router instance
  components/          shared presentational components (design system)
  features/<area>/     screens grouped by product area (auth, home, search, listing,
                       sell, checkout, orders, disputes, wallet, verification, …)
  constants/ utils/    labels/tones, money/date formatting, validators, URL safety
  theme/               design tokens (light + dark), Ionic variables, globals
```

Every screen lives under `features/`, is lazy-loaded by the router, and names the
design frame it implements in its header comment (see `mobile-screen-api-mapping.md`).

## HTTP layer (`src/api/client.ts`)

- **Base URL** — `appConfig.apiBaseUrl` = `${VITE_API_BASE_URL}/api/${VITE_API_VERSION}`,
  or `/api/v1` through the Vite proxy in browser development. No other file builds URLs.
- **Case conversion** — request bodies/params are converted camelCase → snake_case and
  responses snake_case → camelCase at this boundary only (`api/case.ts`). Feature code
  never sees snake_case.
- **Envelopes** — `{ success, message, data }` is unwrapped; `api.list()` returns
  `{ data, meta, links }` for paginated endpoints; `api.postEnvelope()` keeps `message`
  for screens that show the backend's wording.
- **Errors** — every failure becomes an `ApiError` (`api/errors.ts`) with `status`,
  `code`, camelCased `fieldErrors` (422), `retryAfter` (429) and a user-safe message.
  5xx bodies are never shown.
- **Headers** — `Authorization: Bearer`, `Accept-Language`, `X-Request-Id` per request,
  `Idempotency-Key` on financial mutations (`idempotencyHeaders()`).
- **Retries** — only idempotent GETs, max 2, on network errors / 502 / 503 / 504.
  POST/PATCH/DELETE are never retried automatically. Payment, order, offer, swap and
  withdrawal calls carry an idempotency key that the screen keeps for the lifetime of
  one attempt, so a user-initiated retry is safe.
- **Offline** — mutations fail fast with `OFFLINE` instead of queueing; GETs surface an
  error state with retry.
- **Events** (`httpEvents`) — `unauthenticated` (401, latched so it fires once),
  `session-expired`, `maintenance` (503 with maintenance code), `kyc-required` (403 KYC
  code). `main.ts` subscribes and routes accordingly.

## Authentication & session

- Mobile uses Sanctum **bearer tokens** (`/auth/login`, `/auth/register`,
  `/auth/two-factor` return `access_token` + `expires_in`).
- The token is held in memory and persisted with expiry in the platform keystore via
  `services/secureStore.ts` (Keychain `afterFirstUnlockThisDeviceOnly` / Android
  Keystore). In a plain browser (dev only) it falls back to `sessionStorage`; it is
  never written to `localStorage` or Preferences.
- `stores/auth.ts` restores the token at launch, calls `/auth/me` for the user and
  effective permissions, and exposes sign-in hooks (`onSignIn`, `beforeLogout`,
  `onSignOut`) used to start/stop badge polling, register/unregister the push device
  and wipe per-user caches.
- The router is installed **after** bootstrap so the first navigation is guarded with
  the restored session.

## Routing & guards

`router/guards.ts` exports a pure `decideNavigation()` (unit-tested) using route meta:
`guestOnly`, `auth`, `verified` (e-mail verified), `permission` (from `/auth/me`).
Guards only shape UX — the API re-authorises every request and its 401/403 responses
win. Unknown paths go to `NotFoundPage`; maintenance responses go to `/maintenance`.

Tabs: Home · Search · Sell (centre action, opens `/sell`) · Inbox · Profile. Android
back button: closes overlays first, then pops the stack, then returns to Home from a
tab root, then exits.

## State

Pinia stores are deliberately thin:

| Store | Holds |
| --- | --- |
| `auth` | token presence, current user, permissions, sign-in/out flows |
| `settings` | theme (system/light/dark), onboarding flag, recent searches (Preferences) |
| `network` | online/offline from `@capacitor/network` |
| `badges` | unread notification/message counts (60 s polling while signed in and foregrounded) |
| `catalogue` | categories cache |

Screen data is loaded per screen with `useAsync` / `usePagedList` and is not cached
globally, so what the user sees reflects the server on every visit (pull-to-refresh
everywhere lists appear).

## Business rules the client relies on (never re-implements)

- **Allowed actions** — buttons for orders, offers, swaps, listings and disputes come
  from each resource's `allowed_actions`; the app never infers them from status.
- **Money** — integer minor units with ISO currency; formatted by `utils/money.ts`.
  Checkout totals come only from `POST /checkout/quote`; listing currency is
  authoritative; no client-side currency conversion.
- **Payments** — `POST /orders` → `POST /payments/initialize` → hosted checkout in the
  in-app browser (host allow-list matches backend `redirect_hosts`) → poll
  `GET /payments/{reference}` until a terminal status. A redirect or browser close
  never marks a payment paid; only the server status does. Details:
  `mobile-native-integrations.md`.
- **Escrow / disputes / KYC** — status, timelines and next steps are rendered from API
  fields; the app does not compute deadlines beyond displaying server timestamps.

## Media

Images are Cloudinary URLs from the API; `utils/media.ts` requests a width-appropriate
variant and `PwImage` shows a skeleton then a placeholder on failure. Uploads go
through `POST /media` (multipart, ≤15 MB, type = listing/avatar/evidence/kyc) and the
returned ids are attached to the owning resource.

## Theming & accessibility

Design tokens in `theme/tokens.css` (navy `#16386e` brand, Space Grotesk headings,
Inter body) with a dark palette matching D1/D2 using Ionic's `ion-palette-dark` class.
Components use semantic elements, labelled controls, `role="alert"` for errors,
visible focus, ≥44 px targets and respect Dynamic Type / font scaling.

## Observability

`services/logger.ts` (levels, no PII) and `services/analytics.ts` (screen views and
coarse events only). Analytics and logs never include tokens, payment references,
card/KYC data, passwords or OTPs.
