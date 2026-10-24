import type { Id, IsoDateTime, Money } from './api'

/** `sandbox` exists only in non-production backends (backend D15). */
export type PaymentGateway = 'stripe' | 'paypal' | 'paystack' | 'flutterwave' | 'monnify' | 'sandbox' | (string & {})

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'partially_refunded'

export const TERMINAL_PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'successful',
  'failed',
  'cancelled',
  'expired',
  'refunded',
  'partially_refunded',
]

export interface PaymentMethod {
  code: PaymentGateway
  name: string
  description?: string | null
  flow: 'redirect' | 'popup' | (string & {})
  logo?: string | null
  enabled: boolean
  unavailableReason?: string | null
}

export interface InitializePaymentPayload {
  orderId?: Id
  promotionId?: Id
  gateway: PaymentGateway
  returnUrl: string
}

export interface PaymentInitialization {
  paymentId: Id
  gateway: PaymentGateway
  status: PaymentStatus
  reference: string
  authorizationUrl: string
  amount?: Money
  publicKey?: string | null
  expiresAt?: IsoDateTime | null
}

/** GET /payments/{reference} — server-verified. The only source of payment truth. */
export interface Payment {
  id: Id
  reference: string
  status: PaymentStatus
  gateway: PaymentGateway
  orderId?: Id | null
  promotionId?: Id | null
  amount: Money
  failureReason?: string | null
  paidAt?: IsoDateTime | null
}

export type SandboxOutcome = 'approve' | 'decline' | 'cancel'
