import { describe, expect, it } from 'vitest'
import { deepLinkToAppRoute, webPathToAppRoute } from '@/utils/routeMapping'

describe('webPathToAppRoute (notification links, push data, e-mail links)', () => {
  it.each([
    ['/hangar/orders/ord_4471', '/orders/ord_4471'],
    ['/hangar/orders/ord_4471?confirm=1', '/orders/ord_4471/landed'],
    ['/hangar/offers?id=off_1', '/tabs/inbox/offers'],
    ['/hangar/offers?tab=swaps', '/tabs/inbox/offers?tab=swaps'],
    ['/marketplace/bose-a20', '/listing/bose-a20'],
    ['/messages/cnv_1', '/conversations/cnv_1'],
    ['/hangar/disputes/dsp_1', '/disputes/dsp_1'],
    ['/hangar/wallet', '/wallet'],
    ['/hangar/verification', '/verification'],
    ['/hangar/settings/security', '/settings/security'],
    ['/payment/callback?reference=PW-1&status=success', '/payment/PW-1'],
    ['/auth/reset?token=abc&email=a%40b.c', '/auth/reset?token=abc&email=a%40b.c'],
    ['/seller/nehemiah_o', '/seller/nehemiah_o'],
    ['/photographers/tk', '/seller/tk'],
    ['/category/headsets', '/tabs/search/results?category=headsets'],
    ['/terms', '/pages/terms'],
  ])('%s → %s', (input, expected) => {
    expect(webPathToAppRoute(input)).toBe(expected)
  })

  it('drops gateway-supplied query params such as status=success', () => {
    expect(webPathToAppRoute('/payment/callback?reference=R1&status=success')).not.toContain('status')
  })

  it('rejects external, protocol-relative and unknown targets', () => {
    expect(webPathToAppRoute('https://evil.example/hangar')).toBeNull()
    expect(webPathToAppRoute('//evil.example/x')).toBeNull()
    expect(webPathToAppRoute('/unknown/place')).toBeNull()
  })
})

describe('deepLinkToAppRoute', () => {
  const web = 'https://pilotwardrobe.com'

  it('handles universal links on the web host only', () => {
    expect(deepLinkToAppRoute('https://pilotwardrobe.com/hangar/orders/ord_1', web)).toBe('/orders/ord_1')
    expect(deepLinkToAppRoute('https://pilotwardrobe.com.evil.io/hangar/orders/ord_1', web)).toBeNull()
  })

  it('handles the custom scheme', () => {
    expect(deepLinkToAppRoute('pilotwardrobe://hangar/orders/ord_9', web)).toBe('/orders/ord_9')
    expect(deepLinkToAppRoute('pilotwardrobe://payment/callback?reference=PW-2', web)).toBe('/payment/PW-2')
  })
})
