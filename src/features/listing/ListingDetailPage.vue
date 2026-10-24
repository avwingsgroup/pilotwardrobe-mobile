<template>
  <ion-page>
    <ion-content :fullscreen="true" class="pw-content-plain">
      <div v-if="detail.loading.value && !listing" class="loading">
        <div class="loading__img" />
        <div class="pw-pad pw-stack">
          <ion-skeleton-text animated style="width: 70%; height: 24px" />
          <ion-skeleton-text animated style="width: 40%; height: 32px" />
          <ion-skeleton-text animated style="width: 90%; height: 16px" />
        </div>
      </div>

      <template v-else-if="detail.error.value && !listing">
        <div class="err-back"><ion-back-button default-href="/tabs/home" text="" :icon="chevronBack" /></div>
        <ErrorState :error="detail.error.value" @retry="detail.load" />
      </template>

      <template v-else-if="listing">
        <!-- Gallery -->
        <div class="gallery">
          <div ref="galleryTrack" class="gallery__track" @scroll.passive="onGalleryScroll">
            <PwImage
              v-for="(img, i) in listing.images"
              :key="img.id"
              class="gallery__slide"
              :asset="img"
              :ratio="1.1"
              :width="430"
              fit="contain"
              :eager="i === 0"
              :alt="img.alt ?? `${listing.title} — photo ${i + 1}`"
            />
            <PwImage v-if="!listing.images.length" class="gallery__slide" :ratio="1.1" />
          </div>
          <div class="gallery__bar">
            <ion-back-button class="round" default-href="/tabs/home" text="" :icon="chevronBack" />
            <div class="gallery__actions">
              <button type="button" class="round" :aria-pressed="!!listing.isFavorited" :aria-label="listing.isFavorited ? 'Remove from saved' : 'Save'" @click="favorite.toggle(listing)">
                <ion-icon :icon="listing.isFavorited ? heart : heartOutline" :class="{ fav: listing.isFavorited }" />
              </button>
              <button type="button" class="round" aria-label="Share" @click="shareListing">
                <ion-icon :icon="shareSocialOutline" />
              </button>
            </div>
          </div>
          <div v-if="listing.images.length > 1" class="gallery__dots" aria-hidden="true">
            <span v-for="(_, i) in listing.images" :key="i" :class="{ on: i === slide }" />
          </div>
        </div>

        <div v-if="listing.images.length > 1" class="thumbs">
          <button
            v-for="(img, i) in listing.images.slice(0, 4)"
            :key="img.id"
            type="button"
            class="thumb"
            :class="{ on: i === slide }"
            :aria-label="`Show photo ${i + 1}`"
            @click="goToSlide(i)"
          >
            <PwImage :asset="img" :ratio="1" :width="64" fit="contain" />
          </button>
          <button v-if="listing.images.length > 4" type="button" class="thumb thumb--more" @click="goToSlide(4)">+{{ listing.images.length - 4 }}</button>
        </div>

        <div class="body pw-container">
          <div class="badges">
            <StatusBadge v-if="listing.seller.isOfficialStore" tone="navy" solid label="Official store" />
            <StatusBadge v-if="listing.promoted" tone="gold" solid :icon="star" label="Promoted" />
            <StatusBadge :tone="condition.tone" :label="condition.label" />
            <StatusBadge v-if="listing.status !== 'active'" :tone="statusLabel.tone" :label="statusLabel.label" />
          </div>
          <h1 class="title">{{ listing.title }}</h1>
          <p class="price">
            <span class="pw-price">{{ formatMoney(listing.price) }}</span>
            <span v-if="listing.compareAtPrice && listing.compareAtPrice.amount > listing.price.amount" class="pw-strike">{{ formatMoney(listing.compareAtPrice) }}</span>
          </p>
          <p class="freight">
            {{ listing.freightSummary ?? 'Tracked freight' }} ·
            <router-link to="/pages/escrow-disputes">buyer protection via escrow</router-link>
          </p>

          <!-- Sizes -->
          <section v-if="hasSizes" class="block">
            <div class="pw-row-between">
              <p class="label">Size: <span class="pw-muted">{{ size ?? 'Choose' }}</span></p>
              <router-link v-if="listing.sizes?.chart" :to="`/listing/${listing.slug}/size-chart`" class="pw-link small">
                <ion-icon :icon="resizeOutline" aria-hidden="true" /> Size chart
              </router-link>
            </div>
            <ChipGroup v-model="size" :options="sizeOptions" label="Size" />
            <div v-if="listing.sizes?.fitMatch" class="fit">
              <ion-icon :icon="resizeOutline" aria-hidden="true" />
              <span>
                <strong>{{ listing.sizes.fitMatch.profileName }}</strong> in your Fit Kit suggests <strong>{{ listing.sizes.fitMatch.size }}</strong>
                — {{ listing.sizes.fitMatch.summary }}
              </span>
              <button v-if="size !== listing.sizes.fitMatch.size" type="button" class="pw-link" @click="useFitSize">Use</button>
            </div>
          </section>

          <!-- Freight / arrival / returns -->
          <ion-accordion-group class="acc">
            <ion-accordion value="freight">
              <ion-item slot="header" lines="full">
                <ion-label>
                  <h3>Freight</h3>
                  <p>{{ cheapestShipping }}</p>
                </ion-label>
              </ion-item>
              <div slot="content" class="acc__content">
                <div v-for="s in listing.shipping ?? []" :key="s.id" class="pw-kv">
                  <dt>{{ s.label }}<br /><small class="pw-subtle">{{ s.description }}</small></dt>
                  <dd>{{ s.price.amount === 0 ? 'Free' : formatMoney(s.price) }}</dd>
                </div>
              </div>
            </ion-accordion>
            <ion-accordion v-if="arrival" value="arrival">
              <ion-item slot="header" lines="full">
                <ion-label>
                  <h3>Arrival</h3>
                  <p>Estimated {{ arrival }}</p>
                </ion-label>
              </ion-item>
              <div slot="content" class="acc__content pw-muted">
                Ships from {{ listing.location?.city ?? listing.seller.location ?? 'the seller' }}{{ listing.seller.dispatchTime ? ` · ${listing.seller.dispatchTime}` : '' }}.
              </div>
            </ion-accordion>
            <ion-accordion value="returns">
              <ion-item slot="header" lines="none">
                <ion-label>
                  <h3>Refund &amp; return</h3>
                  <p>{{ PLATFORM.inspectionHours }}-hour inspection window · funds in escrow</p>
                </ion-label>
              </ion-item>
              <div slot="content" class="acc__content pw-muted">
                Your payment is held in escrow until you confirm the item landed as described. Report a problem within {{ PLATFORM.inspectionHours }} hours
                of delivery to freeze the funds while a mediator reviews.
              </div>
            </ion-accordion>
          </ion-accordion-group>

          <!-- About -->
          <section class="block">
            <h2 class="pw-section-title">About this item</h2>
            <dl class="about">
              <div class="pw-kv"><dt>Condition</dt><dd>{{ condition.label }}</dd></div>
              <div v-for="a in listing.attributes ?? []" :key="a.label" class="pw-kv"><dt>{{ a.label }}</dt><dd>{{ a.value }}</dd></div>
              <div v-if="listing.aircraftTypes?.length" class="pw-kv"><dt>Aircraft</dt><dd>{{ listing.aircraftTypes.join(', ') }}</dd></div>
            </dl>
            <p class="desc" :class="{ 'desc--clamped': !expanded }">{{ listing.description }}</p>
            <button v-if="listing.description.length > 180" type="button" class="pw-link" @click="expanded = !expanded">
              {{ expanded ? 'Show less' : 'Read more' }}
            </button>
          </section>

          <!-- Seller -->
          <router-link :to="`/seller/${listing.seller.username}`" class="seller">
            <AvatarInitials :name="listing.seller.displayName" :image="listing.seller.avatar" :size="48" />
            <div class="seller__body">
              <p class="seller__name">{{ listing.seller.displayName }} <VerifiedShield v-if="listing.seller.verified" /></p>
              <p class="pw-muted small">
                ★ {{ listing.seller.rating.toFixed(1) }} · {{ listing.seller.totalSales ?? listing.seller.totalReviews }} sales{{ listing.seller.dispatchTime ? ` · ${listing.seller.dispatchTime}` : '' }}
              </p>
            </div>
            <span class="seller__visit">Visit</span>
          </router-link>

          <!-- Related -->
          <section v-if="related.data.value?.length" class="block">
            <div class="pw-row-between">
              <h2 class="pw-section-title">You might also like</h2>
              <router-link :to="`/tabs/search/results?category=${listing.category.slug}`" class="pw-link">See all</router-link>
            </div>
            <div class="pw-scroll-x">
              <ListingCard v-for="r in related.data.value" :key="r.id" class="rel" :listing="r" compact :show-favorite="false" :width="150" />
            </div>
          </section>
        </div>
      </template>
    </ion-content>

    <!-- Actions -->
    <ion-footer v-if="listing" class="pw-footer-bar actions">
      <ion-toolbar>
        <div v-if="isOwner" class="actions__row">
          <ion-button expand="block" class="pw-btn-lg actions__main" :router-link="`/sell/${listing.id}`">Edit listing</ion-button>
        </div>
        <div v-else-if="listing.status === 'active'" class="actions__row">
          <button type="button" class="icon-btn" aria-label="Message seller" :disabled="messaging" @click="messageSeller">
            <ion-icon :icon="chatboxOutline" />
          </button>
          <button v-if="listing.swappable" type="button" class="icon-btn" aria-label="Propose a swap" @click="proposeSwap">
            <ion-icon :icon="swapHorizontalOutline" />
          </button>
          <ion-button v-if="listing.negotiable" fill="outline" class="pw-btn-lg actions__half" @click="openOffer">Make offer</ion-button>
          <ion-button class="pw-btn-lg actions__half" @click="buyNow">Buy now</ion-button>
        </div>
        <p v-else class="actions__unavailable">This item is {{ statusLabel.label.toLowerCase() }} and can't be bought right now.</p>
      </ion-toolbar>
    </ion-footer>

    <ion-modal class="pw-sheet" :is-open="offerOpen" :initial-breakpoint="1" :breakpoints="[0, 1]" @did-dismiss="offerOpen = false">
      <MakeOfferSheet v-if="listing" :listing="listing" :size="size" @close="offerOpen = false" @sent="onOfferSent" />
    </ion-modal>
    <ion-modal class="pw-sheet" :is-open="fitOpen" :initial-breakpoint="1" :breakpoints="[0, 1]" @did-dismiss="fitOpen = false">
      <ChooseFitSheet v-if="listing" :listing="listing" :initial-size="size" @close="fitOpen = false" @apply="onSizeChosen" />
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonAccordion,
  IonAccordionGroup,
  IonBackButton,
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonPage,
  IonSkeletonText,
  IonToolbar,
  useIonRouter,
} from '@ionic/vue'
import { Share } from '@capacitor/share'
import {
  chatboxOutline,
  chevronBack,
  heart,
  heartOutline,
  resizeOutline,
  shareSocialOutline,
  star,
  swapHorizontalOutline,
} from 'ionicons/icons'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { catalogueApi } from '@/api/catalogue'
import { messagesApi } from '@/api/messages'
import AvatarInitials from '@/components/AvatarInitials.vue'
import ChipGroup from '@/components/ChipGroup.vue'
import ErrorState from '@/components/ErrorState.vue'
import ListingCard from '@/components/ListingCard.vue'
import PwImage from '@/components/PwImage.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import VerifiedShield from '@/components/VerifiedShield.vue'
import { appConfig } from '@/config/env'
import { CONDITION_LABELS, LISTING_STATUS, PLATFORM, labelFor } from '@/constants/labels'
import { useAsync } from '@/composables/useAsync'
import { useAuthGate } from '@/composables/useAuthGate'
import { useFavorite } from '@/composables/useFavorite'
import { useFeedback } from '@/composables/useFeedback'
import { track } from '@/services/analytics'
import { useAuthStore } from '@/stores/auth'
import type { Listing } from '@/types'
import { dateRangeLabel } from '@/utils/date'
import { formatMoney } from '@/utils/money'
import ChooseFitSheet from './ChooseFitSheet.vue'
import MakeOfferSheet from './MakeOfferSheet.vue'
import { selectedSizes } from './sizeSelection'

/** B10 — GET /listings/{slug} + /related. Actions are gated; the API re-checks all of them. */
const route = useRoute()
const router = useIonRouter()
const auth = useAuthStore()
const { requireAuth, requirePermission } = useAuthGate()
const { toast, toastError } = useFeedback()

const slug = computed(() => String(route.params.slug ?? ''))
const detail = useAsync<Listing>(() => catalogueApi.listing(slug.value))
const related = useAsync<Listing[]>(() => catalogueApi.related(slug.value))
const listing = computed(() => detail.data.value)

watch(listing, (l) => l && track({ name: 'product_viewed', params: { listing_id: l.id } }), { once: true })

const favorite = useFavorite((updated) => (detail.data.value = updated))

const condition = computed(() => (listing.value ? CONDITION_LABELS[listing.value.condition] : CONDITION_LABELS.good))
const statusLabel = computed(() => labelFor(LISTING_STATUS, listing.value?.status ?? 'active'))
const isOwner = computed(() => !!auth.user && listing.value?.seller.id === auth.user.id)

/* Gallery */
const galleryTrack = ref<HTMLElement | null>(null)
const slide = ref(0)
function onGalleryScroll(e: Event) {
  const el = e.target as HTMLElement
  slide.value = Math.round(el.scrollLeft / el.clientWidth)
}
function goToSlide(i: number) {
  const el = galleryTrack.value
  el?.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
}

/* Sizes */
const hasSizes = computed(() => !!listing.value?.sizes && (listing.value.sizes.available.length > 0 || listing.value.sizes.unavailable.length > 0))
const size = computed<string | null>({
  get: () => selectedSizes[slug.value] ?? null,
  set: (value) => (selectedSizes[slug.value] = value),
})
watch(
  listing,
  (l) => {
    if (!size.value && l?.sizes?.fitMatch && l.sizes.available.includes(l.sizes.fitMatch.size)) size.value = l.sizes.fitMatch.size
  },
  { immediate: true },
)
function useFitSize() {
  const match = listing.value?.sizes?.fitMatch
  if (match) size.value = match.size
}
const sizeOptions = computed(() => [
  ...(listing.value?.sizes?.available ?? []).map((s) => ({ value: s, label: s })),
  ...(listing.value?.sizes?.unavailable ?? []).map((s) => ({ value: s, label: s, disabled: true })),
])

const cheapestShipping = computed(() => {
  const options = [...(listing.value?.shipping ?? [])].sort((a, b) => a.price.amount - b.price.amount)
  const first = options[0]
  if (!first) return 'Arranged with the seller'
  return `${first.price.amount === 0 ? 'Free' : formatMoney(first.price)} ${first.label.toLowerCase()} · ${first.description}`
})

const arrival = computed(() => {
  const s = listing.value?.shipping?.[0]?.estimatedDays
  if (!s) return null
  const now = Date.now()
  return dateRangeLabel(new Date(now + s.min * 86_400_000).toISOString(), new Date(now + s.max * 86_400_000).toISOString())
})

const expanded = ref(false)

/* Actions */
const offerOpen = ref(false)
const fitOpen = ref(false)
const messaging = ref(false)

function openOffer() {
  if (requirePermission('offers.create')) offerOpen.value = true
}

function onOfferSent() {
  offerOpen.value = false
  router.push('/tabs/inbox/offers?box=sent')
}

function goToCheckout(chosenSize: string | null) {
  const l = listing.value!
  track({ name: 'checkout_started', params: { listing_id: l.id } })
  router.push(`/checkout?listing=${encodeURIComponent(l.id)}${chosenSize ? `&size=${encodeURIComponent(chosenSize)}` : ''}`)
}

function buyNow() {
  if (!requirePermission('orders.create')) return
  if (hasSizes.value && !size.value) {
    fitOpen.value = true
    return
  }
  goToCheckout(size.value)
}

function onSizeChosen(chosen: string) {
  size.value = chosen
  fitOpen.value = false
  goToCheckout(chosen)
}

function proposeSwap() {
  if (requirePermission('swaps.create')) router.push(`/swap/${listing.value!.slug}`)
}

async function messageSeller() {
  if (!requireAuth() || messaging.value) return
  messaging.value = true
  try {
    const conversation = await messagesApi.start(listing.value!.id)
    router.push(`/conversations/${conversation.id}`)
  } catch (e) {
    await toastError(e)
  } finally {
    messaging.value = false
  }
}

async function shareListing() {
  const l = listing.value!
  const url = `${appConfig.webAppUrl}/marketplace/${l.slug}`
  try {
    const { value } = await Share.canShare()
    if (value) await Share.share({ title: l.title, text: `${l.title} — ${formatMoney(l.price)} on Pilotwardrobe`, url })
    else {
      await navigator.clipboard?.writeText(url)
      await toast('Link copied.', 'success')
    }
  } catch {
    // User dismissed the share sheet.
  }
}
</script>

<style scoped>
.loading__img {
  aspect-ratio: 1.1;
  background: var(--pw-image-bg);
}

.err-back {
  padding: calc(var(--ion-safe-area-top, 0px) + 8px) 8px 0;
}

.gallery {
  position: relative;
  background: var(--pw-image-bg);
}

.gallery__track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.gallery__track::-webkit-scrollbar {
  display: none;
}

.gallery__slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
  background: transparent;
}

.gallery__bar {
  position: absolute;
  top: calc(var(--ion-safe-area-top, 0px) + 10px);
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
}

.gallery__actions {
  display: flex;
  gap: 10px;
}

.round {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 0;
  background: rgb(255 255 255 / 94%);
  color: #101a2d;
  display: grid;
  place-items: center;
  font-size: 22px;
  box-shadow: var(--pw-shadow-sm);
  --color: #101a2d;
}

.fav {
  color: var(--pw-danger-600);
}

.gallery__dots {
  position: absolute;
  bottom: 12px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 6px;
}

.gallery__dots span {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: rgb(255 255 255 / 85%);
  border: 1px solid var(--pw-border);
}

.gallery__dots span.on {
  width: 22px;
  background: var(--pw-navy-700);
}

.thumbs {
  display: flex;
  gap: 10px;
  padding: var(--pw-space-3) var(--pw-gutter) 0;
  overflow-x: auto;
}

.thumb {
  flex: 0 0 64px;
  width: 64px;
  border-radius: var(--pw-radius-md);
  border: 1.5px solid var(--pw-border);
  background: var(--pw-surface);
  padding: 0;
  overflow: hidden;
}

.thumb.on {
  border: 2.5px solid var(--pw-primary);
}

.thumb--more {
  display: grid;
  place-items: center;
  color: var(--pw-text-2);
  font-weight: 600;
  aspect-ratio: 1;
}

.body {
  padding: var(--pw-space-4) var(--pw-gutter) var(--pw-space-8);
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-3);
}

.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.title {
  font-size: var(--pw-text-xl);
  font-weight: 700;
  line-height: 1.25;
}

.price {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.price .pw-price {
  font-size: 2rem;
}

.freight {
  color: var(--pw-text-2);
  font-size: var(--pw-text-sm);
}

.block {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-3);
  margin-top: var(--pw-space-3);
}

.label {
  font-weight: 600;
}

.small {
  font-size: var(--pw-text-sm);
}

.fit {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: var(--pw-space-3) var(--pw-space-4);
  border: 1.5px solid var(--pw-navy-100);
  border-radius: var(--pw-radius-md);
  background: var(--pw-navy-50);
  color: var(--pw-primary);
  font-size: var(--pw-text-sm);
  line-height: 1.45;
}

.fit span {
  flex: 1 1 auto;
}

.acc {
  margin-top: var(--pw-space-3);
  border-radius: var(--pw-radius-lg);
  overflow: hidden;
  border: 1px solid var(--pw-border);
}

.acc ion-item {
  --background: var(--pw-surface-muted);
}

.acc h3 {
  color: var(--pw-primary);
  font-weight: 600;
  font-family: var(--pw-font-display);
}

.acc__content {
  padding: var(--pw-space-3) var(--pw-space-4);
  background: var(--pw-surface);
  line-height: 1.5;
}

.about {
  margin: 0;
}

.desc {
  line-height: 1.6;
  color: var(--pw-text-2);
}

.desc--clamped {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.seller {
  display: flex;
  align-items: center;
  gap: var(--pw-space-3);
  padding: var(--pw-space-4);
  border: 1px solid var(--pw-border);
  border-radius: var(--pw-radius-lg);
  text-decoration: none;
  color: inherit;
  margin-top: var(--pw-space-3);
}

.seller__body {
  flex: 1 1 auto;
  min-width: 0;
}

.seller__name {
  font-weight: 600;
}

.seller__visit {
  padding: 8px 18px;
  border: 1.5px solid var(--pw-primary);
  border-radius: var(--pw-radius-full);
  color: var(--pw-primary);
  font-weight: 600;
}

.rel {
  flex: 0 0 150px;
}

.actions__row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.icon-btn {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: var(--pw-radius-md);
  border: 1.5px solid var(--pw-border);
  background: var(--pw-surface);
  color: var(--pw-text);
  font-size: 22px;
  display: grid;
  place-items: center;
}

.actions__half {
  flex: 1 1 0;
  margin: 0;
}

.actions__main {
  flex: 1 1 auto;
}

.actions__unavailable {
  text-align: center;
  color: var(--pw-text-2);
  padding: var(--pw-space-2) 0;
}
</style>
