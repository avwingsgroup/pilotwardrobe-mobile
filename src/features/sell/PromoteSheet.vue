<template>
  <ion-content class="pw-content-plain">
    <div class="sheet pw-stack">
      <div class="pw-row-between">
        <h2 class="pw-title">Promote listing</h2>
        <ion-button fill="clear" color="medium" aria-label="Close" @click="$emit('close')"><ion-icon slot="icon-only" :icon="closeOutline" /></ion-button>
      </div>
      <p class="pw-body">Featured on the home feed and pinned to the top of search.</p>

      <template v-if="packages.loading.value">
        <ion-skeleton-text v-for="n in 3" :key="n" animated style="height: 76px; border-radius: 16px" />
      </template>
      <ErrorState v-else-if="packages.error.value" :error="packages.error.value" @retry="packages.load" />
      <div v-else class="pw-stack-sm" role="radiogroup" aria-label="Promotion package">
        <RadioCard
          v-for="(p, i) in packages.data.value ?? []"
          :key="p.id"
          radio-position="start"
          :selected="selected === p.id"
          :title="p.name"
          :description="p.description"
          @select="selected = p.id"
        >
          <template #aside>
            <StatusBadge v-if="i === 1" tone="gold" solid label="Most popular" class="popular" />
            <strong class="pw-price">{{ formatMoney(p.price) }}</strong>
          </template>
        </RadioCard>
      </div>

      <h3 class="pw-eyebrow">Pay with</h3>
      <GatewayPicker v-if="currency" v-model="gateway" :currency="currency" :country="auth.user?.countryCode" />

      <p v-if="error" class="pw-callout pw-callout--danger" role="alert">{{ error }}</p>
      <ion-button expand="block" color="secondary" class="pw-btn-lg" :disabled="!chosen || !gateway || busy" @click="boost">
        <ion-spinner v-if="busy" name="crescent" />
        <span v-else>Boost for {{ chosen ? formatMoney(chosen.price) : '—' }}</span>
      </ion-button>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonSkeletonText, IonSpinner } from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import { computed, ref, watch } from 'vue'
import { errorMessage } from '@/api/errors'
import { sellingApi } from '@/api/selling'
import ErrorState from '@/components/ErrorState.vue'
import RadioCard from '@/components/RadioCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAsync } from '@/composables/useAsync'
import { useAuthStore } from '@/stores/auth'
import type { BoostPackage, PaymentGateway } from '@/types'
import { formatMoney } from '@/utils/money'
import GatewayPicker from '../checkout/GatewayPicker.vue'
import { usePaymentFlow } from '../checkout/usePaymentFlow'

/**
 * S9 — GET /boost-packages, POST /listings/{id}/promote (creates a pending
 * promotion), then the shared gateway payment with `promotion_id`. The frame's
 * "Wallet balance" option is not offered: the API has no wallet payment method.
 */
const props = defineProps<{ listingId: string }>()
const emit = defineEmits<{ close: [] }>()
const auth = useAuthStore()
const payment = usePaymentFlow()

const packages = useAsync<BoostPackage[]>(() => sellingApi.boostPackages())
const selected = ref<string | null>(null)
const gateway = ref<PaymentGateway | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)

watch(
  () => packages.data.value,
  (list) => {
    if (list?.length && !selected.value) selected.value = (list[1] ?? list[0])?.id ?? null
  },
)
const chosen = computed(() => packages.data.value?.find((p) => p.id === selected.value) ?? null)
const currency = computed(() => chosen.value?.price.currency ?? packages.data.value?.[0]?.price.currency ?? null)

async function boost() {
  if (!chosen.value || !gateway.value || busy.value) return
  busy.value = true
  error.value = null
  try {
    const promo = await sellingApi.promote(props.listingId, chosen.value.id)
    emit('close')
    await payment.start({ promotionId: promo.promotionId }, gateway.value, '/tabs/profile/hangar')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.sheet {
  padding: var(--pw-space-5) var(--pw-gutter) calc(var(--ion-safe-area-bottom, 0px) + var(--pw-space-6));
}

.popular {
  display: block;
  margin-bottom: 4px;
}
</style>
