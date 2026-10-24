import type {
  DisputeReason,
  DisputeResolutionRequest,
  DisputeStatus,
  EscrowStatus,
  KycStatus,
  ListingStatus,
  OfferStatus,
  OrderStatus,
  PaymentStatus,
  ProductCondition,
  SortOption,
  SwapStatus,
  TransactionStatus,
} from '@/types'

/**
 * Display labels shared with the web app (src/constants/labels.ts there) so both
 * clients use the same business terminology. Tones map to <StatusBadge> variants.
 * Unknown enum values fall back to Title Case via `labelFor`.
 */
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold' | 'navy'

export interface StatusLabel {
  label: string
  tone: Tone
}

/** Condition chips and their S3 descriptions. */
export const CONDITION_LABELS: Record<ProductCondition, { label: string; hint: string; tone: Tone }> = {
  new: { label: 'New', hint: 'Unused, with tags or original packaging', tone: 'success' },
  like_new: { label: 'Like new', hint: 'Lightly used, no visible wear, fully functional', tone: 'navy' },
  very_good: { label: 'Very good', hint: 'Minimal signs of use, works perfectly', tone: 'info' },
  good: { label: 'Good', hint: 'Normal wear, works perfectly, shown in photos', tone: 'gold' },
  fair: { label: 'Fair', hint: 'Heavy wear or defects — described honestly', tone: 'danger' },
}

export const LISTING_STATUS: Record<ListingStatus, StatusLabel> = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending_review: { label: 'In review', tone: 'info' },
  active: { label: 'Live', tone: 'success' },
  paused: { label: 'Paused', tone: 'neutral' },
  reserved: { label: 'Reserved', tone: 'info' },
  sold: { label: 'Sold', tone: 'danger' },
  swapped: { label: 'Swapped', tone: 'info' },
  archived: { label: 'Archived', tone: 'neutral' },
  needs_changes: { label: 'Needs changes', tone: 'danger' },
  rejected: { label: 'Rejected', tone: 'danger' },
  removed: { label: 'Removed', tone: 'danger' },
}

/** Aviation-flavoured order labels (T4: EN ROUTE, LANDED…). */
export const ORDER_STATUS: Record<OrderStatus, StatusLabel> = {
  pending_payment: { label: 'Awaiting payment', tone: 'warning' },
  paid: { label: 'Paid', tone: 'info' },
  awaiting_dispatch: { label: 'Awaiting wheels-up', tone: 'warning' },
  in_transit: { label: 'En route', tone: 'info' },
  out_for_delivery: { label: 'Final approach', tone: 'info' },
  delivered: { label: 'Landed', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  refunded: { label: 'Refunded', tone: 'neutral' },
  partially_refunded: { label: 'Part refunded', tone: 'neutral' },
  disputed: { label: 'Disputed', tone: 'danger' },
  on_hold: { label: 'On hold', tone: 'danger' },
}

export const ESCROW_STATUS: Record<EscrowStatus, StatusLabel> = {
  not_funded: { label: 'Not funded', tone: 'neutral' },
  held: { label: 'Held in escrow', tone: 'info' },
  frozen: { label: 'Frozen · dispute', tone: 'danger' },
  releasing: { label: 'Releasing', tone: 'warning' },
  released: { label: 'Released', tone: 'success' },
  refunded: { label: 'Refunded', tone: 'neutral' },
  on_hold: { label: 'On hold', tone: 'danger' },
}

export const PAYMENT_STATUS: Record<PaymentStatus, StatusLabel> = {
  pending: { label: 'Awaiting payment', tone: 'warning' },
  processing: { label: 'Processing', tone: 'info' },
  successful: { label: 'Successful', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
  refunded: { label: 'Refunded', tone: 'neutral' },
  partially_refunded: { label: 'Partially refunded', tone: 'neutral' },
}

export const OFFER_STATUS: Record<OfferStatus, StatusLabel> = {
  pending: { label: 'Pending', tone: 'warning' },
  accepted: { label: 'Accepted', tone: 'success' },
  declined: { label: 'Declined', tone: 'danger' },
  countered: { label: 'Countered', tone: 'info' },
  expired: { label: 'Expired', tone: 'neutral' },
  cancelled: { label: 'Withdrawn', tone: 'neutral' },
}

export const SWAP_STATUS: Record<SwapStatus, StatusLabel> = {
  pending: { label: 'Pending', tone: 'warning' },
  accepted: { label: 'Accepted', tone: 'success' },
  rejected: { label: 'Declined', tone: 'danger' },
  countered: { label: 'Countered', tone: 'info' },
  cancelled: { label: 'Withdrawn', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
  completed: { label: 'Completed', tone: 'success' },
  disputed: { label: 'Disputed', tone: 'danger' },
}

export const KYC_STATUS: Record<KycStatus, StatusLabel> = {
  not_started: { label: 'Not verified', tone: 'neutral' },
  pending: { label: 'In review', tone: 'warning' },
  approved: { label: 'Verified', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  escalated: { label: 'In review', tone: 'warning' },
  expired: { label: 'Expired', tone: 'danger' },
}

export const TRANSACTION_STATUS: Record<string, StatusLabel> = {
  pending: { label: 'Pending', tone: 'warning' },
  in_escrow: { label: 'In escrow', tone: 'gold' },
  released: { label: 'Released', tone: 'success' },
  paid: { label: 'Paid', tone: 'success' },
  complete: { label: 'Complete', tone: 'neutral' },
  failed: { label: 'Failed', tone: 'danger' },
  reversed: { label: 'Reversed', tone: 'danger' },
} satisfies Record<Extract<TransactionStatus, string>, StatusLabel>

export const DISPUTE_STATUS: Record<DisputeStatus, StatusLabel> = {
  open: { label: 'Open', tone: 'warning' },
  awaiting_seller: { label: 'Awaiting seller', tone: 'warning' },
  under_review: { label: 'Under review', tone: 'warning' },
  resolved_buyer: { label: 'Resolved', tone: 'success' },
  resolved_seller: { label: 'Resolved', tone: 'success' },
  resolved_split: { label: 'Resolved · split', tone: 'success' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },
  appealed: { label: 'Appealed', tone: 'info' },
}

/** W3 reasons. Backend enum: not_as_described | not_received | damaged | counterfeit. */
export const DISPUTE_REASONS: Record<DisputeReason, { label: string; hint: string }> = {
  not_as_described: { label: 'Item not as described', hint: "Condition, model or specs don't match the listing" },
  damaged: { label: 'Arrived damaged', hint: 'Packaging or item damaged in transit' },
  not_received: { label: 'Wrong or missing item', hint: "The item didn't arrive or isn't what you ordered" },
  counterfeit: { label: 'Not genuine', hint: "Serial or labels don't match" },
}

export const DISPUTE_RESOLUTIONS: Record<DisputeResolutionRequest, string> = {
  full_refund: 'Full refund',
  partial_refund: 'Partial refund',
  return_and_refund: 'Return item',
  replacement: 'Replacement',
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recommended', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Best rated' },
]

/** Review tags as the backend accepts them (display labels, reviews.md). */
export const REVIEW_TAGS = ['As described', 'Fast dispatch', 'Well packed', 'Great communication'] as const

export const CURRENCIES = ['USD', 'NGN', 'GHS', 'GBP', 'EUR'] as const

export const CURRENCY_NAMES: Record<(typeof CURRENCIES)[number], string> = {
  USD: 'US Dollar',
  NGN: 'Nigerian Naira',
  GHS: 'Ghanaian Cedi',
  GBP: 'British Pound',
  EUR: 'Euro',
}

/** Aircraft type chips (B5, S2). Values are what the backend stores in `aircraft_types`. */
export const AIRCRAFT_TYPES = [
  { value: 'A320', label: 'A320 family' },
  { value: 'B737', label: 'B737NG' },
  { value: 'GA', label: 'GA / piston' },
] as const

export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'AE', name: 'United Arab Emirates' },
]

/** Escrow timings quoted in copy; must match backend platform defaults (D21). */
export const PLATFORM = {
  inspectionHours: 72,
  dispatchDays: 5,
  sellerReplyHours: 48,
  liveListingsBeforeKyc: 3,
} as const

export function titleCase(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Label lookup that tolerates enum values the app doesn't know yet (handoff §4). */
export function labelFor<K extends string>(map: Partial<Record<K, StatusLabel>>, value: K | string): StatusLabel {
  return (map as Record<string, StatusLabel | undefined>)[value] ?? { label: titleCase(value), tone: 'neutral' }
}
