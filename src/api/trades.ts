import type {
  CounterOfferPayload,
  CreateOfferPayload,
  CreateSwapPayload,
  Offer,
  PageQuery,
  SwapRequest,
  TradeBox,
} from '@/types'
import { api, idempotencyHeaders, type MutationOptions } from './client'

/** Offers and swaps (contract §Offers, §Swaps). Buttons render from `allowedActions`. */
export const tradesApi = {
  makeOffer: (listingId: string, payload: CreateOfferPayload, opts: MutationOptions = {}) =>
    api.postEnvelope<Offer>(`/listings/${listingId}/offers`, payload, { headers: idempotencyHeaders(opts.idempotencyKey) }),

  /** Paginated. Opening the received box marks those offers as seen server-side. */
  offers: (box: TradeBox, query: PageQuery & { status?: string } = {}) =>
    api.list<Offer>('/me/offers', { params: { box, ...query } }),

  acceptOffer: (id: string) => api.postEnvelope<Offer>(`/offers/${id}/accept`),

  declineOffer: (id: string) => api.postEnvelope<Offer>(`/offers/${id}/decline`),

  counterOffer: (id: string, payload: CounterOfferPayload) => api.postEnvelope<Offer>(`/offers/${id}/counter`, payload),

  cancelOffer: (id: string) => api.postEnvelope<Offer>(`/offers/${id}/cancel`),

  proposeSwap: (listingId: string, payload: CreateSwapPayload, opts: MutationOptions = {}) =>
    api.postEnvelope<SwapRequest>(`/listings/${listingId}/swap-requests`, payload, {
      headers: idempotencyHeaders(opts.idempotencyKey),
    }),

  swaps: (box?: TradeBox, query: PageQuery & { status?: string } = {}) =>
    api.list<SwapRequest>('/me/swap-requests', { params: { box, ...query } }),

  acceptSwap: (id: string) => api.postEnvelope<SwapRequest>(`/swap-requests/${id}/accept`),

  rejectSwap: (id: string) => api.postEnvelope<SwapRequest>(`/swap-requests/${id}/reject`),

  cancelSwap: (id: string) => api.postEnvelope<SwapRequest>(`/swap-requests/${id}/cancel`),
}
