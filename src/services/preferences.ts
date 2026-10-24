import { Preferences } from '@capacitor/preferences'

/**
 * Non-sensitive key/value storage (theme, onboarding flag, recent searches).
 * Native: SharedPreferences / UserDefaults. Web: localStorage.
 * NEVER store tokens or personal data here — use secureStore for credentials.
 */
export const preferences = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const { value } = await Preferences.get({ key })
      return value === null ? fallback : (JSON.parse(value) as T)
    } catch {
      return fallback
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    try {
      await Preferences.set({ key, value: JSON.stringify(value) })
    } catch {
      // Preferences are conveniences; failures must not break flows.
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key })
    } catch {
      // ignore
    }
  },
}
