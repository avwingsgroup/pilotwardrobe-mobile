import { useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Permission } from '@/types'
import { useFeedback } from './useFeedback'

/**
 * Gate an action (favourite, offer, buy, sell) behind sign-in, a permission or KYC.
 * Guests are sent to the email-first screen and returned here afterwards (`next`).
 * The server is still the authority — this only avoids dead-end taps.
 */
export function useAuthGate() {
  const auth = useAuthStore()
  const router = useIonRouter()
  const route = useRoute()
  const { toast } = useFeedback()

  function requireAuth(next = route.fullPath): boolean {
    if (auth.hasSession) return true
    router.push(`/auth?next=${encodeURIComponent(next)}`)
    return false
  }

  function requirePermission(permission: Permission, next = route.fullPath): boolean {
    if (!requireAuth(next)) return false
    if (auth.can(permission)) return true
    void toast("Your account can't do that yet.", 'danger')
    return false
  }

  function requireKyc(next = route.fullPath): boolean {
    if (!requireAuth(next)) return false
    if (auth.kycApproved) return true
    router.push(`/verification?next=${encodeURIComponent(next)}`)
    return false
  }

  return { requireAuth, requirePermission, requireKyc }
}
