<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="onRefresh"><ion-refresher-content /></ion-refresher>

      <header class="hero">
        <div class="hero__bar">
          <ion-back-button default-href="/tabs/profile" text="" :icon="chevronBack" />
          <h1 class="hero__title">Wallet</h1>
          <span class="hero__cur">{{ currency }} {{ CURRENCY_SYMBOL[currency] }}</span>
        </div>
        <template v-if="balance.data.value">
          <p class="hero__label">Available balance</p>
          <p class="hero__amount">{{ formatMoney(balance.data.value.available) }}</p>
          <div class="hero__tiles">
            <div class="tile">
              <p class="tile__label">In escrow · incoming</p>
              <p class="tile__value gold">{{ formatMoney(balance.data.value.inEscrow) }}</p>
            </div>
            <div class="tile">
              <p class="tile__label">Pending clearance</p>
              <p class="tile__value">{{ formatMoney(balance.data.value.pendingRelease) }}</p>
            </div>
          </div>
          <div class="hero__actions">
            <ion-button class="w-btn" color="light" :disabled="!canWithdraw" @click="openWithdraw">Withdraw</ion-button>
            <ion-button class="w-btn" fill="outline" color="light" :disabled="statementBusy" @click="statement">Statement</ion-button>
          </div>
        </template>
        <ion-skeleton-text v-else-if="balance.loading.value" animated class="hero__sk" />
        <ErrorState v-else-if="balance.error.value" :error="balance.error.value" @retry="balance.load" />
      </header>

      <div class="pw-pad pw-stack pw-container">
        <h2 class="pw-section-title">Activity</h2>
        <template v-if="tx.loading.value">
          <ion-skeleton-text v-for="n in 4" :key="n" animated style="height: 76px; border-radius: 16px" />
        </template>
        <EmptyState v-else-if="tx.isEmpty.value" compact :icon="receiptOutline" title="No activity yet" message="Sales, payouts and boosts will show here." />
        <article v-for="t in tx.items.value" :key="t.id" class="tx">
          <span class="tx__icon" :class="`tx__icon--${iconTone(t)}`" aria-hidden="true"><ion-icon :icon="iconFor(t)" /></span>
          <div class="tx__body">
            <p class="tx__title">{{ t.description }}</p>
            <p class="pw-muted small">{{ formatShortDate(t.occurredAt) }}{{ t.detail ? ` · ${t.detail}` : '' }}</p>
          </div>
          <div class="tx__amount">
            <p :class="t.status === 'in_escrow' ? 'gold' : t.direction === 'credit' ? 'credit' : 'debit'">{{ formatSigned(t.amount, t.direction) }}</p>
            <StatusBadge v-if="t.status !== 'complete' && t.status !== 'paid'" :tone="labelFor(TRANSACTION_STATUS, t.status).tone" :label="labelFor(TRANSACTION_STATUS, t.status).label" />
          </div>
        </article>
        <ion-infinite-scroll :disabled="!tx.hasMore.value" @ion-infinite="tx.loadMore"><ion-infinite-scroll-content /></ion-infinite-scroll>
        <p class="pw-callout"><ion-icon :icon="lockClosedOutline" aria-hidden="true" />Escrow funds appear here but can't be withdrawn until the buyer's {{ PLATFORM.inspectionHours }}-hour window closes.</p>
      </div>
    </ion-content>

    <ion-modal class="pw-sheet" :is-open="withdrawOpen" :initial-breakpoint="0.92" :breakpoints="[0, 0.92]" @did-dismiss="withdrawOpen = false">
      <WithdrawSheet v-if="balance.data.value" :available="balance.data.value.available" @close="withdrawOpen = false" @done="onWithdrawn" />
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  onIonViewWillEnter,
} from '@ionic/vue'
import {
  arrowDownOutline,
  arrowUpOutline,
  chevronBack,
  lockClosedOutline,
  receiptOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  starOutline,
} from 'ionicons/icons'
import { computed, ref } from 'vue'
import { walletApi } from '@/api/wallet'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { PLATFORM, TRANSACTION_STATUS, labelFor } from '@/constants/labels'
import { useAsync } from '@/composables/useAsync'
import { useAuthGate } from '@/composables/useAuthGate'
import { useFeedback } from '@/composables/useFeedback'
import { usePagedList } from '@/composables/usePagedList'
import { openExternal } from '@/services/checkoutBrowser'
import { useAuthStore } from '@/stores/auth'
import type { WalletBalance, WalletTransaction } from '@/types'
import { formatShortDate } from '@/utils/date'
import { CURRENCY_SYMBOL, formatMoney, formatSigned } from '@/utils/money'
import WithdrawSheet from './WithdrawSheet.vue'

/**
 * W1 — GET /me/wallet + /me/wallet/transactions (append-only ledger on the server).
 * "Add funds" from the frame is not offered: the API has no top-up endpoint.
 */
const auth = useAuthStore()
const { requireKyc } = useAuthGate()
const { toastError } = useFeedback()

const balance = useAsync<WalletBalance>(() => walletApi.balance())
const tx = usePagedList<WalletTransaction>((page) => walletApi.transactions({ page }))
onIonViewWillEnter(() => {
  void tx.loadFirst()
  if (balance.data.value) void balance.refresh()
})

const currency = computed(() => balance.data.value?.available.currency ?? auth.user?.currency ?? 'USD')
const canWithdraw = computed(() => (balance.data.value?.available.amount ?? 0) > 0 && auth.can('payouts.request'))
const withdrawOpen = ref(false)
const statementBusy = ref(false)

function openWithdraw() {
  if (requireKyc('/wallet')) withdrawOpen.value = true
}

function onWithdrawn() {
  withdrawOpen.value = false
  void balance.refresh()
  void tx.loadFirst()
}

async function statement() {
  statementBusy.value = true
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  try {
    const { url } = await walletApi.statement(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, currency.value)
    await openExternal(url)
  } catch (e) {
    await toastError(e)
  } finally {
    statementBusy.value = false
  }
}

async function onRefresh(event: CustomEvent) {
  await Promise.all([balance.refresh(), tx.loadFirst()])
  ;(event.target as HTMLIonRefresherElement).complete()
}

const iconFor = (t: WalletTransaction) =>
  t.status === 'in_escrow'
    ? shieldCheckmarkOutline
    : t.type === 'promotion'
      ? starOutline
      : t.type === 'refund'
        ? refreshOutline
        : t.direction === 'credit'
          ? arrowUpOutline
          : arrowDownOutline
const iconTone = (t: WalletTransaction) => (t.status === 'in_escrow' || t.type === 'promotion' ? 'gold' : t.direction === 'credit' ? 'green' : 'navy')
</script>

<style scoped>
.hero {
  padding: calc(var(--ion-safe-area-top, 0px) + 6px) var(--pw-gutter) var(--pw-space-6);
  background: var(--pw-hero);
  color: #fff;
}

.hero__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: -10px;
}

.hero__bar ion-back-button {
  --color: #fff;
}

.hero__title {
  flex: 1 1 auto;
  color: #fff;
  font-size: var(--pw-text-2xl);
}

.hero__cur {
  font-weight: 600;
  color: rgb(255 255 255 / 75%);
  letter-spacing: 0.06em;
}

.hero__label {
  margin-top: var(--pw-space-5);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: var(--pw-text-sm);
  color: rgb(255 255 255 / 70%);
}

.hero__amount {
  font-family: var(--pw-font-display);
  font-size: 3rem;
  font-weight: 700;
  line-height: 1.1;
}

.hero__tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: var(--pw-space-5) 0;
}

.tile {
  padding: var(--pw-space-4);
  border-radius: var(--pw-radius-lg);
  background: rgb(255 255 255 / 9%);
}

.tile__label {
  font-size: var(--pw-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(255 255 255 / 70%);
}

.tile__value {
  font-family: var(--pw-font-display);
  font-weight: 700;
  font-size: var(--pw-text-xl);
  margin-top: 4px;
}

.gold {
  color: var(--pw-gold-400);
}

.hero__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.w-btn {
  margin: 0;
  height: 52px;
  font-weight: 700;
}

.hero__sk {
  height: 180px;
  border-radius: 16px;
  margin-top: 16px;
}

.small {
  font-size: var(--pw-text-sm);
}

.tx {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: var(--pw-space-4);
  border-radius: var(--pw-radius-lg);
  background: var(--pw-surface);
  border: 1px solid var(--pw-border);
}

.tx__icon {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  font-size: 20px;
}

.tx__icon--gold {
  background: var(--pw-gold-100);
  color: var(--pw-gold-600);
}

.tx__icon--green {
  background: var(--pw-success-100);
  color: var(--pw-success-600);
}

.tx__icon--navy {
  background: var(--pw-navy-100);
  color: var(--pw-primary);
}

.tx__body {
  flex: 1 1 auto;
  min-width: 0;
}

.tx__title {
  font-weight: 600;
}

.tx__amount {
  text-align: right;
  font-family: var(--pw-font-display);
  font-weight: 700;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.credit {
  color: var(--pw-success-600);
}

.debit {
  color: var(--pw-danger-600);
}

.tx__amount .gold {
  color: var(--pw-warning-700);
}
</style>
