import type { Id, IsoDateTime, Money } from './api'
import type { MediaAsset } from './media'
import type { PaymentGateway, PaymentStatus } from './payment'
import type { ProductCondition, ShippingOption } from './listing'
import type { Address, PublicSeller } from './user'

/** Order lifecycle — handoff §8.4. Aviation labels live in constants/labels.ts. */
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'awaiting_dispatch'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed'
  | 'on_hold'

/** handoff §8.6 */
export type EscrowStatus = 'not_funded' | 'held' | 'frozen' | 'releasing' | 'released' | 'refunded' | 'on_hold'

/** Viewer-specific actions computed by the backend (handoff §4). */
export type OrderAction =
  | 'pay'
  | 'cancel'
  | 'confirm_delivery'
  | 'open_dispute'
  | 'review'
  | 'mark_dispatched'
  | 'print_label'
  | 'download'
  | 'message'
  | (string & {})

export interface OrderItem {
  id: Id
  listingId: Id
  listingSlug: string
  title: string
  image?: MediaAsset | null
  condition?: ProductCondition | null
  size?: string | null
  sizeFromFitKit?: boolean
  quantity: number
  unitPrice: Money
  total: Money
}

export interface OrderTotals {
  items: Money
  freight: Money
  buyerProtection: Money
  duties?: Money | null
  discount?: Money | null
  total: Money
}

export interface TrackingEvent {
  id: Id
  code: string
  label: string
  detail?: string | null
  occurredAt?: IsoDateTime | null
  state: 'done' | 'current' | 'upcoming'
}

export interface Order {
  id: Id
  number: string
  kind?: string
  status: OrderStatus
  statusLabel?: string
  escrowStatus: EscrowStatus
  role: 'buyer' | 'seller'
  items: OrderItem[]
  totals: OrderTotals
  seller: PublicSeller
  buyer: { id: Id; displayName: string; initials: string }
  shippingAddress?: Address | null
  shipping?: ShippingOption | null
  carrier?: { name: string; trackingNumber: string; trackingUrl?: string | null } | null
  route?: { from: string; to: string; progress: number } | null
  estimatedDelivery?: { from: IsoDateTime; to: IsoDateTime } | null
  dispatchBy?: IsoDateTime | null
  autoReleaseAt?: IsoDateTime | null
  disputeWindowEndsAt?: IsoDateTime | null
  tracking: TrackingEvent[]
  payment?: { gateway: PaymentGateway; status: PaymentStatus; reference: string; methodLabel?: string | null } | null
  allowedActions: OrderAction[]
  disputeId?: Id | null
  placedAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface CheckoutLine {
  id: Id
  listingId: Id
  listingSlug: string
  title: string
  image?: MediaAsset | null
  condition?: ProductCondition | null
  size?: string | null
  sizeFromFitKit?: boolean
  price: Money
  seller: Pick<PublicSeller, 'id' | 'displayName' | 'username' | 'verified'>
  available: boolean
}

export interface CheckoutQuote {
  items: CheckoutLine[]
  shippingOptions: ShippingOption[]
  selectedShippingId?: Id | null
  totals: OrderTotals
  dispatchNote?: string | null
  escrowNote?: string | null
}

/** Shared by POST /checkout/quote and POST /orders. The server re-quotes; totals are never sent. */
export interface CheckoutRequest {
  listingId: Id
  size?: string | null
  offerId?: Id | null
  addressId?: Id | null
  shippingOptionId?: Id | null
  promoCode?: string | null
}

export interface ReviewPayload {
  rating: number
  comment?: string | null
  tags: string[]
}

export interface DispatchPayload {
  carrier: string
  trackingNumber: string
  trackingUrl?: string | null
}

export type OrderRoleFilter = 'buying' | 'selling'
