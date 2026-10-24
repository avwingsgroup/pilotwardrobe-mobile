import { describe, expect, it } from 'vitest'
import { formatMoney, formatSigned, majorInput, percentBelow, toMinor } from '@/utils/money'

describe('money (integer minor units)', () => {
  it('parses typed amounts without float drift', () => {
    expect(toMinor('745.5')).toBe(74550)
    expect(toMinor('0.1')).toBe(10)
    expect(toMinor('19.999')).toBe(1999)
    expect(toMinor('')).toBe(0)
    expect(toMinor('1,234.56')).toBe(123456)
  })

  it('prefers the server formatted string', () => {
    expect(formatMoney({ amount: 74500, currency: 'USD', formatted: 'US$745.00' })).toBe('US$745.00')
    expect(formatMoney({ amount: 74500, currency: 'USD' })).toBe('$745.00')
    expect(formatMoney({ amount: 74500, currency: 'USD' }, { whole: true })).toBe('$745')
    expect(formatMoney(null)).toBe('—')
  })

  it('formats ledger credits and debits', () => {
    expect(formatSigned({ amount: 3990, currency: 'USD' }, 'credit')).toBe('+$39.90')
    expect(formatSigned({ amount: 50000, currency: 'USD' }, 'debit')).toBe('−$500.00')
  })

  it('computes percent below asking (T1)', () => {
    expect(percentBelow({ amount: 78000, currency: 'USD' }, { amount: 72000, currency: 'USD' })).toBe(7.7)
  })

  it('renders editable major values', () => {
    expect(majorInput(78000)).toBe('780')
    expect(majorInput(1250)).toBe('12.50')
    expect(majorInput(null)).toBe('')
  })
})
