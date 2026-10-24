import type { CountryCode, CurrencyCode, Id, IsoDateTime, Money, PageQuery } from './api'
import type { MediaAsset } from './media'
import type { PublicSeller } from './user'

export type ProductCondition = 'new' | 'like_new' | 'very_good' | 'good' | 'fair'
export type ProductFormat = 'physical' | 'digital' | 'print'
export type DealType = 'buy_now' | 'offers' | 'swaps'

/** Listing lifecycle — handoff §8.1. The backend enforces every transition. */
export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'reserved'
  | 'sold'
  | 'swapped'
  | 'archived'
  | 'needs_changes'
  | 'rejected'
  | 'removed'

/** Owner-side actions; rendered verbatim from `allowedActions`. */
export type ListingAction =
  | 'edit'
  | 'preview'
  | 'promote'
  | 'pause'
  | 'resume'
  | 'archive'
  | 'delete'
  | 'mark_sold'
  | 'mark_unavailable'
  | 'relist'
  | 'resubmit'
  | 'finish'
  | (string & {})

export interface CategoryRef {
  id: Id
  slug: string
  name: string
}

export interface Category extends CategoryRef {
  parentId?: Id | null
  listingsCount: number
  image?: MediaAsset | null
  children?: Category[]
  sized?: boolean
}

export interface ListingLocation {
  countryCode: CountryCode
  state?: string | null
  city?: string | null
  airportCode?: string | null
}

export interface ShippingOption {
  id: Id
  method: string
  label: string
  description: string
  price: Money
  estimatedDays?: { min: number; max: number } | null
}

export interface SizeChartRow {
  size: string
  measurements: Record<string, string>
}

export interface SizeInfo {
  available: string[]
  unavailable: string[]
  chart?: { columns: string[]; rows: SizeChartRow[]; note?: string } | null
  fitMatch?: { size: string; profileName: string; summary: string } | null
}

export interface ListingBadge {
  kind: 'best_seller' | 'fits_you' | 'swap_ok' | 'free_delivery' | 'official_store' | 'promoted' | 'digital' | 'new' | (string & {})
  label: string
}

export interface Listing {
  id: Id
  slug: string
  title: string
  description: string
  category: CategoryRef
  breadcrumbs?: CategoryRef[]
  condition: ProductCondition
  conditionLabel?: string
  format: ProductFormat
  price: Money
  compareAtPrice?: Money | null
  minimumOffer?: Money | null
  seller: PublicSeller
  images: MediaAsset[]
  location?: ListingLocation | null
  shipping?: ShippingOption[]
  freightSummary?: string | null
  negotiable: boolean
  swappable: boolean
  status: ListingStatus
  statusLabel?: string
  promoted: boolean
  badges: ListingBadge[]
  brand?: string | null
  model?: string | null
  attributes?: { label: string; value: string }[]
  aircraftTypes?: string[]
  tags?: string[]
  sizes?: SizeInfo | null
  rating?: number | null
  soldCount?: number
  viewsCount: number
  favoritesCount: number
  offersCount?: number
  isFavorited?: boolean
  allowedActions?: ListingAction[]
  moderation?: { reason?: string | null; note?: string | null } | null
  boost?: { package: string; endsAt: IsoDateTime } | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export type SortOption = 'recommended' | 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating' | 'nearest'

/** `GET /listings` query (handoff §5). Prices are minor units in the listing currency. */
export interface ListingFilters extends PageQuery {
  search?: string
  category?: string[]
  condition?: ProductCondition[]
  dealType?: DealType[]
  minPrice?: number
  maxPrice?: number
  verifiedOnly?: boolean
  minRating?: number
  freeDelivery?: boolean
  format?: ProductFormat
  seller?: string
  aircraftType?: string
  promoted?: boolean
  sort?: SortOption
}

export interface FacetValue {
  value: string
  label: string
  count: number
}

export interface ListingFacets {
  categories?: FacetValue[]
  conditions?: FacetValue[]
  dealTypes?: FacetValue[]
  seller?: FacetValue[]
  priceRange?: { min: number; max: number; currency: CurrencyCode }
}

export interface ListingSearchMeta {
  facets?: ListingFacets
  appliedCurrency?: CurrencyCode
}

export interface HomeSection {
  key: string
  title: string
  subtitle?: string | null
  viewAllTo?: string | null
  listings: Listing[]
}

export interface HeroSlide {
  id: Id
  position: number
  headline: string
  subtext?: string | null
  buttonLabel?: string | null
  link?: string | null
  image?: MediaAsset | null
  eyebrow?: string | null
}

export interface HomeFeed {
  heroSlides: HeroSlide[]
  categories: Category[]
  sections: HomeSection[]
  gallery?: { id: Id; title: string; photographer: string; image: MediaAsset; to: string }[]
  trustedCount?: number
}

export interface BoostPackage {
  id: Id
  code: string
  name: string
  description: string
  placement?: string
  durationDays: number
  price: Money
}

export interface PromotionCheckout {
  promotionId: Id
  status: 'pending_payment' | (string & {})
  package: { id: Id; name: string; durationDays: number }
  amount: Money
  paymentRequired: boolean
}

/** POST /listings/price-check (backend PriceCheck service). */
export interface PriceCheck {
  available: boolean
  range?: { min: Money; max: Money }
  median?: Money
  currency: CurrencyCode
  comparablesCount: number
  basis: 'sales' | 'listings' | (string & {})
  windowDays?: number
  position?: 'below_range' | 'fast_sell' | 'above_range' | null
  summary?: string
  message?: string
}

export interface FeeQuote {
  platformFeeRate: number
  platformFee: Money
  sellerReceives: Money
}

/** Freight settings on a listing draft (SaveListingRequest.freight). */
export interface FreightSettings {
  method?: 'pilotwardrobe_freight' | 'self' | 'handoff' | null
  whoPays?: 'buyer' | 'seller' | null
  parcelSize?: string | null
  weightKg?: number | null
  allowHandoff?: boolean | null
  shipsFrom?: string[] | null
}

/**
 * Write model for POST /listings and PATCH /listings/{id} (SaveListingRequest).
 * Every field is optional while drafting; publish validates the whole listing.
 */
export interface ListingDraftInput {
  title?: string | null
  description?: string | null
  categoryId?: string | null
  brand?: string | null
  model?: string | null
  serialNumber?: string | null
  tags?: string[] | null
  aircraftTypes?: string[] | null
  condition?: ProductCondition | null
  format?: ProductFormat
  price?: { amount: number | null; currency: CurrencyCode | null }
  minimumOffer?: { amount: number | null; currency: CurrencyCode | null }
  currency?: CurrencyCode
  negotiable?: boolean
  swappable?: boolean
  autoDeclineBelowMinimum?: boolean
  mediaIds?: Id[]
  sizes?: { available?: string[] | null; unavailable?: string[] | null }
  location?: Partial<ListingLocation>
  freight?: FreightSettings
}

/** GET /me/listings/{id} — editable draft for the wizard. */
export type EditableListing = Listing & {
  serialNumber?: string | null
  freight?: FreightSettings | null
  [key: string]: unknown
}
