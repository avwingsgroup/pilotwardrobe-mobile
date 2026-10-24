import type { CurrencyCode, Id, IsoDateTime, Money } from './api'
import type { MediaAsset } from './media'

export interface WalletBalance {
  available: Money
  inEscrow: Money
  pendingRelease: Money
  lifetimeEarnings: Money
  total: Money
  escrowOrders: number
  pendingReleaseIn?: string | null
  thisMonthEarnings?: Money | null
}

export type TransactionType =
  | 'sale'
  | 'purchase'
  | 'withdrawal'
  | 'promotion'
  | 'refund'
  | 'fee'
  | 'swap_topup'
  | 'adjustment'
  | (string & {})

export type TransactionStatus = 'pending' | 'in_escrow' | 'released' | 'paid' | 'complete' | 'failed' | 'reversed' | (string & {})

export interface WalletTransaction {
  id: Id
  occurredAt: IsoDateTime
  description: string
  detail?: string | null
  type: TransactionType
  status: TransactionStatus
  amount: Money
  direction: 'credit' | 'debit'
  orderId?: Id | null
}

export interface PayoutMethod {
  id: Id
  kind: 'bank' | 'wise' | 'mobile_money' | 'paypal' | (string & {})
  label: string
  currency: CurrencyCode
  last4: string
  isDefault: boolean
}

export interface WithdrawalQuote {
  amount: Money
  exchangeRate?: { from: string; to: string; rate: number; label: string } | null
  fee: Money
  recipientReceives: Money
  arrivesBetween: { from: IsoDateTime; to: IsoDateTime }
  requiresTwoFactor: boolean
}

export interface WithdrawalPayload {
  amount: number
  currency: CurrencyCode
  payoutMethodId: Id
  twoFactorCode?: string
}

/** GET /me/hangar — seller dashboard aggregate. */
export interface HangarSummary {
  sellerSince: IsoDateTime | null
  verifiedSeller: boolean
  stats: {
    inEscrow: Money
    escrowOrders: number
    availableToPayOut: Money
    weekDelta: Money
    liveListings: number
    listingsNeedPhotos: number
    sellerRating: number
    previousRating: number | null
  }
  attention: { id: Id; tone: 'warning' | 'info' | 'success'; title: string; detail: string; to: string }[]
  feed: {
    id: Id
    kind: 'listing' | 'order'
    title: string
    subtitle: string
    image: MediaAsset | null
    price: Money
    status: { label: string; tone: string }
    bucket: string
    nextAction: string
    to: string
  }[]
}
