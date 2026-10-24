<template>
  <ion-page>
    <AppHeader title="Report a problem" :default-href="orderId ? `/orders/${orderId}` : '/orders'" />
    <ion-content>
      <div v-if="detail.loading.value && !order" class="pw-pad"><ion-skeleton-text animated style="height: 300px; border-radius: 16px" /></div>
      <ErrorState v-else-if="detail.error.value && !order" :error="detail.error.value" @retry="detail.load" />

      <form v-else-if="order" class="pw-pad pw-stack pw-container" novalidate @submit.prevent="submit">
        <p class="pw-callout pw-callout--warning">
          <ion-icon :icon="shieldCheckmarkOutline" aria-hidden="true" />
          <span>Your <strong>{{ formatMoney(order.totals.total) }} stays frozen in escrow</strong> while we review — the seller isn't paid until this is resolved.</span>
        </p>

        <ItemSummary :title="`${shortTitle} · Order ${order.number}`" :image="order.items[0]?.image" class="item" :card="false">
          <p v-if="windowLeft" class="pw-muted small">{{ windowLeft }} left in window</p>
        </ItemSummary>

        <p class="lbl">What went wrong?</p>
        <div class="pw-stack-sm" role="radiogroup" aria-label="Reason">
          <RadioCard
            v-for="(meta, key) in DISPUTE_REASONS"
            :key="key"
            radio-position="start"
            :selected="form.values.reason === key"
            :title="meta.label"
            :description="form.values.reason === key ? meta.hint : undefined"
            @select="form.values.reason = key"
          />
        </div>
        <p v-if="form.errors.reason" class="err">{{ form.errors.reason }}</p>

        <TextField v-model="form.values.description" label="Describe the issue" multiline :rows="4" :maxlength="3000" :error="form.errors.description" help="At least 20 characters — include what you expected and what arrived." />

        <div class="pw-stack-sm">
          <p class="lbl">Evidence <span class="pw-subtle">· photos, at least 1</span></p>
          <EvidencePicker :items="evidence.items.value" @add="evidence.add" @remove="evidence.remove" @retry="evidence.retry" />
          <p v-if="form.errors.evidenceIds" class="err">{{ form.errors.evidenceIds }}</p>
        </div>

        <div class="pw-stack-sm">
          <p class="lbl">Preferred resolution</p>
          <ChipGroup v-model="form.values.requested" :options="resolutionOptions" label="Preferred resolution" />
          <AmountInput
            v-if="form.values.requested === 'partial_refund'"
            v-model="form.values.amount"
            size="sm"
            :currency="order.totals.total.currency"
            label="Refund amount you're asking for"
            :error="form.errors.amount"
          />
        </div>

        <p v-if="form.formError.value" class="pw-callout pw-callout--danger" role="alert">{{ form.formError.value }}</p>
      </form>
    </ion-content>

    <ion-footer v-if="order" class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" color="danger" class="pw-btn-lg" :disabled="form.submitting.value || evidence.uploading.value" @click="submit">
          <ion-spinner v-if="form.submitting.value" name="crescent" />
          <span v-else>{{ evidence.uploading.value ? 'Uploading evidence…' : 'Submit dispute' }}</span>
        </ion-button>
        <p class="note">Most disputes resolve in 2–3 business days</p>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonIcon, IonPage, IonSkeletonText, IonSpinner, IonToolbar, useIonRouter } from '@ionic/vue'
import { shieldCheckmarkOutline } from 'ionicons/icons'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { disputesApi } from '@/api/disputes'
import { ordersApi } from '@/api/orders'
import AmountInput from '@/components/AmountInput.vue'
import AppHeader from '@/components/AppHeader.vue'
import ChipGroup from '@/components/ChipGroup.vue'
import ErrorState from '@/components/ErrorState.vue'
import EvidencePicker from '@/components/EvidencePicker.vue'
import ItemSummary from '@/components/ItemSummary.vue'
import RadioCard from '@/components/RadioCard.vue'
import TextField from '@/components/TextField.vue'
import { DISPUTE_REASONS, DISPUTE_RESOLUTIONS } from '@/constants/labels'
import { useAsync } from '@/composables/useAsync'
import { useEvidenceUploads } from '@/composables/useEvidenceUploads'
import { useFeedback } from '@/composables/useFeedback'
import { useForm } from '@/composables/useForm'
import type { DisputeReason, DisputeResolutionRequest } from '@/types'
import { countdown } from '@/utils/date'
import { formatMoney } from '@/utils/money'

/** W3 — POST /disputes (freezes escrow). Evidence is private `dispute_evidence` media. */
const route = useRoute()
const router = useIonRouter()
const { toast } = useFeedback()

const orderId = route.query.order ? String(route.query.order) : ''
const detail = useAsync(() => ordersApi.get(orderId))
const order = computed(() => detail.data.value)
const shortTitle = computed(() => (order.value?.items[0]?.title ?? '').split(/[—,]/)[0]?.trim())
const windowLeft = computed(() => (order.value?.disputeWindowEndsAt ? countdown(order.value.disputeWindowEndsAt) : null))

const evidence = useEvidenceUploads('dispute_evidence')
const resolutionOptions = (['full_refund', 'partial_refund', 'return_and_refund'] as DisputeResolutionRequest[]).map((v) => ({ value: v, label: DISPUTE_RESOLUTIONS[v] }))

const form = useForm(
  {
    reason: 'not_as_described' as DisputeReason,
    description: '',
    requested: 'full_refund' as DisputeResolutionRequest,
    amount: null as number | null,
    evidenceIds: [] as string[],
  },
  {
    description: [(v: string) => (v.trim().length >= 20 ? true : 'Describe the issue in at least 20 characters.')],
  },
)

async function submit() {
  form.values.evidenceIds = evidence.mediaIds.value
  if (!form.values.evidenceIds.length) {
    form.errors.evidenceIds = 'Add at least one photo of the problem.'
    return
  }
  if (form.values.requested === 'partial_refund' && !form.values.amount) {
    form.errors.amount = 'Enter the amount you’re asking for.'
    return
  }
  await form.submit(async (v) => {
    const res = await disputesApi.open({
      orderId,
      reason: v.reason,
      requested: v.requested,
      amount: v.requested === 'partial_refund' ? v.amount : null,
      description: v.description.trim(),
      evidenceIds: v.evidenceIds,
    })
    await toast(res.message ?? 'Dispute opened. Funds are frozen in escrow.', 'success')
    router.navigate(`/disputes/${res.data.id}`, 'forward', 'replace')
  })
}

</script>

<style scoped>
.item {
  padding: var(--pw-space-3);
  background: var(--pw-surface-muted);
  border-radius: var(--pw-radius-lg);
}

.small {
  font-size: var(--pw-text-sm);
}

.lbl {
  font-weight: 500;
  color: var(--pw-ink-2);
}

.err {
  color: var(--pw-danger-600);
  font-size: var(--pw-text-sm);
}

.note {
  text-align: center;
  color: var(--pw-text-3);
  font-size: var(--pw-text-sm);
  margin: 6px 0 0;
}
</style>
