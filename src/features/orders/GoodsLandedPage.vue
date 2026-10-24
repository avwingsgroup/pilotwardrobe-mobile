<template>
  <ion-page>
    <AppHeader title="" :default-href="`/orders/${id}`" />
    <ion-content class="pw-content-plain">
      <div v-if="detail.loading.value && !order" class="pw-pad"><ion-skeleton-text animated style="height: 320px; border-radius: 16px" /></div>
      <ErrorState v-else-if="detail.error.value && !order" :error="detail.error.value" @retry="detail.load" />

      <div v-else-if="order" class="landed pw-container">
        <SuccessHero :icon="cubeOutline" title="Goods landed">
          Inspect your {{ shortTitle }} within <strong>{{ PLATFORM.inspectionHours }} hours</strong>. Confirming releases
          <strong>{{ formatMoney(order.totals.items) }}</strong> from escrow to {{ sellerFirst }}.
        </SuccessHero>

        <ItemSummary :title="order.items[0]?.title ?? order.number" :image="order.items[0]?.image" class="item">
          <p v-if="landedAt" class="pw-muted small">Landed {{ formatDateTime(landedAt) }}</p>
          <template #aside><StatusBadge tone="success" label="Landed" /></template>
        </ItemSummary>

        <p v-if="order.autoReleaseAt" class="pw-callout pw-callout--warning">
          <ion-icon :icon="timeOutline" aria-hidden="true" />
          <span>Auto-release in <strong>{{ countdown(order.autoReleaseAt, now) }}</strong> unless you confirm or report a problem first.</span>
        </p>

        <section class="pw-stack-sm">
          <h2 class="pw-eyebrow">Quick check</h2>
          <ion-checkbox v-for="c in checks" :key="c.key" v-model="c.done" label-placement="end" justify="start" class="check">{{ c.label }}</ion-checkbox>
          <p class="pw-subtle small">This checklist is for you — it isn't sent anywhere.</p>
        </section>

        <p v-if="error" class="pw-callout pw-callout--danger" role="alert">{{ error }}</p>
      </div>
    </ion-content>

    <ion-footer v-if="order" class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" color="success" class="pw-btn-lg" :disabled="busy || !canConfirm" @click="confirmArrival">
          <ion-spinner v-if="busy" name="crescent" />
          <span v-else>Confirm — release {{ formatMoney(order.totals.items) }}</span>
        </ion-button>
        <ion-button expand="block" fill="clear" color="danger" :router-link="`/disputes/new?order=${id}`">Report a problem</ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonCheckbox, IonContent, IonFooter, IonIcon, IonPage, IonSkeletonText, IonSpinner, IonToolbar, useIonRouter } from '@ionic/vue'
import { cubeOutline, timeOutline } from 'ionicons/icons'
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { errorMessage } from '@/api/errors'
import { ordersApi } from '@/api/orders'
import AppHeader from '@/components/AppHeader.vue'
import ErrorState from '@/components/ErrorState.vue'
import ItemSummary from '@/components/ItemSummary.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import SuccessHero from '@/components/SuccessHero.vue'
import { PLATFORM } from '@/constants/labels'
import { useAsync } from '@/composables/useAsync'
import { useFeedback } from '@/composables/useFeedback'
import { useNow } from '@/composables/useNow'
import { countdown, formatDateTime } from '@/utils/date'
import { formatMoney } from '@/utils/money'

/** T5 — POST /orders/{id}/confirm-delivery (buyer). Irreversible, so confirmed twice. */
const route = useRoute()
const router = useIonRouter()
const { confirm } = useFeedback()
const now = useNow(30_000)

const id = String(route.params.id)
const detail = useAsync(() => ordersApi.get(id))
const order = computed(() => detail.data.value)
const shortTitle = computed(() => (order.value?.items[0]?.title ?? 'item').split(/[—,]/)[0]?.trim())
const sellerFirst = computed(() => order.value?.seller.displayName.split(/\s+/)[0] ?? 'the seller')
const landedAt = computed(() => order.value?.tracking.find((t) => t.code === 'delivered')?.occurredAt ?? null)
const canConfirm = computed(() => !!order.value?.allowedActions.includes('confirm_delivery'))

const checks = reactive([
  { key: 'match', label: 'Matches listing photos & description', done: false },
  { key: 'works', label: 'Powers on / works as described', done: false },
  { key: 'serial', label: 'Serial matches escrow record', done: false },
])

const busy = ref(false)
const error = ref<string | null>(null)

async function confirmArrival() {
  if (busy.value || !order.value) return
  const ok = await confirm({
    header: 'Release payment?',
    message: `${formatMoney(order.value.totals.items)} goes to ${sellerFirst.value}. This can't be undone — report a problem instead if anything is wrong.`,
    confirmText: 'Confirm & release',
    cancelText: 'Not yet',
  })
  if (!ok) return
  busy.value = true
  error.value = null
  try {
    await ordersApi.confirmDelivery(id)
    router.navigate(`/orders/${id}/review`, 'forward', 'replace')
  } catch (e) {
    error.value = errorMessage(e)
    void detail.refresh()
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.landed {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-5);
  padding: var(--pw-space-4) var(--pw-gutter) var(--pw-space-6);
}

.item {
  background: var(--pw-surface-muted);
  border: 0;
}

.small {
  font-size: var(--pw-text-sm);
}

.check {
  min-height: 52px;
  border-bottom: 1px solid var(--pw-border);
  --size: 26px;
  --checkbox-background-checked: var(--pw-primary);
}
</style>
