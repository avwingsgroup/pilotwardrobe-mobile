<template>
  <div class="sheet">
    <div class="pw-row-between">
      <h2 class="pw-title">Make an offer</h2>
      <ion-button fill="clear" color="medium" aria-label="Close" @click="$emit('close')">
        <ion-icon slot="icon-only" :icon="closeOutline" />
      </ion-button>
    </div>

    <ItemSummary :title="listing.title" :image="listing.images[0]" class="sheet__item" :card="false">
      <p class="pw-muted">Listed at <strong class="pw-price">{{ formatMoney(listing.price) }}</strong></p>
      <template #aside>
        <AvatarInitials :name="listing.seller.displayName" :size="34" />
      </template>
    </ItemSummary>

    <AmountInput v-model="amount" :currency="listing.price.currency" label="Your offer" :error="amountError">
      <template v-if="amount" #aside>
        <span :class="belowPct >= 0 ? 'below' : 'above'">{{ belowPct >= 0 ? `${belowPct}% below asking` : 'Above asking' }}</span>
      </template>
    </AmountInput>

    <div class="quick" role="group" aria-label="Quick amounts">
      <button v-for="q in quickAmounts" :key="q" type="button" class="quick__btn" :class="{ on: amount === q }" @click="amount = q">
        {{ formatMoney({ amount: q, currency: listing.price.currency }, { whole: true }) }}
      </button>
    </div>

    <p class="pw-callout">
      Offers within 10% of asking are accepted more often. {{ firstName }} has 24 hours to respond.
    </p>

    <TextField v-model="message" label="Message" hint="optional" multiline :rows="2" :maxlength="500" placeholder="Add a note for the seller" />

    <ion-button expand="block" class="pw-btn-lg" :disabled="submitting || !amount" @click="submit">
      <ion-spinner v-if="submitting" name="crescent" />
      <span v-else>Send offer · {{ amount ? formatMoney({ amount, currency: listing.price.currency }) : '' }}</span>
    </ion-button>
    <p class="sheet__note">Nothing is charged until the seller accepts</p>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonIcon, IonSpinner } from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { toApiError } from '@/api/errors'
import { tradesApi } from '@/api/trades'
import AmountInput from '@/components/AmountInput.vue'
import AvatarInitials from '@/components/AvatarInitials.vue'
import ItemSummary from '@/components/ItemSummary.vue'
import TextField from '@/components/TextField.vue'
import { useFeedback } from '@/composables/useFeedback'
import { track } from '@/services/analytics'
import type { Listing, Offer } from '@/types'
import { uuid } from '@/utils/id'
import { formatMoney, percentBelow } from '@/utils/money'

/**
 * T1 — POST /listings/{id}/offers with an Idempotency-Key, so a retried tap can't
 * create two offers. The backend enforces `minimum_offer` (422 on `amount`) and the
 * 24 h expiry; the frame's "valid for 48 hours" picker has no API field.
 */
const props = defineProps<{ listing: Listing; size?: string | null }>()
const emit = defineEmits<{ close: []; sent: [offer: Offer] }>()
const { toast } = useFeedback()

const price = props.listing.price.amount
const roundTo = (n: number) => Math.round(n / 1000) * 1000 || Math.round(n / 100) * 100
const quickAmounts = [0.9, 0.92, 0.95, 0.97].map((f) => roundTo(price * f)).filter((v, i, a) => v > 0 && a.indexOf(v) === i)

const amount = ref<number | null>(quickAmounts[1] ?? null)
const message = ref('')
const submitting = ref(false)
const amountError = ref<string | undefined>()
const idempotencyKey = uuid()

const belowPct = computed(() => (amount.value ? percentBelow(props.listing.price, { amount: amount.value, currency: props.listing.price.currency }) : 0))
const firstName = computed(() => props.listing.seller.displayName.split(/\s+/)[0])

async function submit() {
  if (submitting.value || !amount.value) return
  submitting.value = true
  amountError.value = undefined
  try {
    const res = await tradesApi.makeOffer(
      props.listing.id,
      { amount: amount.value, currency: props.listing.price.currency, message: message.value.trim() || null, size: props.size ?? null },
      { idempotencyKey },
    )
    track({ name: 'offer_submitted', params: { listing_id: props.listing.id } })
    await toast(res.message ?? 'Offer sent.', 'success')
    emit('sent', res.data)
  } catch (e) {
    const err = toApiError(e)
    amountError.value = err.field('amount') ?? (err.isValidation ? err.message : undefined)
    if (!amountError.value) await toast(err.message, 'danger')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-4);
  padding: var(--pw-space-5) var(--pw-gutter) calc(var(--ion-safe-area-bottom, 0px) + var(--pw-space-4));
  background: var(--pw-surface);
}

.sheet__item {
  background: var(--pw-surface-muted);
  border-radius: var(--pw-radius-lg);
  padding: var(--pw-space-3);
}

.below {
  color: var(--pw-success-600);
  font-weight: 600;
}

.above {
  color: var(--pw-warning-700);
  font-weight: 600;
}

.quick {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.quick__btn {
  min-height: 52px;
  border-radius: var(--pw-radius-full);
  border: 1.5px solid var(--pw-border);
  background: var(--pw-surface);
  color: var(--pw-text);
  font: inherit;
  font-weight: 600;
}

.quick__btn.on {
  background: var(--pw-primary);
  border-color: var(--pw-primary);
  color: var(--pw-primary-contrast);
}

.sheet__note {
  text-align: center;
  color: var(--pw-text-3);
  font-size: var(--pw-text-sm);
}
</style>
