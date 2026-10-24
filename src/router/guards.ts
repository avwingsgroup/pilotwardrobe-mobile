import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import type { AuthUser, Permission } from '@/types'
import { safeRedirect } from '@/utils/security'

export interface GuardState {
  hasSession: boolean
  user: AuthUser | null
  onboarded: boolean
}

/**
 * Pure navigation decision (unit-tested). Returns true to continue or a redirect.
 * UX only — the Laravel API enforces authentication and authorisation itself.
 */
export function decideNavigation(to: RouteLocationNormalized, state: GuardState): true | RouteLocationRaw {
  const { meta } = to

  if (!state.hasSession && !state.onboarded && to.path !== '/onboarding' && !to.path.startsWith('/auth') && !to.path.startsWith('/pages')) {
    return { path: '/onboarding', query: { next: to.fullPath } }
  }

  if (meta.guestOnly && state.hasSession) {
    return safeRedirect(to.query.next)
  }

  if (meta.auth && !state.hasSession) {
    return { path: '/auth', query: { next: to.fullPath } }
  }

  if (meta.verified && state.user && !state.user.verification.email) {
    return { path: '/auth/verify', query: { email: state.user.email, next: to.fullPath } }
  }

  if (meta.permission && state.user && !state.user.permissions.includes(meta.permission as Permission)) {
    return { path: '/tabs/home' }
  }

  return true
}
