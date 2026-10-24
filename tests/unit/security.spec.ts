import { describe, expect, it } from 'vitest'
import { initials, isAllowedExternalUrl, PAYMENT_GATEWAY_HOSTS, safeRedirect, sanitizeHtml } from '@/utils/security'

describe('safeRedirect', () => {
  it('keeps same-app paths', () => {
    expect(safeRedirect('/orders/ord_1?x=1')).toBe('/orders/ord_1?x=1')
  })

  it.each(['https://evil.tld', '//evil.tld', '/\\evil.tld', 'javascript:alert(1)', '/auth/login', 42, ''])('blocks %s', (target) => {
    expect(safeRedirect(target, '/home')).toBe('/home')
  })
})

describe('payment gateway allow-list', () => {
  it('allows only https gateway hosts', () => {
    expect(isAllowedExternalUrl('https://checkout.paystack.com/abc', PAYMENT_GATEWAY_HOSTS)).toBe(true)
    expect(isAllowedExternalUrl('https://www.sandbox.paypal.com/x', PAYMENT_GATEWAY_HOSTS)).toBe(true)
    expect(isAllowedExternalUrl('http://checkout.paystack.com/abc', PAYMENT_GATEWAY_HOSTS)).toBe(false)
    expect(isAllowedExternalUrl('https://paystack.com.evil.io/abc', PAYMENT_GATEWAY_HOSTS)).toBe(false)
    expect(isAllowedExternalUrl('not a url', PAYMENT_GATEWAY_HOSTS)).toBe(false)
  })
})

describe('sanitizeHtml', () => {
  it('strips scripts, handlers and javascript links', () => {
    const out = sanitizeHtml(
      '<p onclick="x()">Hi<script>alert(1)</script></p><a href="javascript:x">bad</a><a href="https://ok.example">ok</a>',
    )
    expect(out).not.toContain('script')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('javascript:')
    expect(out).toContain('href="https://ok.example"')
  })
})

describe('initials', () => {
  it('builds avatar initials', () => {
    expect(initials('Nehemiah Okoye')).toBe('NO')
    expect(initials('')).toBe('?')
  })
})
