/**
 * Dates arrive as ISO-8601 UTC and render in the viewer's time zone via Intl.
 * Relative labels are computed here — the backend never sends them (handoff §4).
 */
const cache = new Map<string, Intl.DateTimeFormat>()

function fmt(options: Intl.DateTimeFormatOptions, locale = 'en-US') {
  const key = locale + JSON.stringify(options)
  let f = cache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options)
    cache.set(key, f)
  }
  return f
}

const toDate = (value: string | Date) => (value instanceof Date ? value : new Date(value))

/** "Jul 28" */
export const formatShortDate = (value: string | Date) => fmt({ month: 'short', day: 'numeric' }).format(toDate(value))

/** "Mon, Jul 27" */
export const formatDayDate = (value: string | Date) =>
  fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(toDate(value))

/** "2024" */
export const formatYear = (value: string | Date) => fmt({ year: 'numeric' }).format(toDate(value))

/** "Jul 26, 14:32" */
export const formatDateTime = (value: string | Date) =>
  fmt({ month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(toDate(value))

/** "09:41" */
export const formatTime = (value: string | Date) => fmt({ hour: '2-digit', minute: '2-digit', hour12: false }).format(toDate(value))

/** "12m", "3h", "Tue", else "Jul 26" — inbox timestamps (M1). */
export function timeAgoShort(value: string | Date, now = new Date()): string {
  const date = toDate(value)
  const diff = (now.getTime() - date.getTime()) / 1000
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 7) return fmt({ weekday: 'short' }).format(date)
  return formatShortDate(date)
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "12 min ago", "3 hours ago" (M3). */
export function timeAgo(value: string | Date, now = new Date()): string {
  const seconds = Math.round((toDate(value).getTime() - now.getTime()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return 'just now'
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), 'day')
  return formatShortDate(value)
}

/** "47h 12m" until a future instant; "expired" once passed (T3, T5 countdowns). */
export function countdown(value: string | Date, now = new Date()): string {
  const diff = Math.floor((toDate(value).getTime() - now.getTime()) / 1000)
  if (diff <= 0) return 'expired'
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h`
  return h > 0 ? `${h}h ${m}m` : `${Math.max(1, m)}m`
}

export function dateRangeLabel(from: string, to: string) {
  return `${formatDayDate(from)} – ${formatDayDate(to)}`
}

/** Notification grouping (M3: TODAY / YESTERDAY / EARLIER). */
export function dayBucket(value: string, now = new Date()): 'today' | 'yesterday' | 'earlier' {
  const d = toDate(value)
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (d.getTime() >= startToday) return 'today'
  if (d.getTime() >= startToday - 86_400_000) return 'yesterday'
  return 'earlier'
}

/** Chat day separators: "TODAY · 09:12". */
export function chatDayLabel(value: string, now = new Date()): string {
  const bucket = dayBucket(value, now)
  if (bucket === 'today') return `Today · ${formatTime(value)}`
  if (bucket === 'yesterday') return `Yesterday · ${formatTime(value)}`
  return formatDateTime(value)
}
