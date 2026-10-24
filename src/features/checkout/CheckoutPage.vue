<template>
  <ion-page>
    <AppHeader :title="titles[step - 1] ?? 'Checkout'" :step="step" :total="4" @back="back" />

    <ion-content>
      <div class="pw-pad pw-stack pw-container">
        <!-- C1 Destination -->
        <template v-if="step === 1">
          <h2 class="pw-section-title">Destination</h2>
          <template v-if="addresses.loading.value">
            <ion-skeleton-text v-for="n in 2" :key="n" animated style="height: 120px; border-radius: 16px" />
          </template>
          <ErrorState v-else-if="addresses.error.value" :error="addresses.error.value" @retry="addresses.load" />
          <div v-else class="pw-stack-sm" role="radiogroup" aria-label="Delivery address">
            <RadioCard
              v-for="a in addresses.data.value ?? []"
              :key="a.id"
              radio-position="start"
              :selected="addressId === a.id"
              @select="selectAddress(a.id)"
            >
              <template #title>{{ a.label || a.fullName }} <span v-if="a.label" class="pw-muted phone">· {{ a.fullName }}</span></template>
              <template #description>
                {{ [a.line1, a.line2, a.city, a.state, countryName(a.countryCode)].filter(Boolean).join(', ') }}<br />
                <span class="phone">{{ a.phone }}</span>
              </template>
              <div class="addr-meta">
                <router-link :to="`/settings/addresses/${a.id}`" class="pw-link" @click.stop>Edit</router-link>
                <StatusBadge v-if="a.isDefault" tone="navy" label="Default" />
              </div>
            </RadioCard>
          </div>
          <router-link to="/settings/addresses/new" class="add">
            <ion-icon :icon="add" aria-hidden="true" /> Add new address
          </router-link>
        </template>

        <!-- C2 Flight plan -->
        <template v-else-if="step === 2">
          <template v-if="quoting && !quote">
            <ion-skeleton-text v-for="n in 3" :key="n" animated style="height: 90px; border-radius: 16px" />
          </template>
          <div v-else-if="quote" class="pw-stack-sm" role="radiogroup" aria-label="Shipping option">
            <RadioCard v-for="s in quote.shippingOptions" :key="s.id" :selected="shippingId === s.id" :title="s.label" :description="s.description" @select="selectShipping(s.id)">
              <template #media>
                <span class="ship-icon" aria-hidden="true"><ion-icon :icon="shipIcon(s.method)" /></span>
              </template>
              <template #aside>
                <strong :class="s.price.amount === 0 ? 'free' : 'pw-price'">{{ s.price.amount === 0 ? 'Free' : formatMoney(s.price) }}</strong>
              </template>
            </RadioCard>
          </div>
          <p class="pw-callout"><ion-icon :icon="shieldCheckmarkOutline" aria-hidden="true" />Every shipment is escrow-protected. The seller is paid only after you confirm arrival.</p>
        </template>

        <!-- C3 Payment -->
        <template v-else-if="step === 3">
          <GatewayPicker v-if="quote" v-model="gateway" :currency="quote.totals.total.currency" :country="selectedAddress?.countryCode ?? auth.user?.countryCode" />
          <section class="pw-card pw-stack-sm">
            <h3 class="pw-eyebrow">Add discount / promo code</h3>
            <div class="promo">
              <ion-input v-model="promoInput" class="pw-input" fill="outline" placeholder="Enter code" autocapitalize="characters" aria-label="Promo code" />
              <ion-button color="dark" :disabled="!promoInput.trim() || quoting" @click="applyPromo">Apply</ion-button>
            </div>
            <p v-if="promoError" class="err">{{ promoError }}</p>
            <p v-else-if="promoCode && quote?.totals.discount" class="ok">Code {{ promoCode }} applied · −{{ formatMoney(quote.totals.discount) }}</p>
          </section>
        </template>

        <!-- C4 Review -->
        <template v-else-if="quote">
          <ItemSummary v-for="item in quote.items" :key="item.id" :title="item.title" :image="item.image" :price="item.price" :subtitle="item.size ? `Size ${item.size}` : undefined" />
          <section class="pw-card">
            <div class="pw-row-between">
              <span class="pw-muted">Destination</span>
              <button type="button" class="pw-link" @click="step = 1">Change</button>
            </div>
            <p class="dest">{{ selectedAddress ? `${selectedAddress.fullName} · ${selectedAddress.line1}, ${selectedAddress.city}` : '—' }}</p>
            <hr class="pw-divider" />
            <dl>
              <div class="pw-kv"><dt>Flight plan</dt><dd>{{ selectedShipping?.label ?? '—' }}{{ eta ? ` · ${eta.days}` : '' }}</dd></div>
              <div class="pw-kv"><dt>Payment</dt><dd>{{ gatewayName }}</dd></div>
              <div v-if="eta" class="pw-kv"><dt>ETA</dt><dd>{{ eta.range }}</dd></div>
            </dl>
          </section>
          <section class="pw-card">
            <dl>
              <div class="pw-kv"><dt>Subtotal</dt><dd>{{ formatMoney(quote.totals.items) }}</dd></div>
              <div class="pw-kv"><dt>Freight{{ selectedShipping ? ` (${selectedShipping.label})` : '' }}</dt><dd>{{ formatMoney(quote.totals.freight) }}</dd></div>
              <div class="pw-kv"><dt>Buyer protection fee</dt><dd>{{ formatMoney(quote.totals.buyerProtection) }}</dd></div>
              <div v-if="quote.totals.duties" class="pw-kv"><dt>Estimated duties</dt><dd>{{ formatMoney(quote.totals.duties) }}</dd></div>
              <div v-if="quote.totals.discount" class="pw-kv"><dt>Discount</dt><dd class="ok">−{{ formatMoney(quote.totals.discount) }}</dd></div>
            </dl>
            <hr class="pw-divider" />
            <div class="pw-kv total"><dt>Total</dt><dd class="pw-price">{{ formatMoney(quote.totals.total) }}</dd></div>
          </section>
          <p class="pw-callout small">
            By tapping "Pay now", you confirm you have read Pilotwardrobe's <router-link to="/pages/terms">Terms</router-link> and
            <router-link to="/pages/privacy">Privacy policy</router-link>. {{ quote.escrowNote ?? 'Funds are held in escrow until you confirm arrival.' }}
          </p>
        </template>

        <p v-if="error" class="pw-callout pw-callout--danger" role="alert">{{ error }}</p>
      </div>
    </ion-content>

    <ion-footer class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" class="pw-btn-lg" :disabled="!canContinue || busy || payment.starting.value" @click="next">
          <ion-spinner v-if="busy || payment.starting.value" name="crescent" />
          <span v-else>{{ ctaLabel }}</span>
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonIcon, IonInput, IonPage, IonSkeletonText, IonSpinner, IonToolbar, onIonViewWillEnter, useBackButton, useIonRouter } from '@ionic/vue'
import { add, airplaneOutline, carOutline, locationOutline, shieldCheckmarkOutline } from 'ionicons/icons'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { accountApi } from '@/api/account'
import { toApiError } from '@/api/errors'
import { ordersApi } from '@/api/orders'
import AppHeader from '@/components/AppHeader.vue'
import ErrorState from '@/components/ErrorState.vue'
import ItemSummary from '@/components/ItemSummary.vue'
import RadioCard from '@/components/RadioCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { COUNTRIES } from '@/constants/labels'
import { useAsync } from '@/composables/useAsync'
import { useAuthStore } from '@/stores/auth'
import type { Address, CheckoutQuote, CheckoutRequest, PaymentGateway } from '@/types'
import { dateRangeLabel } from '@/utils/date'
import { uuid } from '@/utils/id'
import { formatMoney } from '@/utils/money'
import GatewayPicker from './GatewayPicker.vue'
import { usePaymentFlow } from './usePaymentFlow'

/**
 * C1–C4. Totals ALWAYS come from POST /checkout/quote (pure) and POST /orders
 * re-quotes server-side; the app never computes or sends totals. The order is
 * created once (Idempotency-Key) and reused if payment initialisation is retried.
 */
const route = useRoute()
const router = useIonRouter()
const auth = useAuthStore()
const payment = usePaymentFlow()

const titles = ['Checkout', 'Flight plan', 'Payment', 'Review order']
const listingId = String(route.query.listing ?? '')
const size = route.query.size ? String(route.query.size) : null
const offerId = route.query.offer ? String(route.query.offer) : null

const step = ref(1)
const addresses = useAsync<Address[]>(() => accountApi.addresses())
const addressId = ref<string | null>(null)
const shippingId = ref<string | null>(null)
const gateway = ref<PaymentGateway | null>(null)
const promoInput = ref('')
const promoCode = ref<string | null>(null)
const promoError = ref<string | null>(null)
const quote = ref<CheckoutQuote | null>(null)
const quoting = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const orderIdempotencyKey = uuid()
const createdOrderId = ref<string | null>(null)

// Addresses may be added/edited on another screen; refresh on return.
onIonViewWillEnter(() => {
  if (addresses.data.value) void addresses.refresh()
})
watch(
  () => addresses.data.value,
  (list) => {
    if (!list?.length) return
    if (!addressId.value || !list.some((a) => a.id === addressId.value)) addressId.value = (list.find((a) => a.isDefault) ?? list[0])!.id
  },
)

const selectedAddress = computed(() => addresses.data.value?.find((a) => a.id === addressId.value) ?? null)
const selectedShipping = computed(() => quote.value?.shippingOptions.find((s) => s.id === shippingId.value) ?? null)
const countryName = (code: string) => COUNTRIES.find((c) => c.code === code)?.name ?? code

const request = (): CheckoutRequest => ({
  listingId,
  size,
  offerId,
  addressId: addressId.value,
  shippingOptionId: shippingId.value,
  promoCode: promoCode.value,
})

let quoteController: AbortController | null = null
async function requote(): Promise<boolean> {
  quoteController?.abort()
  quoteController = new AbortController()
  quoting.value = true
  error.value = null
  try {
    const q = await ordersApi.quote(request(), quoteController.signal)
    quote.value = q
    if (!shippingId.value || !q.shippingOptions.some((s) => s.id === shippingId.value)) shippingId.value = q.selectedShippingId ?? q.shippingOptions[0]?.id ?? null
    return true
  } catch (e) {
    const err = toApiError(e)
    if (!err.isCancelled) error.value = err.message
    return false
  } finally {
    quoting.value = false
  }
}

function selectAddress(id: string) {
  addressId.value = id
  quote.value = null
}

function selectShipping(id: string) {
  shippingId.value = id
  void requote()
}

async function applyPromo() {
  promoError.value = null
  const previous = promoCode.value
  promoCode.value = promoInput.value.trim().toUpperCase()
  quoting.value = true
  try {
    quote.value = await ordersApi.quote(request())
  } catch (e) {
    const err = toApiError(e)
    promoError.value = err.field('promoCode') ?? err.message
    promoCode.value = previous
  } finally {
    quoting.value = false
  }
}

const shipIcon = (method: string) => (/express|air/.test(method) ? airplaneOutline : /handoff|pickup|self/.test(method) ? locationOutline : carOutline)

const eta = computed(() => {
  const d = selectedShipping.value?.estimatedDays
  if (!d) return null
  const now = Date.now()
  return {
    days: `${d.min}–${d.max} days`,
    range: dateRangeLabel(new Date(now + d.min * 86_400_000).toISOString(), new Date(now + d.max * 86_400_000).toISOString()),
  }
})

const gatewayName = computed(() => (gateway.value ? gateway.value.charAt(0).toUpperCase() + gateway.value.slice(1) : '—'))

const canContinue = computed(() => {
  if (!listingId) return false
  if (step.value === 1) return !!addressId.value
  if (step.value === 2) return !!shippingId.value && !!quote.value
  if (step.value === 3) return !!gateway.value && !quoting.value
  return !!quote.value && !quoting.value
})

const ctaLabel = computed(() => {
  if (step.value === 1) return 'Continue to flight plan'
  if (step.value === 2) return 'Continue to payment'
  if (step.value === 3) return 'Review order'
  return quote.value ? `Pay now · ${formatMoney(quote.value.totals.total)}` : 'Pay now'
})

async function next() {
  error.value = null
  if (step.value === 1) {
    if (await requote()) step.value = 2
    return
  }
  if (step.value === 2) {
    step.value = 3
    return
  }
  if (step.value === 3) {
    if (await requote()) step.value = 4
    return
  }
  await pay()
}

async function pay() {
  if (busy.value || !gateway.value) return
  busy.value = true
  try {
    if (!createdOrderId.value) {
      const res = await ordersApi.create(request(), { idempotencyKey: orderIdempotencyKey })
      createdOrderId.value = res.data.id
    }
    await payment.start({ orderId: createdOrderId.value }, gateway.value, `/orders/${createdOrderId.value}/confirmed`)
  } catch (e) {
    const err = toApiError(e)
    error.value = err.message
    // A 409 means availability or price changed: refresh the quote so the user sees reality.
    if (err.status === 409 || err.isValidation) void requote()
  } finally {
    busy.value = false
  }
}

function back() {
  if (step.value > 1) step.value -= 1
  else if (router.canGoBack()) router.back()
  else router.navigate('/tabs/home', 'back', 'replace')
}

useBackButton(10, (processNext) => {
  if (step.value > 1) step.value -= 1
  else processNext()
})
</script>

<style scoped>
.phone {
  color: var(--pw-text-2);
  font-weight: 400;
}

.addr-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}

.add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 72px;
  border: 2px dashed var(--pw-border-strong);
  border-radius: var(--pw-radius-lg);
  color: var(--pw-primary);
  font-weight: 600;
  font-size: var(--pw-text-md);
  text-decoration: none;
}

.ship-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: var(--pw-radius-md);
  background: var(--pw-navy-50);
  color: var(--pw-primary);
  font-size: 26px;
}

.free,
.ok {
  color: var(--pw-success-600);
  font-weight: 700;
}

.promo {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.promo ion-input {
  flex: 1 1 auto;
}

.promo ion-button {
  margin: 0;
  --border-radius: var(--pw-radius-md);
}

.err {
  color: var(--pw-danger-600);
  font-size: var(--pw-text-sm);
}

.dest {
  margin: 8px 0 12px;
  line-height: 1.5;
}

.total dt {
  font-weight: 700;
  color: var(--pw-text);
  font-size: var(--pw-text-lg);
}

.total .pw-price {
  font-size: 1.75rem;
}

.small {
  font-size: var(--pw-text-sm);
}
</style>
