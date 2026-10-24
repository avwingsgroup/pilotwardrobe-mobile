<template>
  <ion-page>
    <AppHeader title="Propose a swap" :default-href="`/listing/${slug}`" />
    <ion-content>
      <div v-if="target.loading.value && !target.data.value" class="pw-pad"><ion-skeleton-text animated style="height: 300px; border-radius: 16px" /></div>
      <ErrorState v-else-if="target.error.value && !target.data.value" :error="target.error.value" @retry="target.load" />

      <div v-else-if="target.data.value" class="pw-pad pw-stack pw-container">
        <div v-if="!auth.kycApproved" class="pw-callout pw-callout--warning" role="note">
          <ion-icon :icon="shieldCheckmarkOutline" aria-hidden="true" />
          <span>Swaps need a verified identity. <router-link :to="`/verification?next=/swap/${slug}`">Verify now</router-link></span>
        </div>

        <h2 class="pw-eyebrow">You want</h2>
        <ItemSummary
          :title="target.data.value.title"
          :image="target.data.value.images[0]"
          :subtitle="`${target.data.value.seller.displayName}${target.data.value.negotiable ? '' : ' · Swap only'}`"
        >
          <template #aside><strong class="pw-price">{{ formatMoney(target.data.value.price, { whole: true }) }}</strong></template>
        </ItemSummary>

        <div class="swap-icon" aria-hidden="true"><ion-icon :icon="swapVerticalOutline" /></div>

        <h2 class="pw-eyebrow">You offer</h2>
        <div v-if="mine.loading.value" class="pw-card"><ion-skeleton-text animated style="height: 60px" /></div>
        <EmptyState
          v-else-if="!mine.items.value.length"
          compact
          :icon="pricetagOutline"
          title="Nothing to offer yet"
          message="List an item first — you can only swap your own live listings."
          action-label="List an item"
          action-to="/sell"
        />
        <button v-else type="button" class="offered" @click="pickerOpen = true">
          <ItemSummary
            v-if="offered"
            :card="false"
            :title="offered.title"
            :image="offered.images[0]"
            :subtitle="`From your listings · ${CONDITION_LABELS[offered.condition]?.label ?? ''}`"
          >
            <template #aside>
              <strong class="pw-price">{{ formatMoney(offered.price, { whole: true }) }}</strong>
              <p class="pw-link">Change</p>
            </template>
          </ItemSummary>
          <span v-else class="pw-link">Choose an item from your listings</span>
        </button>

        <section class="pw-card pw-stack-sm">
          <div class="pw-row-between">
            <div>
              <p class="strong">Add cash to balance the trade</p>
              <p class="pw-muted small">Held in escrow like any payment</p>
            </div>
            <ion-toggle v-model="addCash" aria-label="Add cash" />
          </div>
          <AmountInput v-if="addCash" v-model="cash" size="sm" prefix="+" :currency="currency" label="Cash top-up" :error="fieldError('cashAdjustment.amount')" />
        </section>

        <section v-if="offered" class="pw-card">
          <dl>
            <div class="pw-kv">
              <dt>Your item{{ addCash && cash ? ' + cash' : '' }}</dt>
              <dd>{{ formatMoney({ amount: yourSide, currency }, { whole: true }) }}</dd>
            </div>
            <div class="pw-kv"><dt>Their item value</dt><dd>{{ formatMoney(target.data.value.price, { whole: true }) }}</dd></div>
          </dl>
          <hr class="pw-divider" />
          <div class="pw-kv balance">
            <dt>Trade balance</dt>
            <dd :class="balance.tone">{{ balance.label }}</dd>
          </div>
        </section>

        <TextField v-model="message" label="Message" hint="optional" multiline :rows="2" :maxlength="500" placeholder="Say hello and explain the trade" />
        <p v-if="formError" class="pw-callout pw-callout--danger" role="alert">{{ formError }}</p>
      </div>
    </ion-content>

    <ion-footer v-if="target.data.value" class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" class="pw-btn-lg" :disabled="submitting || !offered" @click="submit">
          <ion-spinner v-if="submitting" name="crescent" />
          <span v-else>Send swap proposal</span>
        </ion-button>
      </ion-toolbar>
    </ion-footer>

    <ion-modal class="pw-sheet" :is-open="pickerOpen" :initial-breakpoint="0.7" :breakpoints="[0, 0.7, 1]" @did-dismiss="pickerOpen = false">
      <ion-content class="pw-content-plain">
        <div class="pw-pad pw-stack-sm">
          <h2 class="pw-title">Your live listings</h2>
          <RadioCard
            v-for="l in mine.items.value"
            :key="l.id"
            :selected="offered?.id === l.id"
            :title="l.title"
            :description="formatMoney(l.price)"
            @select="choose(l)"
          >
            <template #media><PwImage :asset="l.images[0]" :ratio="1" :width="56" fit="contain" class="pick-img" /></template>
          </RadioCard>
          <ion-infinite-scroll :disabled="!mine.hasMore.value" @ion-infinite="mine.loadMore"><ion-infinite-scroll-content /></ion-infinite-scroll>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonModal,
  IonPage,
  IonSkeletonText,
  IonSpinner,
  IonToggle,
  IonToolbar,
  useIonRouter,
} from '@ionic/vue'
import { pricetagOutline, shieldCheckmarkOutline, swapVerticalOutline } from 'ionicons/icons'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { catalogueApi } from '@/api/catalogue'
import { ApiError, toApiError } from '@/api/errors'
import { sellingApi } from '@/api/selling'
import { tradesApi } from '@/api/trades'
import AmountInput from '@/components/AmountInput.vue'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import ItemSummary from '@/components/ItemSummary.vue'
import PwImage from '@/components/PwImage.vue'
import RadioCard from '@/components/RadioCard.vue'
import TextField from '@/components/TextField.vue'
import { CONDITION_LABELS } from '@/constants/labels'
import { useAsync } from '@/composables/useAsync'
import { useFeedback } from '@/composables/useFeedback'
import { usePagedList } from '@/composables/usePagedList'
import { track } from '@/services/analytics'
import { useAuthStore } from '@/stores/auth'
import type { Listing } from '@/types'
import { uuid } from '@/utils/id'
import { formatMoney } from '@/utils/money'

/**
 * T2 — POST /listings/{id}/swap-requests (KYC required; Idempotency-Key). The
 * balance line is an informational estimate; the backend values the trade.
 */
const route = useRoute()
const router = useIonRouter()
const auth = useAuthStore()
const { toast } = useFeedback()

const slug = String(route.params.slug)
const target = useAsync<Listing>(() => catalogueApi.listing(slug))
const mine = usePagedList((page) => sellingApi.myListings({ status: 'active', page, perPage: 30 }))
onMounted(() => void mine.loadFirst())

const offered = ref<Listing | null>(null)
watch(mine.items, (items) => {
  if (!offered.value && items.length) offered.value = items.find((l) => l.price.currency === currency.value) ?? items[0] ?? null
})
const pickerOpen = ref(false)
const addCash = ref(false)
const cash = ref<number | null>(null)
const message = ref('')
const submitting = ref(false)
const formError = ref<string | null>(null)
const lastError = ref<ApiError | null>(null)
const idempotencyKey = uuid()

const currency = computed(() => target.data.value?.price.currency ?? 'USD')
const yourSide = computed(() => (offered.value?.price.amount ?? 0) + (addCash.value ? (cash.value ?? 0) : 0))
const balance = computed(() => {
  const theirs = target.data.value?.price.amount ?? 0
  if (!theirs) return { label: '—', tone: '' }
  const diff = (yourSide.value - theirs) / theirs
  const pct = Math.round(Math.abs(diff) * 100)
  if (pct <= 5) return { label: `Fair · within ${Math.max(1, pct)}%`, tone: 'good' }
  return diff < 0 ? { label: `${pct}% below their value`, tone: 'warn' } : { label: `${pct}% above their value`, tone: 'warn' }
})

const fieldError = (key: string) => lastError.value?.field(key)

function choose(l: Listing) {
  offered.value = l
  pickerOpen.value = false
}

async function submit() {
  if (submitting.value || !offered.value || !target.data.value) return
  submitting.value = true
  formError.value = null
  lastError.value = null
  try {
    const res = await tradesApi.proposeSwap(
      target.data.value.id,
      {
        offeredListingIds: [offered.value.id],
        cashAdjustment: addCash.value && cash.value ? { amount: cash.value, currency: currency.value } : null,
        message: message.value.trim() || null,
      },
      { idempotencyKey },
    )
    track({ name: 'swap_submitted', params: { listing_id: target.data.value.id } })
    await toast(res.message ?? 'Swap proposal sent.', 'success')
    router.navigate('/tabs/inbox/offers?box=sent', 'forward', 'replace')
  } catch (e) {
    const err = toApiError(e)
    lastError.value = err
    formError.value = err.fieldErrors['offeredListingIds']?.[0] ?? err.message
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.swap-icon {
  align-self: center;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--pw-primary);
  color: var(--pw-primary-contrast);
  font-size: 26px;
  border: 4px solid var(--pw-surface);
  box-shadow: var(--pw-shadow-md);
  margin: -8px 0;
}

.offered {
  width: 100%;
  padding: var(--pw-space-4);
  border: 2.5px solid var(--pw-primary);
  border-radius: var(--pw-radius-lg);
  background: var(--pw-surface);
  text-align: left;
  font: inherit;
  color: inherit;
}

.strong {
  font-weight: 600;
  font-size: var(--pw-text-md);
}

.small {
  font-size: var(--pw-text-sm);
}

.balance dt {
  color: var(--pw-text);
  font-weight: 600;
}

.good {
  color: var(--pw-success-600);
  font-weight: 600;
}

.warn {
  color: var(--pw-warning-700);
  font-weight: 600;
}

.pick-img {
  width: 56px;
  border-radius: var(--pw-radius-sm);
}
</style>
