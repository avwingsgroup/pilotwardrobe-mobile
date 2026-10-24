import type { CurrencyCode, PageQuery, PayoutMethod, WalletBalance, WalletTransaction, WithdrawalPayload, WithdrawalQuote } from '@/types'
import { api, idempotencyHeaders, type MutationOptions } from './client'

/** Wallet and payouts (contract §Wallet & payouts). */
export const walletApi = {
  balance: () => api.get<WalletBalance>('/me/wallet'),

  transactions: (query: PageQuery & { type?: string } = {}) => api.list<WalletTransaction>('/me/wallet/transactions', { params: query }),

  payoutMethods: () => api.get<PayoutMethod[]>('/me/payout-methods'),

  withdrawalQuote: (amount: number, currency: CurrencyCode, payoutMethodId: string) =>
    api.post<WithdrawalQuote>('/me/withdrawals/quote', { amount, currency, payoutMethodId }),

  /** Above the dual-control threshold the backend parks the request for staff approval. */
  withdraw: (payload: WithdrawalPayload, opts: MutationOptions) =>
    api.postEnvelope<WalletTransaction & { requiresApproval?: boolean }>('/me/withdrawals', payload, {
      headers: idempotencyHeaders(opts.idempotencyKey),
    }),

  /** Signed URL to a monthly statement PDF. `month` is YYYY-MM. */
  statement: (month: string, currency?: CurrencyCode) =>
    api.post<{ url: string; expiresAt?: string }>('/me/wallet/statements', { month, currency }),
}
