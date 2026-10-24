import { describe, expect, it } from 'vitest'
import { email, otp, passwordStrength, phone, runValidators, sameAs } from '@/utils/validators'

describe('validators', () => {
  it('scores passwords against the A1b rules', () => {
    expect(passwordStrength('Delta-Echo7').valid).toBe(true)
    expect(passwordStrength('short').score).toBeLessThan(4)
  })

  it('checks e-mail, phone (AddressRequest pattern) and OTP', () => {
    expect(email('pilot@example.com')).toBe(true)
    expect(email('nope')).not.toBe(true)
    expect(phone('+234 803 123 4567')).toBe(true)
    expect(phone('12')).not.toBe(true)
    expect(otp(4)('7374')).toBe(true)
    expect(otp(4)('737')).not.toBe(true)
  })

  it('returns the first failing message', () => {
    expect(runValidators('a', [sameAs(() => 'b', 'Mismatch')])).toBe('Mismatch')
    expect(runValidators('b', [sameAs(() => 'b')])).toBeNull()
  })
})
