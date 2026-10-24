import { secureStore } from '@/services/secureStore'

/**
 * Bearer token for Sanctum token mode (the only auth mode mobile uses — cookie mode
 * is for the same-site web SPA). Held in memory for request headers and persisted
 * through secureStore (Keychain / Keystore on device).
 */
const KEY = 'access_token'
const EXPIRES_KEY = 'access_token_expires_at'

let memoryToken: string | null = null
let memoryExpiresAt: number | null = null

export const tokenStore = {
  /** Synchronous read for the request interceptor. */
  current(): string | null {
    if (memoryToken && memoryExpiresAt && Date.now() >= memoryExpiresAt) return null
    return memoryToken
  },

  /** Load the persisted token into memory at app start. */
  async restore(): Promise<string | null> {
    const [token, expires] = await Promise.all([secureStore.get(KEY), secureStore.get(EXPIRES_KEY)])
    memoryToken = token
    memoryExpiresAt = expires ? Number(expires) : null
    if (memoryExpiresAt && Date.now() >= memoryExpiresAt) {
      await tokenStore.clear()
      return null
    }
    return memoryToken
  },

  async save(token: string, expiresInSeconds?: number): Promise<void> {
    memoryToken = token
    memoryExpiresAt = expiresInSeconds ? Date.now() + expiresInSeconds * 1000 : null
    await secureStore.set(KEY, token)
    if (memoryExpiresAt) await secureStore.set(EXPIRES_KEY, String(memoryExpiresAt))
    else await secureStore.remove(EXPIRES_KEY)
  },

  async clear(): Promise<void> {
    memoryToken = null
    memoryExpiresAt = null
    await Promise.all([secureStore.remove(KEY), secureStore.remove(EXPIRES_KEY)])
  },
}
