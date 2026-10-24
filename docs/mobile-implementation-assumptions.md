# Implementation assumptions & deviations

The backend (`docs/backend` and the Laravel code) is authoritative. Where a design
frame shows something the API does not provide, the app follows the API and the
gap is listed here so product can decide whether to build it server-side.
Nothing below is faked with mock data.

## Design elements not implemented (no backend support)

| Frame | Shown in design | What the app does | Needed to close the gap |
| --- | --- | --- | --- |
| A1 / A3 | Apple / Google / Facebook sign-in | Buttons hidden | Social callbacks currently redirect to the web SPA; Apple sign-in not implemented. Needs a mobile token-exchange endpoint |
| A0a–c | Community stats on onboarding | Omitted | A public stats endpoint |
| B3 | Trending searches / suggestions | Recent searches (stored locally) + categories | Search-suggestions endpoint |
| B5 | Location radius filter | Omitted | Geo filter on `GET /listings` |
| S1 | Video upload | Photos only | Video media type on `POST /media` |
| S2 | "Improve with AI" description | Omitted | Endpoint |
| S3 | Original box / warranty toggles | Omitted | Listing attributes |
| T2 | Swap category chips | Choose from the user's own active listings | — (backend swaps are listing-for-listing) |
| T1 | Offer validity selector | Fixed by backend (24 h), shown as text | Configurable expiry on offers |
| C3 | Saved cards, Apple Pay / Google Pay, wallet balance | Gateway picker from `GET /payment-methods`; wallets are offered inside the gateway's hosted page | Tokenised cards / wallet payment method |
| S9 | Pay boost with wallet balance | Paid through the same hosted-gateway flow | Wallet payment method |
| W1 | "Add funds" | Omitted; balance, transactions, withdraw, statements only | Top-up endpoint |
| W1 | Add / edit payout methods | Read-only list; managed on the web app | Payout-method CRUD for mobile |
| M5 | Exchange rates next to currencies | Currency list only; prices stay in listing currency | Rates endpoint |
| M4 | Search radius, blocked users, payment methods rows | Omitted | Corresponding endpoints |
| M4 | Two-factor setup | Status shown; setup links to the web app | 2FA enrolment endpoints for bearer clients |
| K3 | Live document overlay / auto-capture | System camera, then preview + retake | Custom camera plugin (native work) |
| K1–K3 | Personal-details step | Added before K2 because `POST /me/kyc/personal` is required first | — |

## Behaviour assumptions

- **Base URL** — the API lives at `/api/v1` on the host in `VITE_API_BASE_URL`
  (confirmed against the dev backend).
- **Auth mode** — mobile uses Sanctum bearer tokens, never cookies. WebView origins
  must be in `CORS_ALLOWED_ORIGINS` and must **not** be Sanctum stateful domains.
- **WebView hostname** — `app.pilotwardrobe.local` (custom so it is never a stateful
  domain). Changing it requires updating backend CORS.
- **Payment return** — `return_url` is the web app's `/payment/callback`, because the
  backend only accepts return URLs on `APP_FRONTEND_URL`. The app does not depend on
  that redirect: it polls the payment status. A custom-scheme return URL would need a
  backend allow-list change.
- **Gateway allow-list** — mirrors backend `redirect_hosts`; update both together.
- **Sandbox gateway** — offered in non-production builds only.
- **Allowed actions** — screens show actions only when `allowed_actions` contains them;
  if the backend omits the field, no action is shown (fail closed).
- **Currency** — prices are displayed in the listing currency; the M5 preference is
  saved to the profile and used where the API applies it. No client conversion.
- **Pagination** — offers, swaps, disputes, conversations, messages (oldest first),
  notifications, orders, favourites and reviews are paginated and loaded with
  infinite scroll.
- **Push** — notification `data.link` is a web SPA path, mapped to an app route;
  unknown links open Notifications.
- **Deep-link host** — Android app links are declared for `pilotwardrobe.com` only;
  staging needs its host added (see native integrations).
- **App identifiers** — `com.pilotwardrobe.app`, scheme `pilotwardrobe`: assumed, confirm
  before the first store upload.
- **Fonts / colours** — Space Grotesk + Inter and navy `#16386e`, identical to the
  web app; dark palette follows D1/D2.

## Known backend / data issues found during integration

- Seeded listing images point to Cloudinary URLs that return 404; the app shows its
  placeholder. Re-seeding with real media fixes it.
- Local `CORS_ALLOWED_ORIGINS` is empty (defaults to `http://localhost:5173`), so
  native builds against the local API fail until the origins in `mobile-setup.md`
  are added.
- With the default Capacitor origin (`https://localhost`) login returns 419 because
  `localhost` is a Sanctum stateful domain — resolved on the app side by the custom
  hostname.

## Not yet done

- Firebase projects / config files for push (code is ready, disabled by flag).
- `assetlinks.json` and `apple-app-site-association` on the web host.
- iOS build and device run (requires macOS/Xcode; project generated and synced).
- Android release signing config and store listings.
- Separate staging/production native flavours.
