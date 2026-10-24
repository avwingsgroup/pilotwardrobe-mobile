/**
 * The backend (notification `link`/`actions[].to`, e-mail links, push payloads,
 * payment return URLs) speaks WEB paths — /hangar/orders/ord_1, /marketplace/slug.
 * This maps them onto the app's routes. Pure function: no router access, so it is
 * unit-tested and shared by deep links, push taps and the notification centre.
 *
 * Returns null when the path has no app equivalent; callers fall back to home.
 */
const ID = '([A-Za-z0-9_-]+)'
const SLUG = '([A-Za-z0-9_.-]+)'

type Rule = [RegExp, (m: RegExpMatchArray, q: URLSearchParams) => string | null]

const keep = (q: URLSearchParams, ...names: string[]) => {
  const out = new URLSearchParams()
  for (const name of names) {
    const value = q.get(name)
    if (value) out.set(name, value)
  }
  const s = out.toString()
  return s ? `?${s}` : ''
}

const RULES: Rule[] = [
  [/^\/?$/, () => '/tabs/home'],
  [/^\/marketplace\/?$/, (_, q) => `/tabs/search/results${keep(q, 'search', 'category', 'condition', 'sort')}`],
  [new RegExp(`^/(?:marketplace|listing)/${SLUG}$`), (m) => `/listing/${m[1]}`],
  [new RegExp(`^/category/${SLUG}$`), (m) => `/tabs/search/results?category=${encodeURIComponent(m[1]!)}`],
  [new RegExp(`^/(?:seller|photographers)/${SLUG}$`), (m) => `/seller/${m[1]}`],
  [new RegExp(`^/swap/${SLUG}$`), (m) => `/swap/${m[1]}`],
  [/^\/messages\/?$/, () => '/tabs/inbox'],
  [new RegExp(`^/messages/${ID}$`), (m) => `/conversations/${m[1]}`],
  [/^\/notifications\/?$/, () => '/notifications'],
  [new RegExp(`^/orders/${ID}/confirmed$`), (m) => `/orders/${m[1]}/confirmed`],
  [/^\/payment\/callback\/?$/, (_, q) => (q.get('reference') ? `/payment/${encodeURIComponent(q.get('reference')!)}` : null)],
  [/^\/checkout\/?$/, (_, q) => `/checkout${keep(q, 'listing', 'size', 'offer')}`],
  [/^\/sell\/?$/, () => '/sell'],
  [/^\/hangar\/?$/, () => '/tabs/profile/hangar'],
  [/^\/hangar\/listings\/?$/, () => '/tabs/profile/hangar'],
  [/^\/hangar\/listings\/new$/, () => '/sell'],
  [new RegExp(`^/hangar/listings/${ID}/edit$`), (m) => `/sell/${m[1]}`],
  [/^\/hangar\/orders\/?$/, (_, q) => `/orders${keep(q, 'role')}`],
  [new RegExp(`^/hangar/orders/${ID}$`), (m, q) => (q.get('confirm') ? `/orders/${m[1]}/landed` : `/orders/${m[1]}`)],
  [/^\/hangar\/offers\/?$/, (_, q) => `/tabs/inbox/offers${q.get('tab') === 'swaps' ? '?tab=swaps' : ''}`],
  [/^\/hangar\/wallet\/?$/, () => '/wallet'],
  [/^\/hangar\/reviews\/?$/, () => '/reviews'],
  [/^\/hangar\/disputes\/?$/, () => '/disputes'],
  [/^\/hangar\/disputes\/new$/, (_, q) => `/disputes/new${keep(q, 'order')}`],
  [new RegExp(`^/hangar/disputes/${ID}$`), (m) => `/disputes/${m[1]}`],
  [/^\/hangar\/fit-kit\/?$/, () => '/settings/fit-kit'],
  [/^\/hangar\/verification\/?$/, () => '/verification'],
  [/^\/hangar\/(?:aviator|settings)(?:\/.*)?$/, (m) => (m[0].includes('security') ? '/settings/security' : '/settings')],
  [/^\/hangar\/addresses\/?$/, () => '/settings/addresses'],
  [/^\/hangar\/favorites\/?$/, () => '/favorites'],
  [/^\/auth\/reset\/?$/, (_, q) => `/auth/reset${keep(q, 'token', 'email')}`],
  [/^\/reset-password\/?$/, (_, q) => `/auth/reset${keep(q, 'token', 'email')}`],
  [/^\/auth\/verify\/?$/, (_, q) => `/auth/verify${keep(q, 'email')}`],
  [/^\/auth\/login\/?$/, () => '/auth/login'],
  [/^\/(terms|privacy|cookies|returns|escrow-disputes|seller-fees|about)\/?$/, (m) => `/pages/${m[1]}`],
  [/^\/(contact|help)\/?$/, () => '/support/contact'],
]

/** Map a web path (optionally with query) to an app route, or null. */
export function webPathToAppRoute(pathWithQuery: string): string | null {
  if (typeof pathWithQuery !== 'string' || !pathWithQuery.startsWith('/') || pathWithQuery.startsWith('//')) return null
  let url: URL
  try {
    url = new URL(pathWithQuery, 'https://pilotwardrobe.invalid')
  } catch {
    return null
  }
  if (url.origin !== 'https://pilotwardrobe.invalid') return null
  const path = url.pathname.replace(/\/+$/, '') || '/'
  for (const [pattern, build] of RULES) {
    const match = path.match(pattern)
    if (match) return build(match, url.searchParams)
  }
  return null
}

/**
 * Map an incoming deep/universal link URL to an app route. Accepts the custom
 * scheme (pilotwardrobe://hangar/orders/ord_1) and https links on the web app host.
 */
export function deepLinkToAppRoute(rawUrl: string, webAppUrl: string): string | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  if (url.protocol === 'pilotwardrobe:') {
    // pilotwardrobe://hangar/orders/1 → host "hangar", pathname "/orders/1"
    const path = `/${url.host}${url.pathname}`.replace(/\/{2,}/g, '/')
    return webPathToAppRoute(path + url.search)
  }

  let webHost: string
  try {
    webHost = new URL(webAppUrl).host
  } catch {
    return null
  }
  if ((url.protocol === 'https:' || url.protocol === 'http:') && url.host === webHost) {
    return webPathToAppRoute(url.pathname + url.search)
  }
  return null
}
