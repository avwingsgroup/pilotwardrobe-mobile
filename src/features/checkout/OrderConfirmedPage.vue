<template>
  <ion-page>
    <ion-content class="pw-content-plain">
      <div class="ok pw-container">
        <div v-if="detail.loading.value && !order" class="center"><ion-spinner name="crescent" /></div>
        <ErrorState v-else-if="detail.error.value && !order" :error="detail.error.value" @retry="detail.load" />
        <template v-else-if="order">
          <SuccessHero title="Cleared for takeoff!">
            Your <strong>{{ formatMoney(order.totals.total) }}</strong> is held safely in escrow.
            {{ sellerFirst }} has been notified and has {{ PLATFORM.dispatchDays }} days to ship.
          </SuccessHero>
          <p class="ref pw-mono">ORDER · {{ order.number }}</p>
          <ol class="steps" aria-label="Order progress">
            <li v-for="s in steps" :key="s.label" :class="s.state">
              <span class="steps__dot" aria-hidden="true"><ion-icon v-if="s.state === 'done'" :icon="checkmark" /><ion-icon v-else-if="s.state === 'current'" :icon="shieldOutline" /></span>
              <span class="steps__label">{{ s.label }}</span>
            </li>
          </ol>
        </template>
      </div>
    </ion-content>
    <ion-footer class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" class="pw-btn-lg" :router-link="`/orders/${id}`" router-direction="root">Track my order</ion-button>
        <ion-button expand="block" fill="clear" router-link="/tabs/home" router-direction="root">Continue shopping</ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonIcon, IonPage, IonSpinner, IonToolbar } from '@ionic/vue'
import { checkmark, shieldOutline } from 'ionicons/icons'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ordersApi } from '@/api/orders'
import ErrorState from '@/components/ErrorState.vue'
import SuccessHero from '@/components/SuccessHero.vue'
import { PLATFORM } from '@/constants/labels'
import { useAsync } from '@/composables/useAsync'
import { formatMoney } from '@/utils/money'

/** C5 — shown only after GET /payments/{ref} reported `successful`; data from GET /orders/{id}. */
const route = useRoute()
const id = String(route.params.id)
const detail = useAsync(() => ordersApi.get(id))
const order = computed(() => detail.data.value)
const sellerFirst = computed(() => order.value?.seller.displayName.split(/\s+/)[0] ?? 'The seller')

const steps = computed(() => {
  const escrow = order.value?.escrowStatus
  const shipped = ['in_transit', 'out_for_delivery', 'delivered', 'completed'].includes(order.value?.status ?? '')
  const landed = ['delivered', 'completed'].includes(order.value?.status ?? '')
  return [
    { label: 'Paid', state: 'done' },
    { label: 'Escrowed', state: escrow === 'held' && !shipped ? 'current' : 'done' },
    { label: 'Airborne', state: landed ? 'done' : shipped ? 'current' : 'upcoming' },
    { label: 'Landed', state: landed ? 'done' : 'upcoming' },
  ]
})
</script>

<style scoped>
.ok {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-5);
  padding: calc(var(--ion-safe-area-top, 0px) + 48px) var(--pw-gutter) var(--pw-space-6);
}

.center {
  text-align: center;
  padding: var(--pw-space-10);
}

.ref {
  align-self: center;
  padding: 12px 22px;
  border-radius: var(--pw-radius-lg);
  background: var(--pw-surface-muted);
  color: var(--pw-text-2);
  font-weight: 700;
  letter-spacing: 0.06em;
}

.steps {
  list-style: none;
  margin: 0;
  padding: var(--pw-space-5) var(--pw-space-3);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid var(--pw-border);
  border-radius: var(--pw-radius-xl);
}

.steps li {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.steps li:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 22px;
  left: calc(50% + 26px);
  right: calc(-50% + 26px);
  height: 3px;
  background: var(--pw-border);
}

.steps li.done:not(:last-child)::after {
  background: var(--pw-success-600);
}

.steps__dot {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--pw-border);
  color: #fff;
  font-size: 20px;
}

.done .steps__dot {
  background: var(--pw-success-600);
}

.current .steps__dot {
  background: var(--pw-navy-700);
  box-shadow: 0 0 0 5px var(--pw-primary-tint);
}

.steps__label {
  font-size: var(--pw-text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pw-text-3);
}

.done .steps__label {
  color: var(--pw-success-600);
}

.current .steps__label {
  color: var(--pw-primary);
}
</style>
