import type { Id, IsoDateTime } from './api'

export type NotificationCategory =
  | 'orders'
  | 'offers_swaps'
  | 'messages'
  | 'account'
  | 'disputes'
  | 'payouts'
  | 'reviews'
  | (string & {})

export type NotificationIcon =
  | 'offer'
  | 'order'
  | 'landed'
  | 'dispute'
  | 'review'
  | 'payout'
  | 'verified'
  | 'message'
  | (string & {})

export interface NotificationAction {
  label: string
  /** Web-app path (e.g. /hangar/orders/ord_1). Mapped to an app route before navigating. */
  to: string
  variant?: 'primary' | 'success' | 'secondary'
}

export interface AppNotification {
  id: Id
  category: NotificationCategory
  icon: NotificationIcon
  title: string
  body: string
  readAt?: IsoDateTime | null
  createdAt: IsoDateTime
  actions?: NotificationAction[]
  link?: string | null
}

export interface UnreadCounts {
  count: number
  messages?: number
}

/** POST /me/devices */
export interface DeviceRegistration {
  token: string
  platform: 'ios' | 'android' | 'web'
  deviceName?: string | null
  appVersion?: string | null
}

export interface RegisteredDevice {
  id: Id
  platform: string
  deviceName?: string | null
  createdAt?: IsoDateTime
}
