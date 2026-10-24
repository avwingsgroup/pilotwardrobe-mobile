<template>
  <ion-page>
    <ion-content class="pw-content-plain">
      <div class="pay pw-container">
        <!-- Pending / processing -->
        <template v-if="!payment || isOpen">
          <SuccessHero
            v-if="!timedOut"
            tone="pending"
            :icon="hourglassOutline"
            title="Confirming your payment"
            message="We're checking with the payment provider. This usually takes a few seconds — please don't pay again."
          >
            <template #icon><ion-spinner name="crescent" class="spin" /></template>
          </SuccessHero>
          <SuccessHero
            v-else
            tone="pending"
            :icon="timeOutline"
            title="Still confirming"
            message="Your provider hasn't confirmed yet. We'll notify you as soon as it does — there's no need to pay again."
          />

          <section v-if="sandbox && payment && isOpen" class="pw-card pw-stack-sm sandbox">
            <p class="pw-eyebrow">Sandbox gateway · test builds only</p>
            <p class="pw-muted small">Choose the outcome the test gateway should report. The result is still verified by the server.</p>
            <div class="sandbox__btns">
              <ion-button :disabled="acting" @click="sandboxOutcome('approve')">Approve</ion-button>
              <ion-button fill="outline" color="danger" :disabled="acting" @click="sandboxOutcome('decline')">Decline</ion-button>
              <ion-button fill="outline" color="medium" :disabled="acting" @click="sandboxOutcome('cancel')">Cancel</ion-button>
            </div>
          </section>
          <p v-if="pollError" class="pw-callout pw-callout--muted">{{ pollError }}</p>
        </template>

        <!-- Failed / cancelled / expired -->
        <template v-else-if="payment.status !== 'successful'">
          <SuccessHero
            tone="danger"
            :icon="closeOutline"
            :title="payment.status === 'cancelled' ? 'Payment cancelled' : payment.status === 'expired' ? 'Payment expired' : 'Payment didn’t go through'"
            :message="payment.failureReason ?? 'No money was taken. You can try again or choose another payment method.'"
          />
        </template>
      </div>
    </ion-content>

    <ion-footer class="pw-footer-bar">
      <ion-toolbar>
        <template v-if="payment && !isOpen && payment.status !== 'successful'">
          <ion-button v-if="payment.orderId" expand="block" class="pw-btn-lg" :router-link="`/orders/${payment.orderId}`" router-direction="root">
            Try again from the order
          </ion-button>
          <ion-button expand="block" fill="clear" color="medium" router-link="/tabs/home" router-direction="root">Back to marketplace</ion-button>
        </template>
        <template v-else-if="timedOut">
          <ion-button expand="block" class="pw-btn-lg" :disabled="checking" @click="checkNow">Check again</ion-button>
          <ion-button v-if="payment?.orderId" expand="block" fill="clear" :router-link="`/orders/${payment.orderId}`" router-direction="root">View order</ion-button>
        </template>
        <ion-button v-else expand="block" fill="outline" class="pw-btn-lg" :disabled="checking" @click="checkNow">
          {{ checking ? 'Checking…' : 'Check status' }}
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonPage, IonSpinner, IonToolbar, onIonViewDidEnter, onIonViewWillLeave, useIonRouter } from '@ionic/vue'
import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { closeOutline, hourglassOutline, timeOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { errorMessage } from '@/api/errors'
import { paymentsApi } from '@/api/payments'
import SuccessHero from '@/components/SuccessHero.vue'
import { appConfig } from '@/config/env'
import { track } from '@/services/analytics'
import { closeHostedCheckout } from '@/services/checkoutBrowser'
import { TERMINAL_PAYMENT_STATUSES, type Payment, type SandboxOutcome } from '@/types'
import { safeRedirect } from '@/utils/security'

/**
 * Server-verified payment result (handoff §7.2). Polls GET /payments/{reference}
 * with backoff (1.5 s → 8 s, ~60 s budget); the backend verifies with the gateway
 * when the webhook hasn't arrived. Re-checks when the app returns to the foreground.
 */
const route = useRoute()
const router = useIonRouter()
const reference = String(route.params.reference)
const sandbox = route.query.sandbox === '1' && appConfig.allowSandboxPayments
const after = route.query.after ? safeRedirect(route.query.after, '') : ''

const payment = ref<Payment | null>(null)
const pollError = ref<string | null>(null)
const timedOut = ref(false)
const checking = ref(false)
const acting = ref(false)
const isOpen = computed(() => !payment.value || !TERMINAL_PAYMENT_STATUSES.includes(payment.value.status))

let timer: ReturnType<typeof setTimeout> | null = null
let startedAt = Date.now()
let delay = 1500
let resumeHandle: PluginListenerHandle | null = null
const BUDGET_MS = 60_000

async function check(): Promise<void> {
  checking.value = true
  try {
    payment.value = await paymentsApi.verify(reference)
    pollError.value = null
    if (!isOpen.value) onTerminal()
  } catch (e) {
    pollError.value = errorMessage(e)
  } finally {
    checking.value = false
  }
}

function schedule() {
  if (timer) clearTimeout(timer)
  if (!isOpen.value) return
  if (Date.now() - startedAt > BUDGET_MS && !sandbox) {
    timedOut.value = true
    return
  }
  timer = setTimeout(async () => {
    await check()
    delay = Math.min(8000, Math.round(delay * 1.6))
    schedule()
  }, delay)
}

function restartPolling() {
  startedAt = Date.now()
  delay = 1500
  timedOut.value = false
  void check().then(schedule)
}

function onTerminal() {
  if (timer) clearTimeout(timer)
  const p = payment.value!
  if (p.status === 'successful') {
    if (p.orderId) track({ name: 'payment_completed', params: { order_id: p.orderId } })
    const target = after || (p.orderId ? `/orders/${p.orderId}/confirmed` : '/tabs/profile/hangar')
    router.navigate(target, 'root', 'replace')
  } else {
    track({ name: 'payment_failed', params: { order_id: p.orderId ?? undefined, status: p.status } })
  }
}

async function checkNow() {
  restartPolling()
}

async function sandboxOutcome(outcome: SandboxOutcome) {
  acting.value = true
  try {
    await paymentsApi.sandboxOutcome(reference, outcome)
  } catch (e) {
    pollError.value = errorMessage(e)
  } finally {
    acting.value = false
  }
  restartPolling()
}

onIonViewDidEnter(async () => {
  void closeHostedCheckout()
  restartPolling()
  resumeHandle = await App.addListener('resume', () => isOpen.value && restartPolling())
})

onIonViewWillLeave(() => {
  if (timer) clearTimeout(timer)
  void resumeHandle?.remove()
})
</script>

<style scoped>
.pay {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-6);
  padding: calc(var(--ion-safe-area-top, 0px) + 56px) var(--pw-gutter) var(--pw-space-6);
}

.spin {
  width: 48px;
  height: 48px;
  color: #fff;
}

.small {
  font-size: var(--pw-text-sm);
}

.sandbox {
  border-style: dashed;
}

.sandbox__btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sandbox__btns ion-button {
  flex: 1 1 auto;
  margin: 0;
}
</style>
