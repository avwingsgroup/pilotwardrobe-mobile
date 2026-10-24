/**
 * Transport contracts shared by every endpoint (docs/backend/backend-api-contract.md §1).
 *
 * Laravel speaks snake_case. The HTTP client converts object keys to camelCase on the
 * way in and back to snake_case on the way out (src/api/case.ts), so every type in
 * src/types is camelCase. Enum VALUES stay snake_case ("like_new", "pending_payment").
 */

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface PaginationMeta {
  currentPage: number
  perPage: number
  total: number
  lastPage: number
  from?: number | null
  to?: number | null
}

export interface PaginationLinks {
  first: string | null
  last: string | null
  next: string | null
  prev: string | null
}

export interface Paginated<T, M extends object = Record<never, never>> {
  data: T[]
  meta: PaginationMeta & M
  links?: PaginationLinks
}

/** Machine-readable error codes (contract §1.5). Client-only codes are marked. */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SESSION_EXPIRED'
  | 'ACCOUNT_LOCKED'
  | 'EMAIL_NOT_VERIFIED'
  | 'KYC_REQUIRED'
  | 'INVALID_STATE_TRANSITION'
  | 'PAYMENT_FAILED'
  | 'GATEWAY_UNAVAILABLE'
  | 'TOKEN_EXPIRED'
  | 'MAINTENANCE'
  | 'SERVER_ERROR'
  | 'UNKNOWN'
  // client-only
  | 'NETWORK_ERROR'
  | 'OFFLINE'
  | 'TIMEOUT'
  | 'CANCELLED'

export interface ApiErrorBody {
  success: false
  message?: string
  code?: ApiErrorCode
  errors?: Record<string, string[]>
  meta?: Record<string, unknown>
}

export interface PageQuery {
  page?: number
  perPage?: number
}

export type Id = string
/** ISO-8601 timestamp in UTC, e.g. 2026-07-31T10:42:08Z */
export type IsoDateTime = string
/** YYYY-MM-DD */
export type IsoDate = string
export type CurrencyCode = 'USD' | 'NGN' | 'GHS' | 'GBP' | 'EUR'
/** ISO-3166-1 alpha-2 */
export type CountryCode = string

/** Money is always integer minor units (cents / kobo). Never floats. */
export interface Money {
  amount: number
  currency: CurrencyCode
  /** Locale-aware string from the server (Accept-Language). */
  formatted?: string
}

/** Request shape for money (contract §1.6): flat minor units + currency. */
export interface MoneyInput {
  amount: number
  currency: CurrencyCode
}
