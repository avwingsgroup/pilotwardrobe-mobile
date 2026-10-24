import type { CurrencyCode, InitializePaymentPayload, Payment, PaymentInitialization, PaymentMethod, SandboxOutcome } from '@/types'
import { api, idempotencyHeaders, type MutationOptions } from './client'

/**
 * Gateway-agnostic payments (contract §4.3, handoff §7). The app NEVER decides a
 * payment succeeded: only GET /payments/{reference} (server-verified) counts.
 */
export const paymentsApi = {
  methods: (query: { currency?: CurrencyCode; country?: string | null }) =>
    api.get<PaymentMethod[]>('/payment-methods', { params: query }),

  initialize: (payload: InitializePaymentPayload, opts: MutationOptions) =>
    api.post<PaymentInitialization>('/payments/initialize', payload, { headers: idempotencyHeaders(opts.idempotencyKey) }),

  verify: (reference: string, signal?: AbortSignal) => api.get<Payment>(`/payments/${encodeURIComponent(reference)}`, { signal }),

  /** Non-production only: drive the sandbox gateway's outcome (backend D15). */
  sandboxOutcome: (reference: string, outcome: SandboxOutcome) =>
    api.post<unknown>(`/sandbox/payments/${encodeURIComponent(reference)}/${outcome}`),
}
