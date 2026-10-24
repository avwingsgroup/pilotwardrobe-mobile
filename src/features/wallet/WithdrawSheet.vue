<template>
  <ion-content class="pw-content-plain">
    <div class="sheet pw-stack">
      <div class="pw-row-between">
        <h2 class="pw-title">Withdraw</h2>
        <ion-button fill="clear" color="medium" aria-label="Close" @click="$emit('close')"><ion-icon slot="icon-only" :icon="closeOutline" /></ion-button>
      </div>
      <p class="pw-muted">Available: <strong>{{ formatMoney(available) }}</strong></p>

      <template v-if="methods.loading.value"><ion-skeleton-text animated style="height: 72px; border-radius: 16px" /></template>
      <ErrorState v-else-if="methods.error.value" :error="methods.error.value" @retry="methods.load" />
      <template v-else-if="!methods.data.value?.length">
        <p class="pw-callout pw-callout--muted">Add a payout account on the web app (Wallet → Payout methods) — bank details are verified with the provider there.</p>
      </template>
      <template v-else>
        <AmountInput v-model="amount" :currency="available.currency" label="Amount" :error="fieldErr('amount')" />
        <button type="button" class="pw-link max" @click="amount = available.amount">Withdraw everything</button>
        <p class="pw-eyebrow">To</p>
        <div class="pw-stack-sm" role="radiogroup" aria-label="Payout method">
          <RadioCard
            v-for="m in methods.data.value"
            :key="m.id"
            :selected="methodId === m.id"
            :title="m.label"
            :description="`•••• ${m.last4} · ${m.currency}`"
            @select="methodId = m.id"
          />
        </div>

        <section v-if="quote" class="pw-card">
          <div class="pw-kv"><dt>Fee</dt><dd>{{ formatMoney(quote.fee) }}</dd></div>
          <div v-if="quote.exchangeRate" class="pw-kv"><dt>Rate</dt><dd>{{ quote.exchangeRate.label }}</dd></div>
          <div class="pw-kv"><dt>You'll receive</dt><dd class="pw-price">{{ formatMoney(quote.recipientReceives) }}</dd></div>
          <div class="pw-kv"><dt>Arrives</dt><dd>{{ dateRangeLabel(quote.arrivesBetween.from, quote.arrivesBetween.to) }}</dd></div>
        </section>
        <p v-if="quoteError" class="err">{{ quoteError }}</p>

        <TextField
          v-if="quote?.requiresTwoFactor"
          v-model="code"
          label="Two-step verification code"
          inputmode="numeric"
          autocomplete="one-time-code"
          :error="fieldErr('twoFactorCode')"
        />
        <p v-if="formError" class="pw-callout pw-callout--danger" role="alert">{{ formError }}</p>
        <ion-button expand="block" class="pw-btn-lg" :disabled="!quote || busy || (quote.requiresTwoFactor && !code)" @click="submit">
          <ion-spinner v-if="busy" name="crescent" />
          <span v-else>Withdraw {{ amount ? formatMoney({ amount, currency: available.currency }) : '' }}</span>
        </ion-button>
      </template>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonSkeletonText, IonSpinner } from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import { ref, watch } from 'vue'
import { ApiError, toApiError } from '@/api/errors'
import { walletApi } from '@/api/wallet'
import AmountInput from '@/components/AmountInput.vue'
import ErrorState from '@/components/ErrorState.vue'
import RadioCard from '@/components/RadioCard.vue'
import TextField from '@/components/TextField.vue'
import { useAsync } from '@/composables/useAsync'
import { useDebounced } from '@/composables/useDebounced'
import { useFeedback } from '@/composables/useFeedback'
import type { Money, PayoutMethod, WithdrawalQuote } from '@/types'
import { dateRangeLabel } from '@/utils/date'
import { uuid } from '@/utils/id'
import { formatMoney } from '@/utils/money'

/**
 * POST /me/withdrawals/quote then POST /me/withdrawals (Idempotency-Key; 2FA code
 * when enabled). Large withdrawals are parked for staff approval (dual control).
 */
const props = defineProps<{ available: Money }>()
const emit = defineEmits<{ close: []; done: [] }>()
const { toast } = useFeedback()

const methods = useAsync<PayoutMethod[]>(() => walletApi.payoutMethods())
const methodId = ref<string | null>(null)
watch(
  () => methods.data.value,
  (list) => {
    if (list?.length && !methodId.value) methodId.value = (list.find((m) => m.isDefault) ?? list[0])!.id
  },
)

const amount = ref<number | null>(null)
const code = ref('')
const quote = ref<WithdrawalQuote | null>(null)
const quoteError = ref<string | null>(null)
const busy = ref(false)
const formError = ref<string | null>(null)
const lastError = ref<ApiError | null>(null)
const idempotencyKey = uuid()
const fieldErr = (k: string) => lastError.value?.field(k)

const debouncedAmount = useDebounced(amount, 400)
watch([debouncedAmount, methodId], async () => {
  quote.value = null
  quoteError.value = null
  if (!debouncedAmount.value || !methodId.value) return
  if (debouncedAmount.value > props.available.amount) {
    quoteError.value = 'That’s more than your available balance.'
    return
  }
  try {
    quote.value = await walletApi.withdrawalQuote(debouncedAmount.value, props.available.currency, methodId.value)
  } catch (e) {
    const err = toApiError(e)
    quoteError.value = err.field('amount') ?? err.message
  }
})

async function submit() {
  if (!amount.value || !methodId.value || busy.value) return
  busy.value = true
  formError.value = null
  lastError.value = null
  try {
    const res = await walletApi.withdraw(
      { amount: amount.value, currency: props.available.currency, payoutMethodId: methodId.value, twoFactorCode: code.value || undefined },
      { idempotencyKey },
    )
    await toast(res.data.requiresApproval ? 'Requested — large withdrawals are reviewed by our finance team first.' : (res.message ?? 'Withdrawal requested.'), 'success')
    emit('done')
  } catch (e) {
    const err = toApiError(e)
    lastError.value = err
    if (!err.hasFieldErrors) formError.value = err.message
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.sheet {
  padding: var(--pw-space-5) var(--pw-gutter) calc(var(--ion-safe-area-bottom, 0px) + var(--pw-space-6));
}

.max {
  align-self: flex-start;
}

.err {
  color: var(--pw-danger-600);
  font-size: var(--pw-text-sm);
}
</style>
