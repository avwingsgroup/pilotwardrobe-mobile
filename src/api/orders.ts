import type {
  CheckoutQuote,
  CheckoutRequest,
  DispatchPayload,
  Order,
  OrderRoleFilter,
  PageQuery,
  ReviewPayload,
} from '@/types'
import { api, idempotencyHeaders, type MutationOptions } from './client'

/** Checkout and orders (contract §Cart, checkout & orders). */
export const ordersApi = {
  /** Pure price calculation; call whenever address, shipping or promo changes. */
  quote: (request: CheckoutRequest, signal?: AbortSignal) => api.post<CheckoutQuote>('/checkout/quote', request, { signal }),

  /** Creates the order in `pending_payment`. The server re-quotes; no totals are sent. */
  create: (request: CheckoutRequest, opts: MutationOptions) =>
    api.postEnvelope<Order>('/orders', request, { headers: idempotencyHeaders(opts.idempotencyKey) }),

  mine: (query: PageQuery & { role: OrderRoleFilter; status?: string }) => api.list<Order>('/me/orders', { params: query }),

  get: (id: string) => api.get<Order>(`/orders/${id}`),

  cancel: (id: string, reason?: string) => api.postEnvelope<Order>(`/orders/${id}/cancel`, { reason }),

  confirmDelivery: (id: string, review?: ReviewPayload | null) =>
    api.postEnvelope<Order>(`/orders/${id}/confirm-delivery`, review ? { review } : {}),

  dispatch: (id: string, payload: DispatchPayload) => api.postEnvelope<Order>(`/orders/${id}/dispatch`, payload),

  review: (id: string, payload: ReviewPayload) => api.post<void>(`/orders/${id}/reviews`, payload),
}
