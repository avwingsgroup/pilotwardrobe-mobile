<template>
  <ion-page>
    <AppHeader title="Offers" default-href="/tabs/inbox">
      <template #end>
        <StatusBadge v-if="newCount" tone="danger" solid :label="`${newCount} new`" class="new" />
      </template>
    </AppHeader>
    <ion-segment v-model="box" class="pw-tabs seg">
      <ion-segment-button value="received"><ion-label>Received{{ counts.received !== null ? ` · ${counts.received}` : '' }}</ion-label></ion-segment-button>
      <ion-segment-button value="sent"><ion-label>Sent{{ counts.sent !== null ? ` · ${counts.sent}` : '' }}</ion-label></ion-segment-button>
    </ion-segment>

    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="onRefresh"><ion-refresher-content /></ion-refresher>
      <div class="pw-pad pw-stack pw-container">
        <template v-if="loading && !items.length">
          <ion-skeleton-text v-for="n in 3" :key="n" animated style="height: 160px; border-radius: 16px" />
        </template>
        <ErrorState v-else-if="error && !items.length" :error="error" @retry="load" />
        <EmptyState
          v-else-if="!items.length"
          :icon="pricetagsOutline"
          :title="box === 'received' ? 'No offers yet' : 'You haven’t made any offers'"
          :message="box === 'received' ? 'Offers and swap proposals on your listings appear here.' : 'Make an offer or propose a swap from any listing.'"
          :action-label="box === 'sent' ? 'Browse gear' : undefined"
          action-to="/tabs/search/results"
        />

        <article
          v-for="item in items"
          :key="item.id"
          class="trade"
          :class="{ 'trade--live': item.status === 'pending', 'trade--swap': item.kind === 'swap', 'trade--done': item.status !== 'pending' }"
        >
          <header class="trade__head">
            <AvatarInitials :name="item.counterparty.displayName" :initials-text="item.counterparty.initials" :size="52" />
            <div class="trade__who">
              <p class="trade__name">
                {{ item.counterparty.displayName }}
                <VerifiedShield v-if="item.counterparty.verified" />
                <span v-if="item.counterparty.rating" class="pw-muted"> · ★ {{ item.counterparty.rating.toFixed(1) }}</span>
              </p>
              <p class="pw-muted small">
                {{ item.kind === 'swap' ? 'Swap proposal' : 'Cash offer' }} · {{ titleOf(item) }} · {{ timeAgo(item.createdAt) }}
              </p>
            </div>
            <div v-if="item.kind === 'offer'" class="trade__amount">
              <p :class="['pw-price', { 'pw-strike': item.status === 'declined' || item.status === 'cancelled' || item.status === 'expired' }]">
                {{ formatMoney(item.counterAmount ?? item.amount, { whole: true }) }}
              </p>
              <p class="pw-subtle small">asking {{ formatMoney(item.listing.price, { whole: true }) }}</p>
            </div>
            <StatusBadge v-else tone="info" :icon="swapHorizontalOutline" label="Swap" />
          </header>

          <p v-if="item.message" class="trade__msg">“{{ item.message }}”</p>

          <div v-if="item.kind === 'swap'" class="swapbox">
            <PwImage class="swapbox__img" :asset="item.offeredItems[0]?.listing.image" :ratio="1" :width="64" fit="contain" />
            <div>
              <p class="swapbox__title">
                {{ item.offeredItems.map((o) => o.listing.title).join(' + ') }}{{ item.cashAdjustment && item.cashAdjustment.amount > 0 ? ` + ${formatMoney(item.cashAdjustment, { whole: true })} cash` : '' }}
              </p>
              <p class="pw-muted small">≈ {{ formatMoney(swapTotal(item), { whole: true }) }} total vs {{ formatMoney(item.targetListing.price, { whole: true }) }} asking</p>
            </div>
          </div>

          <StatusBadge v-if="item.status !== 'pending'" :tone="statusOf(item).tone" :label="statusOf(item).label" class="trade__status" />

          <div v-if="actionsOf(item).length" class="trade__actions">
            <ion-button
              v-for="a in actionsOf(item)"
              :key="a.key"
              :fill="a.fill"
              :color="a.color"
              :disabled="busy === item.id"
              @click="a.run()"
            >
              {{ a.label }}
            </ion-button>
          </div>
          <p v-if="item.status === 'pending'" class="trade__expiry">
            <ion-icon :icon="timeOutline" aria-hidden="true" /> Expires in {{ countdown(item.expiresAt, now) }}
          </p>
        </article>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  alertController,
  IonButton,
  IonContent,
  IonIcon,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  useIonRouter,
} from '@ionic/vue'
import { pricetagsOutline, swapHorizontalOutline, timeOutline } from 'ionicons/icons'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ApiError, toApiError } from '@/api/errors'
import { messagesApi } from '@/api/messages'
import { tradesApi } from '@/api/trades'
import AppHeader from '@/components/AppHeader.vue'
import AvatarInitials from '@/components/AvatarInitials.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PwImage from '@/components/PwImage.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import VerifiedShield from '@/components/VerifiedShield.vue'
import { OFFER_STATUS, SWAP_STATUS, labelFor } from '@/constants/labels'
import { useFeedback } from '@/composables/useFeedback'
import { useNow } from '@/composables/useNow'
import type { Money, Offer, SwapRequest, TradeBox } from '@/types'
import { countdown, timeAgo } from '@/utils/date'
import { formatMoney, toMinor } from '@/utils/money'

type Trade = Offer | SwapRequest

/**
 * T3 — GET /me/offers and /me/swap-requests (paginated, first page each) merged by
 * date. Buttons come only from each item's `allowed_actions`; the backend decides
 * who may accept, decline, counter or cancel. Every action re-fetches its item.
 */
const route = useRoute()
const router = useIonRouter()
const { toast, toastError, confirm } = useFeedback()
const now = useNow(30_000)

const box = ref<TradeBox>(route.query.box === 'sent' ? 'sent' : 'received')
const offers = ref<Offer[]>([])
const swaps = ref<SwapRequest[]>([])
const loading = ref(false)
const error = ref<ApiError | null>(null)
const busy = ref<string | null>(null)
const counts = reactive<{ received: number | null; sent: number | null }>({ received: null, sent: null })

const items = computed<Trade[]>(() =>
  [...offers.value, ...swaps.value].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || b.createdAt.localeCompare(a.createdAt)),
)
const newCount = computed(() => (box.value === 'received' ? items.value.filter((i) => i.unread && i.status === 'pending').length : 0))

async function load() {
  loading.value = true
  error.value = null
  try {
    const [o, s] = await Promise.all([tradesApi.offers(box.value, { perPage: 50 }), tradesApi.swaps(box.value, { perPage: 50 })])
    offers.value = o.data
    swaps.value = s.data
    counts[box.value] = o.meta.total + s.meta.total
  } catch (e) {
    error.value = toApiError(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(box, load)

async function onRefresh(event: CustomEvent) {
  await load()
  ;(event.target as HTMLIonRefresherElement).complete()
}

const titleOf = (t: Trade) => (t.kind === 'offer' ? t.listing.title : t.targetListing.title)
const statusOf = (t: Trade) => (t.kind === 'offer' ? labelFor(OFFER_STATUS, t.status) : labelFor(SWAP_STATUS, t.status))
const swapTotal = (s: SwapRequest): Money => ({
  amount: s.offeredItems.reduce((sum, o) => sum + o.estimatedValue.amount, 0) + Math.max(0, s.cashAdjustment?.amount ?? 0),
  currency: s.targetListing.price.currency,
})

function replace(next: Trade) {
  if (next.kind === 'offer') offers.value = offers.value.map((o) => (o.id === next.id ? next : o))
  else swaps.value = swaps.value.map((s) => (s.id === next.id ? next : s))
}

async function run(item: Trade, action: () => Promise<{ data: Trade; message?: string }>, success: string) {
  if (busy.value) return
  busy.value = item.id
  try {
    const res = await action()
    replace(res.data)
    await toast(res.message ?? success, 'success')
  } catch (e) {
    const err = toApiError(e)
    await toastError(err)
    if (err.code === 'INVALID_STATE_TRANSITION') await load()
  } finally {
    busy.value = null
  }
}

async function counter(offer: Offer) {
  const alert = await alertController.create({
    header: 'Counter offer',
    message: `Asking ${formatMoney(offer.listing.price)} · offered ${formatMoney(offer.amount)}. Your counter must be between the two.`,
    inputs: [{ name: 'amount', type: 'number', placeholder: 'Amount', attributes: { inputmode: 'decimal', min: 0 } }],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Send counter', role: 'confirm' },
    ],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss<{ values: { amount: string } }>()
  if (role !== 'confirm' || !data?.values.amount) return
  const amount = toMinor(data.values.amount, offer.listing.price.currency)
  await run(offer, () => tradesApi.counterOffer(offer.id, { amount, currency: offer.listing.price.currency }), 'Counter sent.')
}

async function message(item: Trade) {
  try {
    const c = await messagesApi.start(item.kind === 'offer' ? item.listing.id : item.targetListing.id)
    router.push(`/conversations/${c.id}`)
  } catch (e) {
    await toastError(e)
  }
}

interface ActionButton {
  key: string
  label: string
  fill: 'solid' | 'outline' | 'clear'
  color?: string
  run: () => void
}

function actionsOf(item: Trade): ActionButton[] {
  const a = item.allowedActions
  const out: ActionButton[] = []
  if (item.kind === 'offer') {
    if (a.includes('accept'))
      out.push({
        key: 'accept',
        label: 'Accept',
        fill: 'solid',
        run: async () => {
          if (await confirm({ header: 'Accept this offer?', message: `${formatMoney(item.amount)} from ${item.counterparty.displayName}. The listing will be reserved for them.`, confirmText: 'Accept offer' }))
            await run(item, () => tradesApi.acceptOffer(item.id), 'Offer accepted.')
        },
      })
    if (a.includes('counter')) out.push({ key: 'counter', label: 'Counter', fill: 'outline', run: () => void counter(item) })
    if (a.includes('decline'))
      out.push({ key: 'decline', label: 'Decline', fill: 'outline', color: 'medium', run: () => void run(item, () => tradesApi.declineOffer(item.id), 'Offer declined.') })
    if (a.includes('checkout'))
      out.push({ key: 'checkout', label: 'Checkout', fill: 'solid', run: () => router.push(`/checkout?listing=${item.listing.id}&offer=${item.id}`) })
    if (a.includes('cancel'))
      out.push({
        key: 'cancel',
        label: 'Withdraw offer',
        fill: 'outline',
        color: 'medium',
        run: async () => {
          if (await confirm({ header: 'Withdraw offer?', message: 'The seller will no longer be able to accept it.', confirmText: 'Withdraw offer', destructive: true }))
            await run(item, () => tradesApi.cancelOffer(item.id), 'Offer withdrawn.')
        },
      })
  } else {
    if (a.includes('accept'))
      out.push({
        key: 'accept',
        label: 'Accept swap',
        fill: 'solid',
        run: async () => {
          if (await confirm({ header: 'Accept this swap?', message: 'Both listings are reserved and linked orders are created for shipping and any cash top-up.', confirmText: 'Accept swap' }))
            await run(item, () => tradesApi.acceptSwap(item.id), 'Swap accepted.')
        },
      })
    if (a.includes('reject'))
      out.push({ key: 'reject', label: 'Decline', fill: 'outline', color: 'medium', run: () => void run(item, () => tradesApi.rejectSwap(item.id), 'Swap declined.') })
    if (a.includes('cancel'))
      out.push({
        key: 'cancel',
        label: 'Withdraw',
        fill: 'outline',
        color: 'medium',
        run: async () => {
          if (await confirm({ header: 'Withdraw swap proposal?', message: 'The other member will no longer be able to accept it.', confirmText: 'Withdraw proposal', destructive: true }))
            await run(item, () => tradesApi.cancelSwap(item.id), 'Proposal withdrawn.')
        },
      })
    if (item.status === 'accepted') out.push({ key: 'orders', label: 'View orders', fill: 'solid', run: () => router.push('/orders') })
  }
  if (a.includes('message')) out.push({ key: 'message', label: 'Message', fill: 'clear', run: () => void message(item) })
  return out
}
</script>

<style scoped>
.new {
  margin-left: 4px;
}

.seg {
  background: var(--pw-surface);
}

.small {
  font-size: var(--pw-text-sm);
}

.trade {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-3);
  padding: var(--pw-space-5);
  background: var(--pw-surface);
  border: 1px solid var(--pw-border);
  border-radius: var(--pw-radius-lg);
}

.trade--live {
  border-left: 4px solid var(--pw-primary);
}

.trade--live.trade--swap {
  border-left-color: var(--pw-gold-500);
}

.trade--done {
  opacity: 0.85;
}

.trade__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.trade__who {
  flex: 1 1 auto;
  min-width: 0;
}

.trade__name {
  font-weight: 600;
  font-size: var(--pw-text-md);
}

.trade__amount {
  text-align: right;
}

.trade__amount .pw-price {
  font-size: var(--pw-text-xl);
}

.trade__msg {
  padding: var(--pw-space-3) var(--pw-space-4);
  border-radius: var(--pw-radius-md);
  background: var(--pw-surface-muted);
  line-height: 1.5;
}

.swapbox {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: var(--pw-space-3);
  border-radius: var(--pw-radius-md);
  background: var(--pw-surface-muted);
}

.swapbox__img {
  flex: 0 0 64px;
  width: 64px;
  border-radius: var(--pw-radius-sm);
}

.swapbox__title {
  font-weight: 600;
}

.trade__status {
  align-self: flex-start;
}

.trade__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.trade__actions ion-button {
  flex: 1 1 auto;
  margin: 0;
  min-height: 48px;
}

.trade__expiry {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--pw-warning-700);
  font-size: var(--pw-text-sm);
}
</style>
