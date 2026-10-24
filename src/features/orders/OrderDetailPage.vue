<template>
  <ion-page>
    <AppHeader :title="order ? `Order ${order.number}` : 'Order'" :subtitle="subtitle" default-href="/orders">
      <template v-if="order" #end><StatusBadge :tone="status.tone" :label="status.label" /></template>
    </AppHeader>

    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="detail.onRefresh"><ion-refresher-content /></ion-refresher>
      <div v-if="detail.loading.value && !order" class="pw-pad pw-stack">
        <ion-skeleton-text v-for="n in 3" :key="n" animated style="height: 120px; border-radius: 16px" />
      </div>
      <ErrorState v-else-if="detail.error.value && !order" :error="detail.error.value" @retry="detail.load" />

      <div v-else-if="order" class="pw-pad pw-stack pw-container">
        <ItemSummary
          v-for="item in order.items"
          :key="item.id"
          :title="item.title"
          :image="item.image"
          :subtitle="order.role === 'buyer' ? `Sold by ${order.seller.displayName}` : `Bought by ${order.buyer.displayName}`"
        >
          <p v-if="item.size" class="pw-muted small">Size {{ item.size }}</p>
          <template #aside><strong class="pw-price">{{ formatMoney(order.items.length === 1 ? order.totals.total : item.total) }}</strong></template>
        </ItemSummary>

        <section v-if="escrowBanner" class="escrow">
          <p class="escrow__title"><ion-icon :icon="shieldCheckmarkOutline" aria-hidden="true" /> {{ escrowBanner.title }}</p>
          <p class="escrow__text">{{ escrowBanner.text }}</p>
          <img :src="markWhite" alt="" aria-hidden="true" class="escrow__mark" />
        </section>

        <section class="pw-card">
          <TimelineSteps :steps="timeline" />
        </section>

        <section v-if="order.carrier" class="pw-card pw-stack-sm">
          <div class="pw-kv"><dt>Carrier</dt><dd>{{ order.carrier.name }}</dd></div>
          <div class="pw-kv"><dt>Tracking</dt><dd class="pw-mono">{{ order.carrier.trackingNumber }}</dd></div>
          <div v-if="order.estimatedDelivery" class="pw-kv"><dt>ETA</dt><dd>{{ dateRangeLabel(order.estimatedDelivery.from, order.estimatedDelivery.to) }}</dd></div>
        </section>

        <section class="pw-card">
          <dl>
            <div class="pw-kv"><dt>Items</dt><dd>{{ formatMoney(order.totals.items) }}</dd></div>
            <div class="pw-kv"><dt>Freight</dt><dd>{{ formatMoney(order.totals.freight) }}</dd></div>
            <div class="pw-kv"><dt>Buyer protection</dt><dd>{{ formatMoney(order.totals.buyerProtection) }}</dd></div>
            <div v-if="order.totals.duties" class="pw-kv"><dt>Duties</dt><dd>{{ formatMoney(order.totals.duties) }}</dd></div>
            <div v-if="order.totals.discount" class="pw-kv"><dt>Discount</dt><dd>−{{ formatMoney(order.totals.discount) }}</dd></div>
            <div class="pw-kv total"><dt>Total</dt><dd>{{ formatMoney(order.totals.total) }}</dd></div>
          </dl>
          <p v-if="order.payment?.methodLabel" class="pw-muted small">Paid with {{ order.payment.methodLabel }}</p>
          <p v-if="order.shippingAddress" class="pw-muted small">Ships to {{ order.shippingAddress.fullName }}, {{ order.shippingAddress.line1 }}, {{ order.shippingAddress.city }}</p>
        </section>

        <p v-if="actionError" class="pw-callout pw-callout--danger" role="alert">{{ actionError }}</p>
      </div>
    </ion-content>

    <ion-footer v-if="order && (primary || secondary.length)" class="pw-footer-bar">
      <ion-toolbar>
        <div class="actions">
          <ion-button v-for="a in secondary" :key="a.key" fill="outline" :color="a.color" class="pw-btn-lg" :disabled="busy" @click="a.run()">{{ a.label }}</ion-button>
          <ion-button v-if="primary" class="pw-btn-lg" :color="primary.color" :disabled="busy" @click="primary.run()">{{ primary.label }}</ion-button>
        </div>
        <ion-button v-if="can('open_dispute')" expand="block" fill="clear" color="danger" @click="router.push(`/disputes/new?order=${order.id}`)">Report a problem</ion-button>
        <ion-button v-else-if="order.disputeId" expand="block" fill="clear" @click="router.push(`/disputes/${order.disputeId}`)">View dispute</ion-button>
      </ion-toolbar>
    </ion-footer>

    <!-- Re-pay (pending_payment) -->
    <ion-modal class="pw-sheet" :is-open="payOpen" :initial-breakpoint="0.75" :breakpoints="[0, 0.75, 1]" @did-dismiss="payOpen = false">
      <ion-content class="pw-content-plain">
        <div class="pw-pad pw-stack">
          <h2 class="pw-title">Complete payment</h2>
          <GatewayPicker v-if="order" v-model="gateway" :currency="order.totals.total.currency" :country="order.shippingAddress?.countryCode" />
          <ion-button expand="block" class="pw-btn-lg" :disabled="!gateway || payment.starting.value" @click="pay">
            Pay {{ order ? formatMoney(order.totals.total) : '' }}
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>

    <!-- Dispatch (seller) -->
    <ion-modal class="pw-sheet" :is-open="dispatchOpen" :initial-breakpoint="0.8" :breakpoints="[0, 0.8, 1]" @did-dismiss="dispatchOpen = false">
      <ion-content class="pw-content-plain">
        <form class="pw-pad pw-stack" novalidate @submit.prevent="dispatch">
          <h2 class="pw-title">Mark as dispatched</h2>
          <TextField v-model="dispatchForm.values.carrier" label="Carrier" autocapitalize="words" placeholder="e.g. DHL Express" :error="dispatchForm.errors.carrier" />
          <TextField v-model="dispatchForm.values.trackingNumber" label="Tracking number" autocapitalize="characters" :error="dispatchForm.errors.trackingNumber" />
          <TextField v-model="dispatchForm.values.trackingUrl" label="Tracking link" hint="optional" type="url" inputmode="url" autocapitalize="off" :error="dispatchForm.errors.trackingUrl" />
          <p v-if="dispatchForm.formError.value" class="pw-callout pw-callout--danger">{{ dispatchForm.formError.value }}</p>
          <ion-button type="submit" expand="block" class="pw-btn-lg" :disabled="dispatchForm.submitting.value">Confirm wheels-up</ion-button>
        </form>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonToolbar,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue'
import { shieldCheckmarkOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import { toApiError } from '@/api/errors'
import { messagesApi } from '@/api/messages'
import { ordersApi } from '@/api/orders'
import markWhite from '@/assets/brand/logo-mark-white.png'
import AppHeader from '@/components/AppHeader.vue'
import ErrorState from '@/components/ErrorState.vue'
import ItemSummary from '@/components/ItemSummary.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TextField from '@/components/TextField.vue'
import TimelineSteps from '@/components/TimelineSteps.vue'
import type { TimelineStep } from '@/components/types'
import { ORDER_STATUS, PLATFORM, labelFor } from '@/constants/labels'
import { useAsync } from '@/composables/useAsync'
import { useFeedback } from '@/composables/useFeedback'
import { useForm } from '@/composables/useForm'
import { openExternal } from '@/services/checkoutBrowser'
import type { Order, OrderAction, PaymentGateway } from '@/types'
import { dateRangeLabel, formatDateTime, formatShortDate } from '@/utils/date'
import { formatMoney } from '@/utils/money'
import { required } from '@/utils/validators'
import GatewayPicker from '../checkout/GatewayPicker.vue'
import { usePaymentFlow } from '../checkout/usePaymentFlow'

/**
 * T4 — GET /orders/{id}. Status, escrow and the timeline are the backend's; every
 * button comes from `allowed_actions` for the viewer (buyer or seller).
 */
const route = useRoute()
const router = useIonRouter()
const { toast, confirm } = useFeedback()
const payment = usePaymentFlow()

const id = String(route.params.id)
const detail = useAsync<Order>(() => ordersApi.get(id))
const order = computed(() => detail.data.value)
onIonViewWillEnter(() => order.value && void detail.refresh())

const status = computed(() => (order.value ? { tone: labelFor(ORDER_STATUS, order.value.status).tone, label: order.value.statusLabel ?? labelFor(ORDER_STATUS, order.value.status).label } : { tone: 'neutral' as const, label: '' }))
const subtitle = computed(() => (order.value ? `Placed ${formatShortDate(order.value.placedAt)}${order.value.shipping ? ` · ${order.value.shipping.label}` : ''}` : undefined))
const can = (a: OrderAction) => !!order.value?.allowedActions.includes(a)

const escrowBanner = computed(() => {
  const o = order.value
  if (!o) return null
  const total = formatMoney(o.totals.total)
  switch (o.escrowStatus) {
    case 'held':
      return {
        title: `${total} held in escrow`,
        text:
          o.role === 'buyer'
            ? `Released to the seller only after you confirm arrival — or auto-released ${PLATFORM.inspectionHours}h after landing if no issue is raised.`
            : 'Released to your wallet when the buyer confirms arrival or the inspection window closes.',
      }
    case 'frozen':
      return { title: `${total} frozen`, text: 'A dispute is open. Funds stay in escrow until a mediator decides.' }
    case 'releasing':
    case 'released':
      return { title: 'Escrow released', text: o.role === 'buyer' ? 'The seller has been paid. Enjoy your gear, captain.' : 'Funds are on their way to your wallet.' }
    default:
      return null
  }
})

const timeline = computed<TimelineStep[]>(() =>
  (order.value?.tracking ?? []).map((t) => ({
    label: t.label,
    detail: [t.occurredAt ? formatDateTime(t.occurredAt) : null, t.detail].filter(Boolean).join(' · ') || null,
    state: t.state,
  })),
)

/* Actions */
const busy = ref(false)
const actionError = ref<string | null>(null)
const payOpen = ref(false)
const dispatchOpen = ref(false)
const gateway = ref<PaymentGateway | null>(null)

async function mutate(fn: () => Promise<{ data: Order; message?: string }>, fallback: string) {
  busy.value = true
  actionError.value = null
  try {
    const res = await fn()
    detail.data.value = res.data
    await toast(res.message ?? fallback, 'success')
  } catch (e) {
    const err = toApiError(e)
    actionError.value = err.message
    if (err.code === 'INVALID_STATE_TRANSITION') void detail.refresh()
  } finally {
    busy.value = false
  }
}

async function cancel() {
  const ok = await confirm({
    header: 'Cancel this order?',
    message: order.value?.escrowStatus === 'held' ? 'You’ll be refunded in full to your original payment method.' : 'The reservation will be released.',
    confirmText: 'Cancel order',
    cancelText: 'Keep order',
    destructive: true,
  })
  if (ok) await mutate(() => ordersApi.cancel(id), 'Order cancelled.')
}

async function message() {
  const listingId = order.value?.items[0]?.listingId
  if (!listingId) return
  try {
    const c = await messagesApi.start(listingId)
    router.push(`/conversations/${c.id}`)
  } catch (e) {
    actionError.value = toApiError(e).message
  }
}

async function markDelivered() {
  if (!(await confirm({ header: 'Mark as delivered?', message: 'Only do this once the carrier shows it delivered. The buyer’s inspection window starts now.', confirmText: 'Mark delivered' }))) return
  await mutate(async () => {
    await api.post(`/orders/${id}/tracking`, { status: 'delivered' })
    return { data: await ordersApi.get(id), message: 'Marked as delivered.' }
  }, 'Updated.')
}

async function pay() {
  if (!gateway.value) return
  payOpen.value = false
  try {
    await payment.start({ orderId: id }, gateway.value, `/orders/${id}/confirmed`)
  } catch (e) {
    actionError.value = toApiError(e).message
  }
}

const dispatchForm = useForm(
  { carrier: '', trackingNumber: '', trackingUrl: '' },
  { carrier: [required('Enter the carrier.')], trackingNumber: [required('Enter the tracking number.')] },
)
async function dispatch() {
  await dispatchForm.submit(async (v) => {
    const res = await ordersApi.dispatch(id, { carrier: v.carrier.trim(), trackingNumber: v.trackingNumber.trim(), trackingUrl: v.trackingUrl.trim() || null })
    detail.data.value = res.data
    dispatchOpen.value = false
    await toast(res.message ?? 'Marked as dispatched.', 'success')
  })
}

interface Btn {
  key: string
  label: string
  color?: string
  run: () => void
}

const primary = computed<Btn | null>(() => {
  const o = order.value
  if (!o) return null
  if (can('pay')) return { key: 'pay', label: `Pay ${formatMoney(o.totals.total)}`, run: () => (payOpen.value = true) }
  if (can('confirm_delivery')) return { key: 'confirm', label: 'Confirm arrival', color: 'success', run: () => router.push(`/orders/${id}/landed`) }
  if (can('mark_dispatched')) return { key: 'dispatch', label: 'Mark as dispatched', run: () => (dispatchOpen.value = true) }
  if (can('review')) return { key: 'review', label: 'Leave a review', run: () => router.push(`/orders/${id}/review`) }
  if (o.role === 'seller' && (o.status === 'in_transit' || o.status === 'out_for_delivery'))
    return { key: 'delivered', label: 'Mark delivered', run: () => void markDelivered() }
  return null
})

const secondary = computed<Btn[]>(() => {
  const o = order.value
  if (!o) return []
  const out: Btn[] = []
  if (o.carrier?.trackingUrl) out.push({ key: 'track', label: 'Track flight', run: () => void openExternal(o.carrier!.trackingUrl!) })
  if (can('message')) out.push({ key: 'message', label: o.role === 'buyer' ? 'Message seller' : 'Message buyer', color: 'medium', run: () => void message() })
  if (can('cancel')) out.push({ key: 'cancel', label: 'Cancel order', color: 'danger', run: () => void cancel() })
  return out.slice(0, 2)
})
</script>

<style scoped>
.small {
  font-size: var(--pw-text-sm);
}

.escrow {
  position: relative;
  overflow: hidden;
  padding: var(--pw-space-5);
  border-radius: var(--pw-radius-xl);
  background: var(--pw-hero);
  color: #fff;
}

.escrow__title {
  font-family: var(--pw-font-display);
  font-weight: 700;
  font-size: var(--pw-text-lg);
}

.escrow__title ion-icon {
  color: var(--pw-gold-400);
  vertical-align: -3px;
}

.escrow__text {
  margin-top: 6px;
  color: rgb(255 255 255 / 82%);
  line-height: 1.5;
}

.escrow__mark {
  position: absolute;
  right: -14px;
  bottom: -16px;
  width: 130px;
  opacity: 0.12;
}

.total dt,
.total dd {
  font-weight: 700;
  color: var(--pw-text);
}

.actions {
  display: flex;
  gap: 10px;
}

.actions ion-button {
  flex: 1 1 0;
  margin: 0;
}
</style>
