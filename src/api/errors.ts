import { isAxiosError, isCancel } from 'axios'
import type { ApiErrorBody, ApiErrorCode } from '@/types/api'
import { camelPath } from './case'

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: 'UNKNOWN',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  410: 'TOKEN_EXPIRED',
  419: 'SESSION_EXPIRED',
  422: 'VALIDATION_ERROR',
  423: 'ACCOUNT_LOCKED',
  429: 'RATE_LIMITED',
  500: 'SERVER_ERROR',
  502: 'SERVER_ERROR',
  503: 'GATEWAY_UNAVAILABLE',
  504: 'TIMEOUT',
}

/** User-safe copy. Raw 5xx messages are never shown — they may leak internals. */
const FRIENDLY: Partial<Record<ApiErrorCode, string>> = {
  NETWORK_ERROR: "We can't reach Pilotwardrobe right now. Check your connection and try again.",
  OFFLINE: "You're offline. Reconnect to continue.",
  TIMEOUT: 'The request took too long. Please try again.',
  SERVER_ERROR: 'Something went wrong on our side. Please try again in a moment.',
  MAINTENANCE: 'Pilotwardrobe is down for scheduled maintenance. Please check back shortly.',
  GATEWAY_UNAVAILABLE: 'This service is temporarily unavailable. Please try again or choose another option.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  UNAUTHENTICATED: 'Please log in to continue.',
  FORBIDDEN: "You don't have permission to do that.",
  KYC_REQUIRED: 'Verify your identity to continue.',
  NOT_FOUND: "We couldn't find what you were looking for.",
  SESSION_EXPIRED: 'Your session expired. Please log in again.',
  TOKEN_EXPIRED: 'This link has expired.',
  UNKNOWN: 'Something went wrong. Please try again.',
}

export interface ApiErrorInit {
  message: string
  status: number
  code: ApiErrorCode
  fieldErrors?: Record<string, string[]>
  meta?: Record<string, unknown>
  requestId?: string
  retryAfter?: number
}

/**
 * The only error type pages and stores handle. Field errors are keyed by camelCase
 * field path so they map straight onto form models (first_name → firstName).
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fieldErrors: Record<string, string[]>
  readonly meta: Record<string, unknown>
  readonly requestId?: string
  /** Seconds, from `Retry-After` or `meta.retry_after` (429 / 423). */
  readonly retryAfter?: number

  constructor(init: ApiErrorInit) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.fieldErrors = init.fieldErrors ?? {}
    this.meta = init.meta ?? {}
    this.requestId = init.requestId
    this.retryAfter = init.retryAfter
  }

  get isValidation() {
    return this.code === 'VALIDATION_ERROR'
  }

  /** Transport failure — the request may never have reached the server. */
  get isNetwork() {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT' || this.code === 'OFFLINE'
  }

  get isCancelled() {
    return this.code === 'CANCELLED'
  }

  get hasFieldErrors() {
    return Object.keys(this.fieldErrors).length > 0
  }

  field(name: string): string | undefined {
    return this.fieldErrors[name]?.[0]
  }
}

function numberOrUndefined(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isCancel(error) || (error instanceof DOMException && error.name === 'AbortError')) {
    return new ApiError({ message: 'Request cancelled', status: 0, code: 'CANCELLED' })
  }

  if (isAxiosError(error)) {
    const requestId = error.config?.headers?.['X-Request-Id'] as string | undefined
    if (!error.response) {
      const timeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      const code: ApiErrorCode = timeout ? 'TIMEOUT' : 'NETWORK_ERROR'
      return new ApiError({ message: FRIENDLY[code]!, status: 0, code, requestId })
    }

    const { status, headers } = error.response
    const body = (error.response.data ?? {}) as ApiErrorBody
    const code: ApiErrorCode = body.code ?? STATUS_TO_CODE[status] ?? (status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN')

    const fieldErrors: Record<string, string[]> = {}
    for (const [key, messages] of Object.entries(body.errors ?? {})) {
      fieldErrors[camelPath(key)] = Array.isArray(messages) ? messages.map(String) : [String(messages)]
    }

    const message =
      status >= 500 && code !== 'MAINTENANCE' && code !== 'GATEWAY_UNAVAILABLE'
        ? FRIENDLY.SERVER_ERROR!
        : (body.message ?? FRIENDLY[code] ?? FRIENDLY.UNKNOWN!)

    const meta = (body.meta ?? {}) as Record<string, unknown>
    const retryAfter =
      numberOrUndefined((headers as Record<string, unknown> | undefined)?.['retry-after']) ??
      numberOrUndefined(meta.retryAfter ?? meta.retry_after)

    return new ApiError({ message, status, code, fieldErrors, meta, requestId: requestId ?? undefined, retryAfter })
  }

  return new ApiError({ message: FRIENDLY.UNKNOWN!, status: 0, code: 'UNKNOWN' })
}

export const friendlyMessage = (code: ApiErrorCode) => FRIENDLY[code] ?? FRIENDLY.UNKNOWN!

/** Message for any thrown value — safe to show users. */
export function errorMessage(error: unknown): string {
  return toApiError(error).message
}
