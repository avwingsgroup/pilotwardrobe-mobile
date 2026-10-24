/**
 * Only same-app relative paths are honoured as post-login / deep-link targets.
 * Blocks `?next=https://evil.tld`, `//evil.tld`, `/\evil.tld` and `javascript:`.
 */
export function safeRedirect(target: unknown, fallback = '/tabs/home'): string {
  if (typeof target !== 'string' || target.length === 0 || target.length > 2048) return fallback
  if (!target.startsWith('/')) return fallback
  if (target.startsWith('//') || target.startsWith('/\\')) return fallback
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(target)) return fallback
  try {
    const url = new URL(target, 'https://pilotwardrobe.invalid')
    if (url.origin !== 'https://pilotwardrobe.invalid') return fallback
    if (url.pathname.startsWith('/auth') || url.pathname === '/onboarding') return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}

/** Payment gateway hosts the app will open — identical to backend config platform.payments.redirect_hosts. */
export const PAYMENT_GATEWAY_HOSTS = ['checkout.stripe.com', 'paypal.com', 'checkout.paystack.com', 'flutterwave.com', 'monnify.com'] as const

/** https URL on one of the allow-listed hosts (or a subdomain of one). */
export function isAllowedExternalUrl(raw: string, allowedHosts: readonly string[]): boolean {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return false
    return allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

/** "Nehemiah Okoye" → "NO" */
export function initials(name: string | null | undefined): string {
  return (
    (name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

/**
 * Minimal allow-list sanitiser for CMS HTML (terms, privacy). The backend already
 * sanitises with symfony/html-sanitizer; this is defence in depth using the browser
 * parser — scripts, frames, forms, event handlers, styles and non-http(s) links go.
 */
const ALLOWED_TAGS = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'A', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'HR', 'SPAN', 'CODE',
])

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(...(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM'].includes(child.tagName) ? [] : Array.from(child.childNodes)))
        continue
      }
      for (const attr of Array.from(child.attributes)) {
        const keep = child.tagName === 'A' && attr.name === 'href' && /^(https?:|mailto:|tel:)/i.test(attr.value)
        if (!keep) child.removeAttribute(attr.name)
      }
      walk(child)
    }
  }
  walk(root)
  return root.innerHTML
}
