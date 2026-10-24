import { describe, expect, it } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import { decideNavigation } from '@/router/guards'
import type { AuthUser } from '@/types'

const route = (path: string, meta: Record<string, unknown> = {}, query: Record<string, string> = {}) =>
  ({ path, fullPath: path, meta, query }) as unknown as RouteLocationNormalized

const user = (over: Partial<AuthUser> = {}): AuthUser =>
  ({
    id: 'usr_1',
    email: 'a@b.c',
    permissions: ['orders.create'],
    verification: { email: true, identity: false, aviator: false, kycStatus: 'not_started' },
    ...over,
  }) as AuthUser

describe('decideNavigation', () => {
  it('sends first-time guests to onboarding', () => {
    expect(decideNavigation(route('/tabs/home'), { hasSession: false, user: null, onboarded: false })).toMatchObject({ path: '/onboarding' })
  })

  it('requires a session for protected routes and preserves the target', () => {
    expect(decideNavigation(route('/orders', { auth: true }), { hasSession: false, user: null, onboarded: true })).toEqual({
      path: '/auth',
      query: { next: '/orders' },
    })
  })

  it('keeps signed-in users out of guest-only screens', () => {
    expect(decideNavigation(route('/auth/login', { guestOnly: true }, { next: '/wallet' }), { hasSession: true, user: user(), onboarded: true })).toBe('/wallet')
  })

  it('routes unverified e-mails to verification for transactional flows', () => {
    const result = decideNavigation(route('/checkout', { auth: true, verified: true }), {
      hasSession: true,
      user: user({ verification: { email: false, identity: false, aviator: false, kycStatus: 'not_started' } }),
      onboarded: true,
    })
    expect(result).toMatchObject({ path: '/auth/verify' })
  })

  it('blocks routes that need a permission the user lacks', () => {
    expect(decideNavigation(route('/sell', { auth: true, permission: 'listings.create' }), { hasSession: true, user: user(), onboarded: true })).toEqual({
      path: '/tabs/home',
    })
    expect(decideNavigation(route('/checkout', { auth: true, permission: 'orders.create' }), { hasSession: true, user: user(), onboarded: true })).toBe(true)
  })
})
