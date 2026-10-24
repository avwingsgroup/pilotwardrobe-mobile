<template>
  <div class="offer" :class="{ mine }">
    <div class="offer__head">
      <span><ion-icon :icon="briefcaseOutline" aria-hidden="true" /> OFFER</span>
      <span v-if="offer.status === 'pending'" class="pw-muted">expires {{ countdown(offer.expiresAt, now) }}</span>
      <StatusBadge v-else :tone="status.tone" :label="status.label" />
    </div>
    <div class="offer__body">
      <p class="offer__amount pw-display">{{ formatMoney(offer.counterAmount ?? offer.amount) }}</p>
      <p class="pw-muted">asking <span class="pw-strike">{{ formatMoney(offer.listing.price, { whole: true }) }}</span></p>
    </div>
    <div v-if="can('accept') || can('decline') || can('counter')" class="offer__actions">
      <ion-button v-if="can('accept')" :disabled="busy" @click="$emit('accept', offer)">Accept</ion-button>
      <ion-button v-if="can('counter')" fill="outline" router-link="/tabs/inbox/offers">Counter</ion-button>
      <ion-button v-if="can('decline')" fill="outline" color="medium" :disabled="busy" @click="$emit('decline', offer)">Decline</ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonIcon } from '@ionic/vue'
import { briefcaseOutline } from 'ionicons/icons'
import { computed } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { OFFER_STATUS, labelFor } from '@/constants/labels'
import type { Offer, OfferAction } from '@/types'
import { countdown } from '@/utils/date'
import { formatMoney } from '@/utils/money'

/** M2 inline offer card; actions come from the offer's `allowed_actions`. */
const props = defineProps<{ offer: Offer; mine: boolean; busy: boolean; now: Date }>()
defineEmits<{ accept: [offer: Offer]; decline: [offer: Offer] }>()

const status = computed(() => labelFor(OFFER_STATUS, props.offer.status))
const can = (action: OfferAction) => props.offer.allowedActions.includes(action)
</script>

<style scoped>
.offer {
  align-self: flex-start;
  width: min(100%, 340px);
  border: 2px solid var(--pw-primary);
  border-radius: var(--pw-radius-lg);
  background: var(--pw-surface);
  overflow: hidden;
}

.offer.mine {
  align-self: flex-end;
}

.offer__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--pw-primary-tint);
  color: var(--pw-primary);
  font-weight: 700;
  font-size: var(--pw-text-sm);
  letter-spacing: 0.04em;
}

.offer__body {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 14px 16px 6px;
}

.offer__amount {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--pw-primary);
}

.offer__actions {
  display: flex;
  gap: 8px;
  padding: 8px 12px 14px;
}

.offer__actions ion-button {
  flex: 1 1 0;
  margin: 0;
}
</style>
