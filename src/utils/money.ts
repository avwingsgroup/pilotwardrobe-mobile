import type { CurrencyCode, Money } from '@/types/api'

/**
 * Money is integer minor units end to end (contract §1.6). These helpers are the only
 * place amounts are formatted or converted — screens never format money themselves.
 */
const EXPONENT: Record<CurrencyCode, number> = { USD: 2, NGN: 2, GHS: 2, GBP: 2, EUR: 2 }

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = { USD: '$', NGN: '₦', GHS: '₵', GBP: '£', EUR: '€' }

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(currency: string, locale: string, whole: boolean) {
  const key = `${currency}|${locale}|${whole}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: whole ? 0 : undefined,
      maximumFractionDigits: whole ? 0 : undefined,
    })
    formatters.set(key, f)
  }
  return f
}

export const exponentOf = (currency: CurrencyCode) => EXPONENT[currency] ?? 2

export const toMajor = (amount: number, currency: CurrencyCode = 'USD') => amount / 10 ** exponentOf(currency)

/** "745.5" → 74550. String arithmetic, so no float drift. */
export function toMinor(value: string | number, currency: CurrencyCode = 'USD'): number {
  const text = String(value).replace(/[^0-9.-]/g, '')
  if (!text || text === '-' || text === '.') return 0
  const [whole = '0', fraction = ''] = text.split('.')
  const exp = exponentOf(currency)
  const frac = (fraction + '0'.repeat(exp)).slice(0, exp)
  const sign = whole.startsWith('-') ? -1 : 1
  return sign * (Math.abs(parseInt(whole || '0', 10)) * 10 ** exp + parseInt(frac || '0', 10))
}

export interface FormatOptions {
  locale?: string
  /** "$745" instead of "$745.00". */
  whole?: boolean
  /** Use the server's locale-aware `formatted` string when present (default true). */
  preferServer?: boolean
}

export function formatMoney(money: Money | null | undefined, opts: FormatOptions = {}): string {
  if (!money) return '—'
  const { locale = 'en-US', whole = false, preferServer = true } = opts
  if (preferServer && !whole && money.formatted) return money.formatted
  return formatter(money.currency, locale, whole).format(toMajor(money.amount, money.currency))
}

/** Ledger style: +$133.40 / −$1,200.00 */
export function formatSigned(money: Money, direction: 'credit' | 'debit') {
  return `${direction === 'credit' ? '+' : '−'}${formatMoney({ ...money, amount: Math.abs(money.amount), formatted: undefined })}`
}

export const money = (amount: number, currency: CurrencyCode = 'USD'): Money => ({ amount, currency })

/** Percentage of `offer` below `price`, one decimal (T1 "7.7% below asking"). */
export function percentBelow(price: Money, offer: Money): number {
  if (!price.amount) return 0
  return Math.round(((price.amount - offer.amount) / price.amount) * 1000) / 10
}

/** Value of user-typed major-unit input as display text for an editable field. */
export function majorInput(amount: number | null | undefined, currency: CurrencyCode = 'USD'): string {
  if (amount === null || amount === undefined) return ''
  const major = toMajor(amount, currency)
  return Number.isInteger(major) ? String(major) : major.toFixed(exponentOf(currency))
}
