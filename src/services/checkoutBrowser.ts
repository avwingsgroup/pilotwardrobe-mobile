import { Browser } from '@capacitor/browser'
import { isAllowedExternalUrl, PAYMENT_GATEWAY_HOSTS } from '@/utils/security'

/**
 * Opens a gateway's hosted payment page in the system in-app browser
 * (SFSafariViewController / Chrome Custom Tabs) — card data never touches the app.
 *
 * The result is NOT taken from the browser: whatever the gateway redirect says,
 * the app polls GET /payments/{reference} for the server-verified status.
 */
export class UnsafeGatewayUrlError extends Error {
  constructor() {
    super("We couldn't open the payment page safely. Please try another payment method.")
    this.name = 'UnsafeGatewayUrlError'
  }
}

export async function openHostedCheckout(authorizationUrl: string, onClosed: () => void): Promise<() => void> {
  if (!isAllowedExternalUrl(authorizationUrl, PAYMENT_GATEWAY_HOSTS)) throw new UnsafeGatewayUrlError()
  const handle = await Browser.addListener('browserFinished', () => onClosed())
  await Browser.open({ url: authorizationUrl, presentationStyle: 'fullscreen', toolbarColor: '#16386e' })
  return () => void handle.remove()
}

/** Close the in-app browser when the return deep link brings the user back. */
export async function closeHostedCheckout() {
  try {
    await Browser.close()
  } catch {
    // Not open / not supported (Android closes itself on redirect).
  }
}

/** Open an external informational URL (tracking pages, PDFs) in the in-app browser. */
export async function openExternal(url: string) {
  if (!/^https:\/\//i.test(url)) return
  await Browser.open({ url })
}
