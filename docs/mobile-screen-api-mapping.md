# Screen ↔ design ↔ API mapping

Every design frame in `docs/mobile-designs` and the screen that implements it. Paths
are relative to `/api/v1`. "Deviation" points to `mobile-implementation-assumptions.md`
where a frame shows something the backend does not support.

## Onboarding & authentication

| Design | Route | Screen | API |
| --- | --- | --- | --- |
| A0 splash | native launch | Capacitor splash (`assets/splash*.png`) hidden after bootstrap | `GET /auth/me` (restore session) |
| A0a–A0c onboarding | `/onboarding` | `auth/OnboardingPage` | — (flag in Preferences) |
| A1 welcome / email-first | `/auth` | `auth/WelcomePage` | `POST /auth/email-lookup` |
| A1b sign up | `/auth/signup` | `auth/SignupPage` | `POST /auth/register` (returns token) |
| A2a e-mail OTP (iOS) · X1 (Android) | `/auth/verify` | `auth/VerifyEmailPage` | `POST /auth/email/verify`, `POST /auth/email/resend` |
| A2b account ready | `/auth/ready` | `auth/AccountReadyPage` | — |
| A3 log in (+ D1 dark) | `/auth/login` | `auth/LoginPage` | `POST /auth/login` |
| 2FA challenge (no frame) | `/auth/2fa` | `auth/TwoFactorPage` | `POST /auth/two-factor`, `POST /auth/two-factor/sms` |
| A7 forgot password | `/auth/forgot` | `auth/ForgotPasswordPage` | `POST /auth/password/forgot` |
| A8 reset password | `/auth/reset?token=` | `auth/ResetPasswordPage` | `GET /auth/password/reset/{token}`, `POST /auth/password/reset` |

## Discovery

| Design | Route | Screen | API |
| --- | --- | --- | --- |
| B1 home (+ D2 dark) | `/tabs/home` | `home/HomePage` | `GET /home`, `GET /categories` |
| B3 search | `/tabs/search` | `search/SearchPage` | `GET /categories`; recent searches local (deviation: no trending) |
| B4 results | `/tabs/search/results` | `search/SearchResultsPage` | `GET /listings` (filters, sort, pagination), `POST /listings/{id}/favorite` |
| B5 filters | sheet on B4 | `search/FiltersSheet` | `GET /categories/{slug}` (filterable attributes) (deviation: no radius) |
| B10 listing detail | `/listing/:slug` | `listing/ListingDetailPage` | `GET /listings/{slug}`, `GET /listings/{slug}/related`, favourite, `POST /sellers/{u}/follow` |
| F3 choose your fit | sheet on B10 | `listing/ChooseFitSheet` | from listing variants + `GET /me/fit-kit` |
| F4 size chart | `/listing/:slug/size-chart` | `listing/SizeChartPage` | listing `sizeChart` |
| B12 seller profile · W5 photographer storefront | `/seller/:username` | `seller/SellerProfilePage` | `GET /sellers/{u}`, `GET /sellers/{u}/listings`, follow |
| W2 seller reviews | `/seller/:username/reviews`, `/reviews` (mine) | `seller/SellerReviewsPage` | `GET /sellers/{u}/reviews`, `GET /me/reviews` |
| — favourites | `/favorites` | `profile/FavoritesPage` | `GET /me/favorites` |

## Trading & messaging

| Design | Route | Screen | API |
| --- | --- | --- | --- |
| T1 make offer | sheet on B10 | `listing/MakeOfferSheet` | `POST /listings/{id}/offers` (Idempotency-Key) |
| T2 propose swap | `/swap/:slug` | `trade/ProposeSwapPage` | `GET /me/listings?status=active`, `POST /listings/{id}/swap-requests` (Idempotency-Key) |
| T3 offers | `/tabs/inbox/offers` | `trade/OffersPage` | `GET /me/offers`, `GET /me/swap-requests`, `POST /offers/{id}/{accept,decline,counter,cancel}`, `POST /swap-requests/{id}/{accept,reject,cancel}` |
| M1 inbox | `/tabs/inbox` | `inbox/InboxPage` | `GET /conversations` |
| M2 conversation | `/conversations/:id` | `inbox/ConversationPage`, `OfferBubble` | `GET /conversations/{id}`, `GET …/messages`, `POST …/messages`, `POST …/read`, `POST …/report`; offer/swap actions as T3 |
| M3 notifications | `/notifications` | `notifications/NotificationsPage` | `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all`, `GET /notifications/unread-count` |

## Selling

| Design | Route | Screen | API |
| --- | --- | --- | --- |
| S1 photos | `/sell` step 1 | `sell/SellWizardPage` + `useListingDraft` | `POST /media` (type listing), `DELETE /media/{id}` (deviation: no video) |
| S2 describe | step 2 | 〃 | `GET /categories`, `GET /categories/{slug}` |
| S3 condition | step 3 | 〃 | condition enum from backend (deviation: no box/warranty toggles) |
| S4 price | step 4 | 〃 | `POST /listings/price-check`, `POST /listings/fee-quote` |
| S5 freight | step 5 | 〃 | shipping fields on the draft |
| S6 review | step 6 | 〃 | `POST /listings` / `PATCH /listings/{id}` (draft), `POST /listings/{id}/publish` |
| S7 listing live / in review | `/sell/:id/live` | `sell/ListingLivePage` | `GET /me/listings/{id}` |
| S8 my hangar | `/tabs/profile/hangar` | `sell/MyHangarPage` | `GET /me/hangar`, `GET /me/listings?status=`, `POST /listings/{id}/{pause,resume,archive,mark-sold,mark-unavailable,relist,resubmit}`, `DELETE /listings/{id}` |
| S9 promote | sheet on S8 / S7 | `sell/PromoteSheet` | `GET /boost-packages`, `POST /listings/{id}/promote` → payment flow with `promotion_id` (deviation: no wallet balance) |
| — edit listing | `/sell/:id` | `sell/SellWizardPage` | `GET /me/listings/{id}`, `PATCH /listings/{id}` |

## Checkout, payment & orders

| Design | Route | Screen | API |
| --- | --- | --- | --- |
| C1 destination | `/checkout` step 1 | `checkout/CheckoutPage` | `GET /me/addresses`, `POST /me/addresses` (`settings/AddressFormPage`) |
| C2 flight plan (shipping) | step 2 | 〃 | `POST /checkout/quote` |
| C3 payment | step 3 | 〃 + `GatewayPicker` | `GET /payment-methods` (deviation: gateways, not saved cards) |
| C4 review | step 4 | 〃 | `POST /checkout/quote` (final), `POST /orders` (Idempotency-Key), `POST /payments/initialize` (Idempotency-Key) |
| — payment status | `/payment/:reference` | `checkout/PaymentStatusPage` + `usePaymentFlow` | `GET /payments/{reference}` (polling); non-prod `POST /sandbox/payments/{ref}/{approve,decline,cancel}` |
| C5 order confirmed | `/orders/:id/confirmed` | `checkout/OrderConfirmedPage` | `GET /orders/{id}` |
| — orders list | `/orders` | `orders/OrdersPage` | `GET /me/orders?role=buying|selling` |
| T4 order / escrow detail | `/orders/:id` | `orders/OrderDetailPage` | `GET /orders/{id}`, `POST /orders/{id}/{dispatch,cancel}` per `allowed_actions` |
| T5 goods landed | `/orders/:id/landed` | `orders/GoodsLandedPage` | `POST /orders/{id}/confirm-delivery` |
| T6 deal complete / review | `/orders/:id/review` | `orders/DealCompletePage` | `POST /orders/{id}/reviews` |

## Disputes & wallet

| Design | Route | Screen | API |
| --- | --- | --- | --- |
| — disputes list | `/disputes` | `disputes/DisputesPage` | `GET /me/disputes` |
| W3 open dispute | `/disputes/new?order=` | `disputes/OpenDisputePage` + `EvidencePicker` | `POST /media` (evidence), `POST /disputes` |
| W4 dispute case | `/disputes/:id` | `disputes/DisputeCasePage` | `GET /disputes/{id}`, `POST …/messages`, `POST …/proposal/{accept,decline}`, `POST …/withdraw` |
| W1 wallet | `/wallet` | `wallet/WalletPage` + `WithdrawSheet` | `GET /me/wallet`, `GET /me/wallet/transactions`, `GET /me/payout-methods`, `POST /me/withdrawals/quote`, `POST /me/withdrawals` (Idempotency-Key), `POST /me/wallet/statements` (deviation: no add funds) |

## Identity verification (KYC)

| Design | Route | Screen | API |
| --- | --- | --- | --- |
| K1 intro | `/verification` | `verification/KycIntroPage` | `GET /me/kyc` (resume point) |
| — personal details | `/verification/personal` | `verification/KycPersonalPage` | `POST /me/kyc/personal` |
| K2 document type | `/verification/document` | `verification/KycDocumentPage` | document types from `GET /me/kyc` |
| K3 capture | `/verification/capture` | `verification/KycCapturePage` | `POST /media` (type kyc), `POST /me/kyc/document`, `POST /me/kyc/submit` (deviation: system camera) |
| K5 pending · K6 approved · K7 rejected | `/verification/status` | `verification/KycStatusPage` | `GET /me/kyc` |
| K7 "contact support" | `/support/contact` | `support/ContactPage` | `POST /contact` |

## Profile & settings

| Design | Route | Screen | API |
| --- | --- | --- | --- |
| — profile tab | `/tabs/profile` | `profile/ProfilePage` | `GET /auth/me`, `GET /me/hangar` |
| M4 settings | `/settings` | `settings/SettingsPage` | `GET/PUT /me/notification-preferences`, `POST /auth/logout`, `POST /me/deactivate`, `DELETE /me` |
| M4 edit profile | `/settings/profile` | `settings/EditProfilePage` | `PATCH /me`, `POST /media` (avatar) |
| — security | `/settings/security` | `settings/SecurityPage` | `GET /me/security`, `PUT /me/password`, `DELETE /me/sessions/{id}`, `POST /me/sessions/logout-others` |
| M5 currency | sheet on M4 | `settings/CurrencySheet` | `PATCH /me { currency }` (deviation: no exchange rates) |
| — addresses | `/settings/addresses(/:id)` | `settings/AddressesPage`, `AddressFormPage` | `GET/POST/PATCH/DELETE /me/addresses` |
| F1 fit kit | `/settings/fit-kit` | `settings/FitKitPage` | `GET /me/fit-kit`, `PATCH`, `DELETE` |
| F2 fit profile | `/settings/fit-kit/:id` | `settings/FitProfilePage` | `POST /me/fit-kit`, `PATCH /me/fit-kit/{id}` |
| — content pages | `/pages/:slug` | `support/ContentPage` | `GET /pages/{slug}` |
| — push devices | (background) | `services/push.ts` | `POST /me/devices`, `DELETE /me/devices/{id}` |

## System

| Route | Screen | Trigger |
| --- | --- | --- |
| `/maintenance` | `system/MaintenancePage` | 503 maintenance response |
| `/:pathMatch(.*)*` | `system/NotFoundPage` | unknown route / dead deep link |
| — | `components/OfflineBanner` | `@capacitor/network` offline |
