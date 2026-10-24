import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { appConfig } from '@/config/env'
import { logger } from '@/services/logger'
import type { ApiResponse, Paginated } from '@/types/api'
import { uuid } from '@/utils/id'
import { toCamel, toSnake } from './case'
import { ApiError, toApiError } from './errors'
import { tokenStore } from './token'

/* ── Global HTTP events (auth store and router subscribe in main.ts) ─────── */
export type HttpEvent = 'unauthenticated' | 'session-expired' | 'maintenance' | 'kyc-required'
type Listener = (detail: { url?: string; message?: string }) => void
const listeners = new Map<HttpEvent, Set<Listener>>()

export const httpEvents = {
  on(event: HttpEvent, listener: Listener) {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)!.add(listener)
    return () => listeners.get(event)?.delete(listener)
  },
  emit(event: HttpEvent, detail: { url?: string; message?: string } = {}) {
    listeners.get(event)?.forEach((fn) => fn(detail))
  },
}

/** Online state is pushed in by the network service so this module stays platform-free. */
let online = true
export function setOnline(value: boolean) {
  online = value
}

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Do not broadcast a global sign-out on 401 (e.g. /auth/me probes, login attempts). */
    skipAuthRedirect?: boolean
    /** Internal retry counter for safe (GET) requests. */
    retryCount?: number
  }
}

const SAFE_METHODS = new Set(['get', 'head', 'options'])
const MAX_SAFE_RETRIES = 2

/**
 * Retry policy: only idempotent reads, only for transient failures. Mutations —
 * payments, orders, swaps, offers, withdrawals — are NEVER retried automatically.
 * Callers that need a safe resubmission send the same Idempotency-Key themselves.
 */
function shouldRetry(error: ApiError, config?: AxiosRequestConfig): boolean {
  const method = (config?.method ?? 'get').toLowerCase()
  if (!SAFE_METHODS.has(method)) return false
  if ((config?.retryCount ?? 0) >= MAX_SAFE_RETRIES) return false
  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') return online
  return error.status === 502 || error.status === 504 || (error.status === 503 && error.code !== 'MAINTENANCE')
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Collapse a burst of 401s (several requests expiring together) into one sign-out. */
let unauthenticatedNotified = false
export function resetUnauthenticatedLatch() {
  unauthenticatedNotified = false
}

function stripEmpty(params: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue
    out[key] = Array.isArray(value) ? value.join(',') : value
  }
  return out
}

function createClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: appConfig.apiBaseUrl,
    timeout: appConfig.requestTimeoutMs,
    withCredentials: false,
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toLowerCase()
    if (!online && !SAFE_METHODS.has(method)) {
      // Never queue or optimistically "succeed" a mutation while offline.
      throw new ApiError({ message: "You're offline. Reconnect to continue.", status: 0, code: 'OFFLINE' })
    }

    if (!config.headers.has('X-Request-Id')) config.headers.set('X-Request-Id', uuid())
    config.headers.set('Accept-Language', document.documentElement.lang || appConfig.defaultLocale)

    const token = tokenStore.current()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)

    if (config.params) config.params = toSnake(stripEmpty(config.params as Record<string, unknown>))
    if (config.data && !(config.data instanceof FormData)) config.data = toSnake(config.data)
    return config
  })

  instance.interceptors.response.use(
    (response) => {
      if (response.data && typeof response.data === 'object' && !(response.data instanceof Blob)) {
        response.data = toCamel(response.data)
      }
      return response
    },
    async (error) => {
      const apiError = toApiError(error)
      const config = (error as { config?: AxiosRequestConfig }).config

      if (!apiError.isCancelled && shouldRetry(apiError, config) && config) {
        config.retryCount = (config.retryCount ?? 0) + 1
        await wait(400 * 2 ** (config.retryCount - 1))
        return instance.request(config)
      }

      if (apiError.status === 401 && !config?.skipAuthRedirect) {
        if (!unauthenticatedNotified) {
          unauthenticatedNotified = true
          httpEvents.emit('unauthenticated', { url: config?.url })
        }
      } else if (apiError.status === 419) {
        httpEvents.emit('session-expired', { url: config?.url })
      } else if (apiError.code === 'MAINTENANCE') {
        httpEvents.emit('maintenance', { url: config?.url, message: apiError.message })
      } else if (apiError.code === 'KYC_REQUIRED') {
        httpEvents.emit('kyc-required', { url: config?.url, message: apiError.message })
      }

      if (apiError.status >= 500 || apiError.code === 'NETWORK_ERROR') {
        logger.warn('API request failed', {
          url: config?.url,
          method: config?.method,
          status: apiError.status,
          code: apiError.code,
          requestId: apiError.requestId,
        })
      }
      return Promise.reject(apiError)
    },
  )

  return instance
}

export const http = createClient()

type Cfg = AxiosRequestConfig & { signal?: AbortSignal }

/** Mutation options shared by idempotent endpoints (contract §1.10). */
export interface MutationOptions {
  idempotencyKey?: string
  signal?: AbortSignal
}

export function idempotencyHeaders(key?: string): Record<string, string> {
  return key ? { 'Idempotency-Key': key } : {}
}

/* ── Typed helpers returning the unwrapped envelope payload ─────────────── */
export const api = {
  async get<T>(url: string, config?: Cfg): Promise<T> {
    const res = await http.get<ApiResponse<T>>(url, config)
    return res.data.data
  },
  async list<T, M extends object = Record<never, never>>(url: string, config?: Cfg): Promise<Paginated<T, M>> {
    const res = await http.get<Paginated<T, M>>(url, config)
    return res.data
  },
  async post<T>(url: string, body?: unknown, config?: Cfg): Promise<T> {
    const res = await http.post<ApiResponse<T>>(url, body, config)
    return res.data?.data as T
  },
  async put<T>(url: string, body?: unknown, config?: Cfg): Promise<T> {
    const res = await http.put<ApiResponse<T>>(url, body, config)
    return res.data?.data as T
  },
  async patch<T>(url: string, body?: unknown, config?: Cfg): Promise<T> {
    const res = await http.patch<ApiResponse<T>>(url, body, config)
    return res.data?.data as T
  },
  async delete<T = void>(url: string, config?: Cfg): Promise<T> {
    const res = await http.delete<ApiResponse<T>>(url, config)
    return res.data?.data as T
  },
  /** Full envelope when the server `message` is shown to the user. */
  async postEnvelope<T>(url: string, body?: unknown, config?: Cfg): Promise<ApiResponse<T>> {
    const res = await http.post<ApiResponse<T>>(url, body, config)
    return res.data
  },
  /** Multipart upload with progress (0–1). */
  async upload<T>(url: string, form: FormData, onProgress?: (fraction: number) => void, config?: Cfg): Promise<T> {
    const res = await http.post<ApiResponse<T>>(url, form, {
      ...config,
      timeout: Math.max(appConfig.requestTimeoutMs, 120_000),
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.min(1, event.loaded / event.total))
      },
    })
    return res.data.data
  },
}
