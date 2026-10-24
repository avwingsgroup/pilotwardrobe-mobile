import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api/auth'
import { resetUnauthenticatedLatch } from '@/api/client'
import { ApiError } from '@/api/errors'
import { tokenStore } from '@/api/token'
import type { AuthUser, LoginPayload, Permission, RegisterPayload, TwoFactorMethod, TwoFactorPayload } from '@/types'

type AuthStatus = 'unknown' | 'authenticated' | 'guest'

export interface PendingChallenge {
  challengeId: string
  methods: TwoFactorMethod[]
  smsHint?: string | null
  remember: boolean
}

/** Callbacks that clear other user-scoped state on sign-out (registered in main.ts). */
const signOutHooks = new Set<() => void | Promise<void>>()
export function onSignOut(hook: () => void | Promise<void>) {
  signOutHooks.add(hook)
}

/** Callbacks that need the still-valid token during a voluntary logout (push device cleanup). */
const beforeLogoutHooks = new Set<() => Promise<void>>()
export function beforeLogout(hook: () => Promise<void>) {
  beforeLogoutHooks.add(hook)
}

/** Callbacks run after any successful sign-in (push registration, badge polling). */
const signInHooks = new Set<() => void | Promise<void>>()
export function onSignIn(hook: () => void | Promise<void>) {
  signInHooks.add(hook)
}

function runSignInHooks() {
  for (const hook of signInHooks) {
    try {
      void hook()
    } catch {
      // never block sign-in
    }
  }
}

/**
 * Session principal. `/auth/me` is the single source of truth for the user, role,
 * effective permissions and verification state (handoff §2.3). Client guards built
 * on this only shape UX — every endpoint re-authorises server-side.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const status = ref<AuthStatus>('unknown')
  const challenge = ref<PendingChallenge | null>(null)
  /** E-mail awaiting OTP verification (A2a). Memory only. */
  const pendingEmail = ref<string | null>(null)
  let lastFetchedAt = 0

  const isAuthenticated = computed(() => status.value === 'authenticated' && !!user.value)
  const emailVerified = computed(() => !!user.value?.verification.email)
  const kycStatus = computed(() => user.value?.verification.kycStatus ?? 'not_started')
  const kycApproved = computed(() => kycStatus.value === 'approved')
  const counters = computed(() => user.value?.counters)

  function can(permission: Permission | Permission[]): boolean {
    const held = user.value?.permissions ?? []
    const needed = Array.isArray(permission) ? permission : [permission]
    return needed.every((p) => held.includes(p))
  }

  function setUser(next: AuthUser) {
    const wasSignedIn = status.value === 'authenticated'
    user.value = next
    status.value = 'authenticated'
    lastFetchedAt = Date.now()
    resetUnauthenticatedLatch()
    if (!wasSignedIn) runSignInHooks()
  }

  async function clearLocal() {
    user.value = null
    status.value = 'guest'
    challenge.value = null
    await tokenStore.clear()
    for (const hook of signOutHooks) {
      try {
        await hook()
      } catch {
        // A failing hook must not leave the session half cleared.
      }
    }
  }

  /** App start: restore the token from secure storage and validate it with /auth/me. */
  async function bootstrap() {
    const token = await tokenStore.restore()
    if (!token) {
      status.value = 'guest'
      return
    }
    try {
      setUser(await authApi.me())
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearLocal()
      }
      // Offline / server unreachable: keep the token and stay 'unknown'. Guards let a
      // token-holder through; screens show offline states and `refresh()` runs on reconnect.
    }
  }

  /** True when a token is held even though /auth/me has not confirmed it yet. */
  const hasSession = computed(() => isAuthenticated.value || (status.value === 'unknown' && !!tokenStore.current()))

  /** Re-read the principal (after role/KYC changes, on resume). */
  async function refresh(options: { maxAgeMs?: number } = {}) {
    if (!tokenStore.current()) return
    if (options.maxAgeMs && Date.now() - lastFetchedAt < options.maxAgeMs) return
    try {
      setUser(await authApi.me())
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) await clearLocal()
    }
  }

  async function finishSignIn(next: { user: AuthUser; accessToken?: string; expiresIn?: number }) {
    if (next.accessToken) await tokenStore.save(next.accessToken, next.expiresIn)
    challenge.value = null
    // /auth/me after every auth transition (contract §4.1).
    try {
      setUser(await authApi.me())
    } catch {
      setUser(next.user)
    }
  }

  /** Returns 'authenticated' or 'two_factor_required'. */
  async function login(payload: LoginPayload): Promise<'authenticated' | 'two_factor_required'> {
    const result = await authApi.login(payload)
    if (result.status === 'two_factor_required') {
      challenge.value = { challengeId: result.challengeId, methods: result.methods, smsHint: result.smsHint, remember: payload.remember }
      return 'two_factor_required'
    }
    await finishSignIn(result)
    return 'authenticated'
  }

  async function completeTwoFactor(payload: Omit<TwoFactorPayload, 'challengeId'>) {
    if (!challenge.value) throw new ApiError({ message: 'Your sign-in expired. Please log in again.', status: 419, code: 'SESSION_EXPIRED' })
    const result = await authApi.twoFactor({ ...payload, challengeId: challenge.value.challengeId })
    await finishSignIn(result)
  }

  async function register(payload: RegisterPayload) {
    const envelope = await authApi.register(payload)
    const { user: created, accessToken, expiresIn } = envelope.data
    if (accessToken) await tokenStore.save(accessToken, expiresIn)
    setUser(created)
    pendingEmail.value = created.email
    return envelope
  }

  async function verifyEmail(email: string, code: string) {
    const verified = await authApi.verifyEmail(email, code)
    if (tokenStore.current()) {
      await refresh()
    } else {
      user.value = verified
    }
    pendingEmail.value = null
  }

  /** User-initiated sign-out. Server revocation is best-effort; local state always clears. */
  async function logout() {
    for (const hook of beforeLogoutHooks) {
      try {
        await hook()
      } catch {
        // best effort
      }
    }
    try {
      if (tokenStore.current()) await authApi.logout()
    } catch {
      // Already expired / offline — clearing locally is what matters.
    }
    await clearLocal()
  }

  /** Forced sign-out after a 401 from any endpoint (token expired or revoked). */
  async function handleUnauthenticated() {
    if (status.value === 'guest' && !user.value) return
    await clearLocal()
  }

  return {
    user,
    status,
    challenge,
    pendingEmail,
    isAuthenticated,
    hasSession,
    emailVerified,
    kycStatus,
    kycApproved,
    counters,
    can,
    setUser,
    bootstrap,
    refresh,
    login,
    completeTwoFactor,
    register,
    verifyEmail,
    logout,
    handleUnauthenticated,
  }
})
