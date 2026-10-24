import { useIonRouter } from '@ionic/vue'
import { ref } from 'vue'
import { paymentsApi } from '@/api/payments'
import { appConfig } from '@/config/env'
import { track } from '@/services/analytics'
import { openHostedCheckout } from '@/services/checkoutBrowser'
import type { PaymentGateway } from '@/types'
import { uuid } from '@/utils/id'

/**
 * Starts a gateway payment for an order or a listing promotion (contract §4.3):
 *  1. POST /payments/initialize (Idempotency-Key, reused for every retry of THIS attempt)
 *  2. open the gateway's hosted page in the in-app browser (allow-listed hosts only)
 *  3. hand over to /payment/{reference}, which polls GET /payments/{reference}
 * The app never treats a redirect or browser close as success.
 *
 * `return_url` must be on the web app host (backend PaymentService::assertSafeReturnUrl);
 * with universal / app links configured that URL re-opens the app.
 */
export function usePaymentFlow() {
  const router = useIonRouter()
  const starting = ref(false)
  /** One key per payable+gateway so a double tap or retry can't create two payments. */
  const keys = new Map<string, string>()

  async function start(payable: { orderId?: string; promotionId?: string }, gateway: PaymentGateway, after?: string) {
    if (starting.value) return
    starting.value = true
    const keyName = `${payable.orderId ?? payable.promotionId}|${gateway}`
    if (!keys.has(keyName)) keys.set(keyName, uuid())
    try {
      track({ name: 'payment_gateway_selected', params: { gateway } })
      const init = await paymentsApi.initialize(
        { ...payable, gateway, returnUrl: `${appConfig.webAppUrl}/payment/callback` },
        { idempotencyKey: keys.get(keyName) },
      )
      const query = new URLSearchParams()
      if (after) query.set('after', after)
      if (init.gateway === 'sandbox') {
        // Non-production sandbox (backend D15): the outcome is chosen in-app.
        if (!appConfig.allowSandboxPayments) throw new Error('Sandbox payments are disabled in this build.')
        query.set('sandbox', '1')
        router.navigate(`/payment/${encodeURIComponent(init.reference)}?${query}`, 'forward', 'replace')
        return
      }
      await openHostedCheckout(init.authorizationUrl, () => {
        // Browser closed: the status page re-checks immediately.
      })
      router.navigate(`/payment/${encodeURIComponent(init.reference)}?${query}`, 'forward', 'replace')
    } finally {
      starting.value = false
    }
  }

  return { start, starting }
}
