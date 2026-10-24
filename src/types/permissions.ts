/**
 * Roles and permissions from contract §2. The backend returns the EFFECTIVE permission
 * list on /auth/me; the app uses it only to shape UX. Every endpoint re-checks.
 */
export type UserRole = 'user' | 'aviator' | 'admin' | 'super_admin'
export type RoleOrVisitor = UserRole | 'visitor'

/** Marketplace permissions the mobile app gates on. Staff permissions are web-only. */
export type MarketplacePermission =
  | 'listings.create'
  | 'listings.update'
  | 'listings.promote'
  | 'offers.create'
  | 'swaps.create'
  | 'orders.create'
  | 'payouts.request'
  | 'reviews.create'
  | 'disputes.create'
  | 'messages.send'
  | 'aviator.credentials.manage'
  | 'listings.unlimited'

/** Unknown/staff permission strings are kept as plain strings. */
export type Permission = MarketplacePermission | (string & {})

export const STAFF_ROLES: readonly UserRole[] = ['admin', 'super_admin']
