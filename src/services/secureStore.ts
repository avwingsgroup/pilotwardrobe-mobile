import { Capacitor } from '@capacitor/core'
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage'

/**
 * Storage for credentials (the Sanctum bearer token).
 *
 * Native: iOS Keychain / Android Keystore-backed storage through
 * @aparajita/capacitor-secure-storage, restricted to this device and available
 * after first unlock (needed when a push notification wakes the app).
 *
 * Browser (`npm run dev` only): tab-scoped sessionStorage. The browser build is a
 * development surface, not a shipped product, so it never persists credentials
 * beyond the tab.
 */
const PREFIX = 'pw_'
const isNative = Capacitor.isNativePlatform()
let configured: Promise<void> | null = null

function configure(): Promise<void> {
  configured ??= isNative
    ? Promise.all([
        SecureStorage.setKeyPrefix(PREFIX),
        SecureStorage.setDefaultKeychainAccess(KeychainAccess.afterFirstUnlockThisDeviceOnly),
        SecureStorage.setSynchronize(false),
      ]).then(() => undefined)
    : Promise.resolve()
  return configured
}

function session(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export const secureStore = {
  async get(key: string): Promise<string | null> {
    await configure()
    if (!isNative) return session()?.getItem(PREFIX + key) ?? null
    try {
      return await SecureStorage.getItem(key)
    } catch {
      return null
    }
  },

  async set(key: string, value: string): Promise<void> {
    await configure()
    if (!isNative) {
      session()?.setItem(PREFIX + key, value)
      return
    }
    await SecureStorage.setItem(key, value)
  },

  async remove(key: string): Promise<void> {
    await configure()
    if (!isNative) {
      session()?.removeItem(PREFIX + key)
      return
    }
    try {
      await SecureStorage.removeItem(key)
    } catch {
      // Already absent.
    }
  },
}
