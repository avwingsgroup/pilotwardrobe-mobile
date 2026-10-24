import type { Id, IsoDateTime, Money, MoneyInput } from './api'
import type { MediaAsset } from './media'
import type { ProductCondition } from './listing'

/** handoff §8.2 */
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'countered' | 'expired' | 'cancelled'
/** handoff §8.3 */
export type SwapStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'cancelled' | 'expired' | 'completed' | 'disputed'

export interface Counterparty {
  id: Id
  displayName: string
  initials: string
  username: string
  verified: boolean
  rating: number
  trades: number
  location?: string | null
  memberSince?: IsoDateTime | null
}

export interface ListingSummary {
  id: Id
  slug: string
  title: string
  image?: MediaAsset | null
  price: Money
  condition?: ProductCondition | null
  minimumOffer?: Money | null
}

export interface TradeHistoryEvent {
  id: Id
  label: string
  detail: string
  occurredAt: IsoDateTime
  kind: string
}

export type OfferAction = 'accept' | 'decline' | 'counter' | 'cancel' | 'checkout' | 'message' | (string & {})
export type SwapAction = 'accept' | 'reject' | 'counter' | 'cancel' | 'message' | 'checkout' | (string & {})

export interface Offer {
  id: Id
  kind: 'offer'
  direction: 'received' | 'sent'
  status: OfferStatus
  listing: ListingSummary
  amount: Money
  counterAmount?: Money | null
  belowAskingPercent: number
  youReceive?: Money | null
  message?: string | null
  counterparty: Counterparty
  expiresAt: IsoDateTime
  createdAt: IsoDateTime
  history: TradeHistoryEvent[]
  unread?: boolean
  allowedActions: OfferAction[]
}

export interface CreateOfferPayload extends MoneyInput {
  message?: string | null
  size?: string | null
}

export interface CounterOfferPayload {
  amount: number
  currency?: MoneyInput['currency']
  message?: string | null
}

export interface SwapItem {
  listing: ListingSummary
  estimatedValue: Money
}

export interface SwapRequest {
  id: Id
  kind: 'swap'
  direction: 'received' | 'sent'
  status: SwapStatus
  targetListing: ListingSummary
  offeredItems: SwapItem[]
  /** Signed: positive = proposer pays the counterparty. */
  cashAdjustment?: Money | null
  swapFee: Money
  message?: string | null
  counterparty: Counterparty
  expiresAt: IsoDateTime
  createdAt: IsoDateTime
  history: TradeHistoryEvent[]
  unread?: boolean
  allowedActions: SwapAction[]
}

export interface CreateSwapPayload {
  offeredListingIds: Id[]
  cashAdjustment?: MoneyInput | null
  message?: string | null
}

export type TradeBox = 'received' | 'sent'
