import type { RouteRecordRaw } from 'vue-router'
import TabsPage from '@/features/shell/TabsPage.vue'

/**
 * Route map. Design ids in comments trace each screen to docs/mobile-designs
 * (full mapping: docs/mobile-screen-api-mapping.md).
 *
 * meta.guestOnly   — signed-in users are sent home (auth screens)
 * meta.auth        — needs a session (token held)
 * meta.verified    — needs a verified e-mail (transactional flows)
 * meta.permission  — needs an effective permission from /auth/me
 * Everything else is public. Guards shape UX only; the API re-checks everything.
 */
export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/tabs/home' },

  // ── Onboarding & authentication (A0–A8, X1, D1) ─────────────────────
  { path: '/onboarding', component: () => import('@/features/auth/OnboardingPage.vue'), meta: { guestOnly: true } },
  { path: '/auth', component: () => import('@/features/auth/WelcomePage.vue'), meta: { guestOnly: true } },
  { path: '/auth/signup', component: () => import('@/features/auth/SignupPage.vue'), meta: { guestOnly: true } },
  { path: '/auth/login', component: () => import('@/features/auth/LoginPage.vue'), meta: { guestOnly: true } },
  { path: '/auth/2fa', component: () => import('@/features/auth/TwoFactorPage.vue'), meta: { guestOnly: true } },
  { path: '/auth/forgot', component: () => import('@/features/auth/ForgotPasswordPage.vue') },
  { path: '/auth/reset', component: () => import('@/features/auth/ResetPasswordPage.vue') },
  { path: '/auth/verify', component: () => import('@/features/auth/VerifyEmailPage.vue') },
  { path: '/auth/ready', component: () => import('@/features/auth/AccountReadyPage.vue'), meta: { auth: true } },

  // ── Tabs: Home · Search · (Sell) · Inbox · Profile ──────────────────
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      { path: '', redirect: '/tabs/home' },
      { path: 'home', component: () => import('@/features/home/HomePage.vue') },
      { path: 'search', component: () => import('@/features/search/SearchPage.vue') },
      { path: 'search/results', component: () => import('@/features/search/SearchResultsPage.vue') },
      { path: 'inbox', component: () => import('@/features/inbox/InboxPage.vue'), meta: { auth: true } },
      { path: 'inbox/offers', component: () => import('@/features/trade/OffersPage.vue'), meta: { auth: true } },
      { path: 'profile', component: () => import('@/features/profile/ProfilePage.vue') },
      { path: 'profile/hangar', component: () => import('@/features/sell/MyHangarPage.vue'), meta: { auth: true } },
    ],
  },

  // ── Catalogue (B10, B12, F4, W2, W5) ─────────────────────────────────
  { path: '/listing/:slug', component: () => import('@/features/listing/ListingDetailPage.vue') },
  { path: '/listing/:slug/size-chart', component: () => import('@/features/listing/SizeChartPage.vue') },
  { path: '/seller/:username', component: () => import('@/features/seller/SellerProfilePage.vue') },
  { path: '/seller/:username/reviews', component: () => import('@/features/seller/SellerReviewsPage.vue') },
  { path: '/reviews', component: () => import('@/features/seller/SellerReviewsPage.vue'), meta: { auth: true, mine: true } },
  { path: '/favorites', component: () => import('@/features/profile/FavoritesPage.vue'), meta: { auth: true } },

  // ── Trading (T2, M2, M3) ─────────────────────────────────────────────
  {
    path: '/swap/:slug',
    component: () => import('@/features/trade/ProposeSwapPage.vue'),
    meta: { auth: true, verified: true, permission: 'swaps.create' },
  },
  { path: '/conversations/:id', component: () => import('@/features/inbox/ConversationPage.vue'), meta: { auth: true } },
  { path: '/notifications', component: () => import('@/features/notifications/NotificationsPage.vue'), meta: { auth: true } },

  // ── Selling (S1–S7) ──────────────────────────────────────────────────
  {
    path: '/sell',
    component: () => import('@/features/sell/SellWizardPage.vue'),
    meta: { auth: true, verified: true, permission: 'listings.create' },
  },
  {
    path: '/sell/:id',
    component: () => import('@/features/sell/SellWizardPage.vue'),
    meta: { auth: true, verified: true, permission: 'listings.update' },
  },
  { path: '/sell/:id/live', component: () => import('@/features/sell/ListingLivePage.vue'), meta: { auth: true } },

  // ── Checkout & payment (C1–C5) ───────────────────────────────────────
  {
    path: '/checkout',
    component: () => import('@/features/checkout/CheckoutPage.vue'),
    meta: { auth: true, verified: true, permission: 'orders.create' },
  },
  { path: '/payment/:reference', component: () => import('@/features/checkout/PaymentStatusPage.vue'), meta: { auth: true } },

  // ── Orders (T4–T6) ───────────────────────────────────────────────────
  { path: '/orders', component: () => import('@/features/orders/OrdersPage.vue'), meta: { auth: true } },
  { path: '/orders/:id', component: () => import('@/features/orders/OrderDetailPage.vue'), meta: { auth: true } },
  { path: '/orders/:id/confirmed', component: () => import('@/features/checkout/OrderConfirmedPage.vue'), meta: { auth: true } },
  { path: '/orders/:id/landed', component: () => import('@/features/orders/GoodsLandedPage.vue'), meta: { auth: true } },
  { path: '/orders/:id/review', component: () => import('@/features/orders/DealCompletePage.vue'), meta: { auth: true } },

  // ── Disputes (W3, W4) ────────────────────────────────────────────────
  { path: '/disputes', component: () => import('@/features/disputes/DisputesPage.vue'), meta: { auth: true } },
  {
    path: '/disputes/new',
    component: () => import('@/features/disputes/OpenDisputePage.vue'),
    meta: { auth: true, verified: true, permission: 'disputes.create' },
  },
  { path: '/disputes/:id', component: () => import('@/features/disputes/DisputeCasePage.vue'), meta: { auth: true } },

  // ── Wallet (W1) ──────────────────────────────────────────────────────
  { path: '/wallet', component: () => import('@/features/wallet/WalletPage.vue'), meta: { auth: true } },

  // ── Identity verification (K1–K7) ────────────────────────────────────
  { path: '/verification', component: () => import('@/features/verification/KycIntroPage.vue'), meta: { auth: true, verified: true } },
  {
    path: '/verification/personal',
    component: () => import('@/features/verification/KycPersonalPage.vue'),
    meta: { auth: true, verified: true },
  },
  {
    path: '/verification/document',
    component: () => import('@/features/verification/KycDocumentPage.vue'),
    meta: { auth: true, verified: true },
  },
  {
    path: '/verification/capture',
    component: () => import('@/features/verification/KycCapturePage.vue'),
    meta: { auth: true, verified: true },
  },
  { path: '/verification/status', component: () => import('@/features/verification/KycStatusPage.vue'), meta: { auth: true } },

  // ── Settings (M4, M5, F1, F2) ────────────────────────────────────────
  { path: '/settings', component: () => import('@/features/settings/SettingsPage.vue'), meta: { auth: true } },
  { path: '/settings/profile', component: () => import('@/features/settings/EditProfilePage.vue'), meta: { auth: true } },
  { path: '/settings/security', component: () => import('@/features/settings/SecurityPage.vue'), meta: { auth: true } },
  { path: '/settings/addresses', component: () => import('@/features/settings/AddressesPage.vue'), meta: { auth: true } },
  { path: '/settings/addresses/:id', component: () => import('@/features/settings/AddressFormPage.vue'), meta: { auth: true } },
  { path: '/settings/fit-kit', component: () => import('@/features/settings/FitKitPage.vue'), meta: { auth: true } },
  { path: '/settings/fit-kit/:id', component: () => import('@/features/settings/FitProfilePage.vue'), meta: { auth: true } },

  // ── Support & content ────────────────────────────────────────────────
  { path: '/support/contact', component: () => import('@/features/support/ContactPage.vue') },
  { path: '/pages/:slug', component: () => import('@/features/support/ContentPage.vue') },

  // ── System ───────────────────────────────────────────────────────────
  { path: '/maintenance', component: () => import('@/features/system/MaintenancePage.vue') },
  { path: '/:pathMatch(.*)*', component: () => import('@/features/system/NotFoundPage.vue') },
]
