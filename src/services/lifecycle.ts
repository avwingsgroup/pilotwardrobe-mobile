import { App } from '@capacitor/app'
import { useAuthStore } from '@/stores/auth'
import { useBadgesStore } from '@/stores/badges'

/** How stale the session principal may get before a resume re-reads /auth/me. */
const PRINCIPAL_MAX_AGE_MS = 5 * 60_000

/**
 * Foreground/background handling. On resume only stale data is refreshed
 * (principal after 5 minutes, badge counts immediately); nothing reloads the app.
 * Polling stops in the background to save battery and data.
 */
export async function initLifecycle() {
  await App.addListener('appStateChange', ({ isActive }) => {
    const auth = useAuthStore()
    const badges = useBadgesStore()
    if (isActive) {
      void auth.refresh({ maxAgeMs: PRINCIPAL_MAX_AGE_MS })
      if (auth.isAuthenticated) badges.start()
    } else {
      badges.stop()
    }
  })
}
