import type { CountryCode, CurrencyCode, Id, IsoDateTime, Money } from './api'
import type { MediaAsset } from './media'
import type { Permission, UserRole } from './permissions'

export type AccountStatus = 'active' | 'restricted' | 'suspended' | 'deactivated' | 'pending_verification'
export type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired'

export interface VerificationState {
  email: boolean
  identity: boolean
  aviator: boolean
  kycStatus: KycStatus
}

export interface UserCounters {
  unreadMessages: number
  unreadNotifications: number
  cartItems: number
  openOffers: number
  activeOrders: number
  activeListings: number
  openDisputes: number
}

/** Session principal from GET /auth/me — the app's single source of truth for identity. */
export interface AuthUser {
  id: Id
  firstName: string
  lastName: string
  displayName: string
  username: string
  email: string
  phone?: string | null
  role: UserRole
  permissions: Permission[]
  /** Bumped by the backend whenever effective permissions change (backend D13). */
  permissionsVersion?: number
  staffRole?: string | null
  avatar?: MediaAsset | { url: string } | null
  verification: VerificationState
  status: AccountStatus
  countryCode: CountryCode | null
  currency: CurrencyCode
  locale: string
  bio?: string | null
  twoFactorEnabled: boolean
  memberSince: IsoDateTime | null
  counters?: UserCounters
}

/** Seller summary embedded in listings, orders and search results. */
export interface PublicSeller {
  id: Id
  username: string
  displayName: string
  avatar?: MediaAsset | { url: string } | null
  verified: boolean
  isAviator: boolean
  isOfficialStore?: boolean
  isPhotographer?: boolean
  rating: number
  totalReviews: number
  totalSales?: number
  location?: string | null
  dispatchTime?: string | null
}

export interface SellerProfile extends PublicSeller {
  bio?: string | null
  coverImage?: MediaAsset | null
  jobTitle?: string | null
  aircraftType?: string | null
  memberSince: IsoDateTime
  responseTime?: string | null
  responseRate?: number | null
  followers: number
  isFollowing?: boolean
  stats: {
    trades: number
    onTimeDispatchRate: number
    listingsCount: number
    soldCount: number
    reviewsCount: number
  }
  ratingBreakdown: Partial<Record<'1' | '2' | '3' | '4' | '5', number>>
  photographer?: {
    tagline?: string
    printsSold?: number
    collectionsCount?: number
    licensing: { tier: string; label: string; description: string; price?: Money | null }[]
  } | null
}

export interface Address {
  id: Id
  label?: string | null
  fullName: string
  phone: string
  line1: string
  line2?: string | null
  city: string
  state?: string | null
  postalCode?: string | null
  countryCode: CountryCode
  isDefault: boolean
}

export type AddressInput = Omit<Address, 'id'>

export interface Session {
  id: Id
  device: string
  location: string
  lastActiveAt: IsoDateTime
  current: boolean
}

export interface SignInMethod {
  provider: 'password' | 'google' | 'apple' | 'facebook'
  connected: boolean
  detail?: string | null
}

export interface SecurityOverview {
  methods: SignInMethod[]
  twoFactor: { authenticatorEnabled: boolean; smsBackupMasked?: string | null; backupCodesRemaining: number }
  sessions: Session[]
  passwordChangedAt?: IsoDateTime | null
}

/** Categories accepted by PUT /me/notification-preferences (NotificationPreferencesRequest). */
export type PreferenceCategory =
  | 'orders'
  | 'offers_swaps'
  | 'messages'
  | 'account'
  | 'disputes'
  | 'payouts'
  | 'reviews'
  | 'marketing'
  | (string & {})

export interface NotificationPreference {
  category: PreferenceCategory
  label: string
  email: boolean
  push: boolean
  sms?: boolean | null
  whatsapp?: boolean | null
  /** Transactional e-mail the backend will not let users disable (orders, payouts). */
  emailLocked?: boolean
}

export type FitKitUnit = 'us_in' | 'metric'
export type BagSize = 'compact' | 'standard' | 'crew'

export interface FitKitProfile {
  id: Id
  name: string
  forPerson?: string | null
  initials: string
  isDefault: boolean
  unit: FitKitUnit
  jacket?: string | null
  collar?: string | null
  sleeve?: string | null
  waist?: string | null
  inseam?: string | null
  shoe?: string | null
  bag?: BagSize | string | null
  apparel?: string | null
  preferences: {
    filterSearchBySize: boolean
    warnOutsideMeasurements: boolean
    useAtCheckout: boolean
  }
  updatedAt: IsoDateTime
  ordersUsedOn: number
}

export type FitKitInput = Partial<Omit<FitKitProfile, 'id' | 'initials' | 'updatedAt' | 'ordersUsedOn'>> & {
  name: string
}

export interface UserReview {
  id: Id
  rating: number
  comment: string | null
  tags: string[]
  author: { displayName: string; initials: string; username?: string }
  createdAt: IsoDateTime
  orderId?: Id
  role: 'buyer' | 'seller'
  listingTitle?: string | null
  amount?: Money | null
  response?: { body: string; createdAt?: IsoDateTime } | null
}

export interface ProfileUpdate {
  firstName?: string
  lastName?: string
  username?: string
  phone?: string | null
  countryCode?: CountryCode | null
  currency?: CurrencyCode
  locale?: string
  bio?: string | null
  avatarMediaId?: Id | null
  jobTitle?: string | null
  aircraftType?: string | null
  city?: string | null
  state?: string | null
}
