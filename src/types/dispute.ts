import type { Id, IsoDateTime, Money } from './api'
import type { MediaAsset } from './media'

export type DisputeReason = 'not_as_described' | 'not_received' | 'damaged' | 'counterfeit'
export type DisputeResolutionRequest = 'full_refund' | 'partial_refund' | 'return_and_refund' | 'replacement'

/** handoff §8.7 */
export type DisputeStatus =
  | 'open'
  | 'awaiting_seller'
  | 'under_review'
  | 'resolved_buyer'
  | 'resolved_seller'
  | 'resolved_split'
  | 'withdrawn'
  | 'appealed'

export interface DisputeMessage {
  id: Id
  author: { displayName: string; initials: string; role: 'buyer' | 'seller' | 'mediator' | 'system' | (string & {}) }
  body: string
  attachments?: MediaAsset[]
  createdAt: IsoDateTime
}

export interface DisputeStep {
  label: string
  detail: string
  state: 'done' | 'current' | 'upcoming'
}

export type DisputeAction = 'reply' | 'withdraw' | 'accept_proposal' | 'decline_proposal' | 'attach' | (string & {})

export interface Dispute {
  id: Id
  number: string
  orderId: Id
  orderNumber: string
  reason: DisputeReason
  reasonLabel: string
  status: DisputeStatus
  requested: DisputeResolutionRequest
  requestedAmount?: Money | null
  escrowFrozen: Money
  mediator?: { displayName: string; initials: string } | null
  openedAt: IsoDateTime
  decisionDueAt?: IsoDateTime | null
  description: string
  evidence: MediaAsset[]
  messages: DisputeMessage[]
  steps: DisputeStep[]
  sellerProposal?: { summary: string; amount: Money; status: 'pending' | 'accepted' | 'declined' } | null
  viewerRole: 'buyer' | 'seller'
  allowedActions: DisputeAction[]
  item: { title: string; image?: MediaAsset | null; price: Money }
  counterpartyName: string
}

export interface OpenDisputePayload {
  orderId: Id
  reason: DisputeReason
  requested: DisputeResolutionRequest
  /** Minor units, only for partial refunds. */
  amount?: number | null
  description: string
  evidenceIds: Id[]
}
