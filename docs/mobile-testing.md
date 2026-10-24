# Testing

Three layers: fast unit/component tests, browser E2E journeys against a real backend,
and a manual device checklist for what only a phone can prove.

## Unit & component (Vitest)

```bash
npm test            # once
npm run test:watch  # watch mode
```

jsdom environment, config in `vitest.config.ts` (fixed test env values, no network).
Current suite: 11 files, 72 tests.

| Spec | Covers |
| --- | --- |
| `case.spec.ts` | snake ⇄ camel conversion of keys (never values), Laravel dot-path error keys |
| `client.spec.ts` | versioned base URL + correlation header, bearer token + snake_case body, offline guard on mutations, GET-only retry, no retry on payments/mutations, single event for a burst of 401s |
| `errors.spec.ts` | `ApiError` mapping: 422 field errors, 429 retry-after, hidden 5xx, codes |
| `guards.spec.ts` | `decideNavigation`: guest-only, auth, verified, permission, onboarding |
| `routeMapping.spec.ts` | web paths, push links and `pilotwardrobe://` → app routes, payment callback |
| `security.spec.ts` | safe redirects (open-redirect payloads), https-only gateway host allow-list, HTML sanitising, initials |
| `money.spec.ts` | minor-unit formatting per currency |
| `validators.spec.ts` | password rules (A1b), e-mail, phone, OTP |
| `searchQuery.spec.ts` | filter state ⇄ URL query ⇄ API params |
| `useForm.spec.ts` | validation, 422 mapping onto fields, double-submit lock |
| `components.spec.ts` | `AmountInput` (minor units, input cleaning, accessible errors), `StatusBadge` (text not colour alone), `ChipGroup`, `RadioCard` semantics |

Add a spec next to the closest existing one; keep business-rule logic in pure
functions (guards, mapping, query building) so it can be tested without a device.

## End-to-end (Playwright)

```bash
npm run test:e2e
E2E_SCREENSHOTS=test-results/shots npm run test:e2e   # also save screens for design review
```

- Starts (or reuses) `npm run dev` on :8100, which proxies to the local API.
- Pixel 7 viewport, installed Chrome (`channel: 'chrome'`).
- Account: `E2E_EMAIL` / `E2E_PASSWORD` (default seeded `pilot@example.com` /
  `Password1`).
- Read-only journeys (always run): onboarding → home as guest; search + filters;
  listing detail; guest gate to sign-in; login → profile, notifications, inbox,
  hangar, wallet, settings; wrong password shows the backend message.
- Mutating journey (`E2E_ALLOW_MUTATIONS=1`): buy now → checkout quote → sandbox
  payment → server-confirmed order (C5). It creates a real order, so run it only
  against a disposable database.

## Manual device checklist

Run on at least one iOS and one Android device (not only emulators) before release.

**Session & storage**
- [ ] Log in, kill the app, reopen → still signed in (token from Keychain/Keystore)
- [ ] Log out → reopening shows signed-out state; push device removed
- [ ] Revoke the session from another device → next request lands on login with "session expired"

**Camera & media**
- [ ] Sell: take photo, pick from library, deny permission → explanation + settings link
- [ ] Dispute evidence and KYC document/selfie upload complete on cellular

**Payments**
- [ ] Hosted checkout opens in the in-app browser; closing it without paying → status "not completed", order unpaid
- [ ] Completing payment → C5 only after the server status turns paid
- [ ] Kill the app during payment, reopen → payment status resumes polling
- [ ] Airplane mode on "Pay now" → offline message, no duplicate order on retry

**Links & push**
- [ ] `adb shell am start -a android.intent.action.VIEW -d "pilotwardrobe://listing/<slug>"` opens the listing
- [ ] `xcrun simctl openurl booted "pilotwardrobe://hangar/orders/<id>"` opens the order
- [ ] Password-reset e-mail link opens A8 in the app (app links verified)
- [ ] Push in foreground shows a toast; tap from background opens the right screen and marks it read

**Platform**
- [ ] Android back button: closes sheets, pops screens, tab root → Home, Home → exit
- [ ] Keyboard never hides the focused field (sign-up, checkout address, chat)
- [ ] Dark mode (system and manual) matches D1/D2; status bar readable in both
- [ ] Largest system font size: no clipped buttons on auth, checkout, wallet
- [ ] VoiceOver / TalkBack: tab bar, listing cards, checkout steps and OTP fields are announced
- [ ] Offline banner appears/disappears; lists show retry instead of blank screens
