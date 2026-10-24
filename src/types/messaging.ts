import type { Id, IsoDateTime, Money } from './api'
import type { MediaAsset } from './media'

export interface ConversationParticipant {
  id: Id
  displayName: string
  initials: string
  username: string
  verified: boolean
  responseTime?: string | null
  location?: string | null
  rating?: number | null
  trades?: number | null
  kycVerified?: boolean
  memberSince?: IsoDateTime | null
}

export interface ConversationListingContext {
  id: Id
  slug: string
  title: string
  image?: MediaAsset | null
  price: Money
  conditionLabel?: string | null
  offersCount?: number
  reserved?: boolean
  status?: string
}

export interface Conversation {
  id: Id
  context: 'buying' | 'selling' | 'support'
  participant: ConversationParticipant
  listing?: ConversationListingContext | null
  lastMessagePreview: string
  lastMessageAt: IsoDateTime
  unreadCount: number
}

/** Backend message kinds: text, plus system/offer/swap events posted into the thread. */
export type MessageKind = 'text' | 'system' | 'offer' | 'swap' | (string & {})

export interface Message {
  id: Id
  conversationId: Id
  senderId: Id | null
  mine: boolean
  kind: MessageKind
  body: string
  /** `{ offerId }` for offer events, `{ swapRequestId }` for swap events. */
  context?: { offerId?: Id; swapRequestId?: Id; [key: string]: unknown } | null
  flags?: string[] | null
  attachments?: MediaAsset[]
  sentAt: IsoDateTime
  readAt?: IsoDateTime | null
}

export interface SendMessagePayload {
  body: string
  attachmentIds?: Id[]
}

export type ReportReason = 'off_platform_payment' | 'scam' | 'harassment' | 'spam' | 'counterfeit' | 'other'
