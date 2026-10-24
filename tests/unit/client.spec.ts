import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/secureStore', () => {
  const mem = new Map<string, string>()
  return {
    secureStore: {
      get: async (k: string) => mem.get(k) ?? null,
      set: async (k: string, v: string) => void mem.set(k, v),
      remove: async (k: string) => void mem.delete(k),
    },
  }
})

const { api, http, httpEvents, setOnline, resetUnauthenticatedLatch } = await import('@/api/client')
const { tokenStore } = await import('@/api/token')

let calls: InternalAxiosRequestConfig[] = []
let respond: (config: InternalAxiosRequestConfig) => Promise<unknown>

const adapter: AxiosAdapter = async (config) => {
  calls.push(config)
  const data = await respond(config)
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

beforeEach(() => {
  calls = []
  http.defaults.adapter = adapter
  setOnline(true)
  resetUnauthenticatedLatch()
})

afterEach(async () => {
  await tokenStore.clear()
})

describe('central API client', () => {
  it('targets the versioned API root from env and sends JSON + correlation headers', async () => {
    respond = async () => ({ success: true, data: { ok: true } })
    await api.get('/home')
    const cfg = calls[0]!
    expect(cfg.baseURL).toBe('https://api.test.local/api/v1')
    expect(cfg.headers.get('Accept')).toBe('application/json')
    expect(cfg.headers.get('X-Request-Id')).toMatch(/[0-9a-f-]{36}/)
  })

  it('attaches the bearer token and snake_cases the body', async () => {
    await tokenStore.save('tok-123', 3600)
    respond = async () => ({ success: true, data: { listing_id: 'lst_1' } })
    const out = await api.post<{ listingId: string }>('/cart/items', { listingId: 'lst_1' })
    expect(calls[0]!.headers.get('Authorization')).toBe('Bearer tok-123')
    expect(JSON.parse(String(calls[0]!.data))).toEqual({ listing_id: 'lst_1' })
    expect(out).toEqual({ listingId: 'lst_1' })
  })

  it('refuses mutations while offline instead of pretending to succeed', async () => {
    setOnline(false)
    respond = async () => ({ success: true, data: {} })
    await expect(api.post('/orders', {})).rejects.toMatchObject({ code: 'OFFLINE' })
    expect(calls).toHaveLength(0)
  })

  it('retries idempotent GETs on transient network failure', async () => {
    let n = 0
    respond = async (config) => {
      n += 1
      if (n === 1) throw new AxiosError('Network Error', 'ERR_NETWORK', config)
      return { success: true, data: 'ok' }
    }
    await expect(api.get('/listings')).resolves.toBe('ok')
    expect(calls).toHaveLength(2)
  })

  it('never retries payments or other mutations', async () => {
    respond = async (config) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config)
    }
    await expect(api.post('/payments/initialize', { orderId: 'ord_1' })).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(calls).toHaveLength(1)
  })

  it('emits a single unauthenticated event for a burst of 401s', async () => {
    const listener = vi.fn()
    const off = httpEvents.on('unauthenticated', listener)
    respond = async (config) => {
      throw new AxiosError('401', 'ERR', config, null, { status: 401, statusText: '', headers: {}, config, data: { code: 'UNAUTHENTICATED' } })
    }
    await Promise.allSettled([api.get('/me/orders'), api.get('/me/wallet'), api.get('/notifications')])
    expect(listener).toHaveBeenCalledTimes(1)
    off()
  })
})
