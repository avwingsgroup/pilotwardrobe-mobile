<template>
  <div class="gw" role="radiogroup" aria-label="Payment method">
    <template v-if="loading">
      <ion-skeleton-text v-for="n in 3" :key="n" animated style="height: 72px; border-radius: 16px" />
    </template>
    <p v-else-if="error" class="pw-callout pw-callout--danger">{{ error }} <button type="button" class="pw-link" @click="load">Retry</button></p>
    <p v-else-if="!methods.length" class="pw-callout pw-callout--muted">No payment methods are available for {{ currency }} right now.</p>
    <RadioCard
      v-for="m in methods"
      :key="m.code"
      :selected="modelValue === m.code"
      :disabled="!m.enabled"
      :title="m.name"
      :description="m.enabled ? (m.description ?? '') : (m.unavailableReason ?? 'Unavailable')"
      @select="m.enabled && $emit('update:modelValue', m.code)"
    >
      <template #media>
        <span class="gw__logo" aria-hidden="true">
          <img v-if="m.logo" :src="m.logo" alt="" />
          <span v-else>{{ m.name.slice(0, 2).toUpperCase() }}</span>
        </span>
      </template>
    </RadioCard>
    <p class="gw__note">
      <ion-icon :icon="lockClosedOutline" aria-hidden="true" />
      Card and bank details are entered on the provider's secure page — Pilotwardrobe never sees them.
    </p>
  </div>
</template>

<script setup lang="ts">
import { IonIcon, IonSkeletonText } from '@ionic/vue'
import { lockClosedOutline } from 'ionicons/icons'
import { onMounted, ref, watch } from 'vue'
import { errorMessage } from '@/api/errors'
import { paymentsApi } from '@/api/payments'
import RadioCard from '@/components/RadioCard.vue'
import { appConfig } from '@/config/env'
import type { CurrencyCode, PaymentGateway, PaymentMethod } from '@/types'

/**
 * Gateway selection from GET /payment-methods (C3). Replaces the frame's saved cards
 * and Apple/Google Pay buttons: the backend uses hosted checkout and stores no cards
 * (Apple Pay / Google Pay are offered on Stripe's hosted page — backend D14).
 */
const props = defineProps<{ modelValue: PaymentGateway | null; currency: CurrencyCode; country?: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: PaymentGateway] }>()

const methods = ref<PaymentMethod[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const all = await paymentsApi.methods({ currency: props.currency, country: props.country })
    methods.value = all.filter((m) => m.code !== 'sandbox' || appConfig.allowSandboxPayments)
    if (!props.modelValue || !methods.value.some((m) => m.code === props.modelValue && m.enabled)) {
      const first = methods.value.find((m) => m.enabled)
      if (first) emit('update:modelValue', first.code)
    }
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.currency, load)
</script>

<style scoped>
.gw {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gw__logo {
  display: grid;
  place-items: center;
  width: 56px;
  height: 40px;
  border-radius: 8px;
  background: var(--pw-surface-muted);
  color: var(--pw-primary);
  font-weight: 800;
  font-family: var(--pw-font-display);
}

.gw__logo img {
  max-width: 48px;
  max-height: 28px;
}

.gw__note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  color: var(--pw-text-3);
  font-size: var(--pw-text-sm);
  line-height: 1.45;
}
</style>
