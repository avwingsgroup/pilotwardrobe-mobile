import type {
  BoostPackage,
  EditableListing,
  FeeQuote,
  HangarSummary,
  Listing,
  ListingDraftInput,
  MoneyInput,
  Paginated,
  PriceCheck,
  PromotionCheckout,
} from '@/types'
import { api } from './client'

/** Backend SellerListingController::TABS keys. */
export type ListingStatusTab = 'live' | 'active' | 'drafts' | 'draft' | 'paused' | 'sold' | 'needs_changes' | 'archived' | 'removed' | 'all'

export interface MyListingsMeta {
  counts?: Partial<Record<'all' | 'live' | 'drafts' | 'paused' | 'sold' | 'removed', number>>
}

/** `POST /listings/{id}/{action}` state actions (contract §Listings). */
export type ListingStateAction = 'pause' | 'resume' | 'archive' | 'mark-sold' | 'mark-unavailable' | 'relist' | 'resubmit'

/** Seller side: drafts, publishing, my listings, promotion (contract §Listings (seller)). */
export const sellingApi = {
  hangar: () => api.get<HangarSummary>('/me/hangar'),

  myListings: (query: { status?: ListingStatusTab; page?: number; perPage?: number; search?: string } = {}) =>
    api.list<Listing, MyListingsMeta>('/me/listings', { params: query }) as Promise<Paginated<Listing, MyListingsMeta>>,

  myListing: (id: string) => api.get<EditableListing>(`/me/listings/${id}`),

  createDraft: (draft: ListingDraftInput) => api.post<Listing>('/listings', draft),

  saveDraft: (id: string, draft: ListingDraftInput) => api.patch<Listing>(`/listings/${id}`, draft),

  publish: (id: string) => api.postEnvelope<Listing>(`/listings/${id}/publish`),

  remove: (id: string) => api.delete<void>(`/listings/${id}`),

  action: (id: string, action: ListingStateAction) => api.postEnvelope<Listing>(`/listings/${id}/${action}`),

  feeQuote: (price: MoneyInput) => api.post<FeeQuote>('/listings/fee-quote', { price }),

  priceCheck: (input: { listingId?: string; categoryId?: string; brand?: string; model?: string; condition?: string; price?: MoneyInput }) =>
    api.post<PriceCheck>('/listings/price-check', input),

  boostPackages: () => api.get<BoostPackage[]>('/boost-packages'),

  /** Creates a pending promotion; it is paid through /payments/initialize with `promotionId`. */
  promote: (id: string, packageId: string) => api.post<PromotionCheckout>(`/listings/${id}/promote`, { packageId }),
}
