<template>
  <ion-page>
    <AppHeader
      title="New listing"
      :close="step === 1"
      close-label="Close listing editor"
      :step="step"
      :total="6"
      @close="exit"
      @back="prev"
    />

    <ion-content>
      <div v-if="loadingExisting" class="pw-pad"><ion-skeleton-text animated style="height: 300px; border-radius: 16px" /></div>
      <ErrorState v-else-if="loadError" :error="loadError" @retry="loadExisting" />

      <div v-else class="pw-pad pw-stack pw-container wiz">
        <!-- S1 Photos -->
        <template v-if="step === 1">
          <h1 class="pw-title">Add photos</h1>
          <p class="pw-body">First photo becomes your cover. Up to {{ MAX_PHOTOS }} — listings with 4+ photos sell twice as fast.</p>
          <div class="photos">
            <div v-for="(p, i) in draft.photos.value" :key="p.key" class="photo">
              <img v-if="p.previewUrl || p.asset" :src="p.previewUrl || mediaUrl(p.asset, 'small') || ''" :alt="`Photo ${i + 1}`" />
              <span v-if="i === 0" class="photo__cover">Cover</span>
              <button type="button" class="photo__menu" :aria-label="`Options for photo ${i + 1}`" @click="photoMenu(p.key, i)">
                <ion-icon :icon="ellipsisHorizontal" />
              </button>
              <div v-if="!p.asset && !p.error" class="photo__progress" :aria-label="`Uploading ${Math.round(p.progress * 100)}%`">
                <ion-progress-bar :value="p.progress" />
              </div>
              <button v-if="p.error" type="button" class="photo__error" @click="draft.retryPhoto(p.key)">
                <ion-icon :icon="refreshOutline" /> Retry
              </button>
            </div>
            <button v-if="draft.photos.value.length < MAX_PHOTOS" type="button" class="tile tile--primary" @click="addPhotos('camera')">
              <ion-icon :icon="cameraOutline" aria-hidden="true" />
              <span>Camera</span>
            </button>
            <button v-if="draft.photos.value.length < MAX_PHOTOS" type="button" class="tile" @click="addPhotos('library')">
              <ion-icon :icon="imagesOutline" aria-hidden="true" />
              <span>Gallery</span>
            </button>
          </div>
          <p class="pw-subtle center">Tap ⋯ on a photo to make it the cover, reorder or remove it</p>
          <p class="pw-callout"><ion-icon :icon="informationCircleOutline" aria-hidden="true" />Natural light, plain background, and honest close-ups of wear cut disputes in half.</p>
          <p v-if="errors.mediaIds" class="err" role="alert">{{ errors.mediaIds }}</p>
        </template>

        <!-- S2 Describe -->
        <template v-else-if="step === 2">
          <h1 class="pw-title">Describe your gear</h1>
          <TextField v-model="f.title" label="Title" :maxlength="80" autocapitalize="sentences" :error="errors.title" :help="`${f.title.length} / 80`" />
          <div class="fieldset">
            <label for="cat" class="lbl">Category</label>
            <ion-select
              id="cat"
              v-model="f.categoryId"
              class="pw-input"
              fill="outline"
              interface="action-sheet"
              placeholder="Choose a category"
              :interface-options="{ header: 'Category' }"
              aria-label="Category"
            >
              <ion-select-option v-for="c in categoryOptions" :key="c.slug" :value="c.slug">{{ c.label }}</ion-select-option>
            </ion-select>
            <p v-if="errors.categoryId" class="err">{{ errors.categoryId }}</p>
          </div>
          <div class="two">
            <TextField v-model="f.brand" label="Brand" autocapitalize="words" :error="errors.brand" />
            <TextField v-model="f.model" label="Model" autocapitalize="characters" :error="errors.model" />
          </div>
          <div class="fieldset">
            <p class="lbl">Aircraft type <span class="pw-subtle">· helps type-specific search</span></p>
            <ChipGroup v-model="f.aircraftTypes" :options="aircraftOptions" multiple label="Aircraft type" />
          </div>
          <TextField v-model="f.description" label="Description" multiline :rows="5" :maxlength="1000" :error="errors.description" />
        </template>

        <!-- S3 Condition -->
        <template v-else-if="step === 3">
          <h1 class="pw-title">Condition</h1>
          <div role="radiogroup" aria-label="Condition" class="pw-stack-sm">
            <RadioCard v-for="(meta, value) in CONDITION_LABELS" :key="value" :selected="f.condition === value" @select="f.condition = value">
              <template #media><StatusBadge :tone="meta.tone" :label="meta.label" /></template>
              <template #title><span class="cond-hint">{{ meta.hint }}</span></template>
            </RadioCard>
          </div>
          <p v-if="errors.condition" class="err">{{ errors.condition }}</p>
          <h2 class="pw-eyebrow">Specifics</h2>
          <TextField
            v-model="f.serialNumber"
            label="Serial number"
            hint="private, for escrow protection"
            autocapitalize="characters"
            :error="errors.serialNumber"
            class="mono"
          />
        </template>

        <!-- S4 Price -->
        <template v-else-if="step === 4">
          <div class="pw-row-between">
            <h1 class="pw-title">Set your price</h1>
            <ion-select v-model="f.currency" interface="popover" class="currency" aria-label="Currency">
              <ion-select-option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }} {{ CURRENCY_SYMBOL[c] }}</ion-select-option>
            </ion-select>
          </div>
          <AmountInput v-model="f.price" :currency="f.currency" label="Price" :error="errors.price ?? errors.priceAmount" />

          <section v-if="priceCheck" class="pw-callout check">
            <div class="pw-stack-sm grow">
              <p class="check__title"><ion-icon :icon="sparklesOutline" aria-hidden="true" /> Price check</p>
              <template v-if="priceCheck.available && priceCheck.range">
                <p>
                  {{ priceCheck.comparablesCount }} similar items {{ priceCheck.basis === 'sales' ? 'sold' : 'listed' }} in the last {{ priceCheck.windowDays ?? 90 }} days for
                  <strong>{{ formatMoney(priceCheck.range.min, { whole: true }) }}–{{ formatMoney(priceCheck.range.max, { whole: true }) }}</strong>.
                </p>
                <p v-if="priceCheck.position" :class="priceCheck.position === 'fast_sell' ? 'ok' : 'warn'">
                  {{ priceCheck.position === 'fast_sell' ? '✓ Competitively priced' : priceCheck.position === 'below_range' ? 'Below the usual range — you may be leaving money on the table.' : 'Above the usual range — expect fewer offers.' }}
                </p>
              </template>
              <p v-else class="pw-muted">{{ priceCheck.message ?? 'Not enough comparable items yet.' }}</p>
            </div>
          </section>

          <section v-if="fee" class="pw-card">
            <div class="pw-kv"><dt>Platform fee ({{ fee.platformFeeRate }}%)</dt><dd>−{{ formatMoney(fee.platformFee) }}</dd></div>
            <hr class="pw-divider" />
            <div class="pw-kv receive"><dt>You receive</dt><dd class="pw-price">{{ formatMoney(fee.sellerReceives) }}</dd></div>
          </section>

          <section class="pw-card pw-stack-sm">
            <div class="pw-row-between">
              <div><p class="strong">Accept offers</p><p class="pw-muted small">Buyers can negotiate on price</p></div>
              <ion-toggle v-model="f.negotiable" aria-label="Accept offers" />
            </div>
            <AmountInput v-if="f.negotiable" v-model="f.minimumOffer" size="sm" :currency="f.currency" label="Lowest offer you'll consider (optional)" :error="errors.minimumOffer" />
            <hr class="pw-divider" />
            <div class="pw-row-between">
              <div>
                <p class="strong"><ion-icon :icon="swapHorizontalOutline" aria-hidden="true" /> Open to swap offers</p>
                <p class="pw-muted small">Verified buyers can propose gear trades</p>
              </div>
              <ion-toggle v-model="f.swappable" aria-label="Open to swap offers" />
            </div>
          </section>
        </template>

        <!-- S5 Freight -->
        <template v-else-if="step === 5">
          <h1 class="pw-title">Freight &amp; delivery</h1>
          <p class="lbl">Cargo size</p>
          <div class="sizes" role="radiogroup" aria-label="Cargo size">
            <button v-for="s in parcelSizes" :key="s.value" type="button" role="radio" :aria-checked="f.parcelSize === s.value" class="size" :class="{ on: f.parcelSize === s.value }" @click="f.parcelSize = s.value">
              <strong>{{ s.label }}</strong><span>{{ s.hint }}</span>
            </button>
          </div>
          <p class="lbl">Who covers freight?</p>
          <div class="pw-stack-sm" role="radiogroup" aria-label="Who covers freight">
            <RadioCard radio-position="start" :selected="f.whoPays === 'buyer'" title="Buyer pays" description="Calculated at checkout from the buyer's address" @select="f.whoPays = 'buyer'" />
            <RadioCard radio-position="start" :selected="f.whoPays === 'seller'" title="Free delivery — you cover it" description="Listings with free delivery get more views" @select="f.whoPays = 'seller'" />
          </div>
          <section class="pw-card pw-row-between">
            <div>
              <p class="strong"><ion-icon :icon="locationOutline" aria-hidden="true" /> Allow local pickup</p>
              <p class="pw-muted small">Exact spot agreed in chat</p>
            </div>
            <ion-toggle v-model="f.allowHandoff" aria-label="Allow local pickup" />
          </section>
          <p class="pw-callout">
            <ion-icon :icon="shieldCheckmarkOutline" aria-hidden="true" />
            Wheels-up within {{ PLATFORM.dispatchDays }} days of sale with tracked delivery — escrow releases your payout once the buyer confirms arrival.
          </p>
        </template>

        <!-- S6 Review -->
        <template v-else>
          <h1 class="sr-only">Review &amp; publish</h1>
          <ItemSummary :title="f.title || 'Untitled'" :image="draft.photos.value[0]?.asset" :price="f.price !== null ? { amount: f.price, currency: f.currency } : null">
            <div class="badges">
              <StatusBadge v-if="f.condition" :tone="CONDITION_LABELS[f.condition].tone" :label="CONDITION_LABELS[f.condition].label" />
              <StatusBadge v-if="f.swappable" :icon="swapHorizontalOutline" label="Swap OK" />
            </div>
            <template #aside><button type="button" class="pw-link" @click="step = 2">Edit</button></template>
          </ItemSummary>
          <section class="pw-card">
            <button v-for="row in reviewRows" :key="row.label" type="button" class="review-row" @click="step = row.step">
              <span class="pw-muted">{{ row.label }}</span>
              <span class="review-row__v" :class="{ accent: row.accent }">{{ row.value }}</span>
            </button>
          </section>
          <section class="pw-card pw-row-between">
            <div>
              <p class="strong"><ion-icon :icon="star" class="gold" aria-hidden="true" /> Boost visibility</p>
              <p class="pw-muted small">Feature on home and top of search — available once you're live</p>
            </div>
            <span class="gold strong">Add later</span>
          </section>
          <div v-if="kycBlocked" class="pw-callout pw-callout--warning" role="alert">
            <ion-icon :icon="shieldCheckmarkOutline" aria-hidden="true" />
            <span>{{ kycBlocked }} <router-link to="/verification">Verify your identity</router-link></span>
          </div>
          <p class="pw-subtle center small">
            By publishing you confirm this item complies with Pilotwardrobe <router-link to="/pages/terms">listing rules</router-link> — no counterfeit or restricted items.
          </p>
        </template>

        <p v-if="formError" class="pw-callout pw-callout--danger" role="alert">{{ formError }}</p>
      </div>
    </ion-content>

    <ion-footer v-if="!loadingExisting && !loadError" class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" class="pw-btn-lg" :disabled="busy || (step === 1 && draft.uploading.value)" @click="next">
          <ion-spinner v-if="busy" name="crescent" />
          <span v-else>{{ step === 6 ? 'Publish listing' : step === 1 && draft.uploading.value ? 'Uploading photos…' : 'Continue' }}</span>
        </ion-button>
        <ion-button expand="block" fill="clear" color="medium" :disabled="busy || draft.uploading.value" @click="saveAndExit">
          {{ step === 6 ? 'Save as draft' : 'Save draft & exit' }}
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import {
  actionSheetController,
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonPage,
  IonProgressBar,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonSpinner,
  IonToggle,
  IonToolbar,
  useBackButton,
  useIonRouter,
} from '@ionic/vue'
import {
  cameraOutline,
  ellipsisHorizontal,
  imagesOutline,
  informationCircleOutline,
  locationOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  star,
  swapHorizontalOutline,
} from 'ionicons/icons'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ApiError, toApiError } from '@/api/errors'
import { sellingApi } from '@/api/selling'
import AmountInput from '@/components/AmountInput.vue'
import AppHeader from '@/components/AppHeader.vue'
import ChipGroup from '@/components/ChipGroup.vue'
import ErrorState from '@/components/ErrorState.vue'
import ItemSummary from '@/components/ItemSummary.vue'
import RadioCard from '@/components/RadioCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TextField from '@/components/TextField.vue'
import { AIRCRAFT_TYPES, CONDITION_LABELS, CURRENCIES, PLATFORM } from '@/constants/labels'
import { useDebounced } from '@/composables/useDebounced'
import { useFeedback } from '@/composables/useFeedback'
import { track } from '@/services/analytics'
import { PhotoPermissionError, pickPhotos } from '@/services/camera'
import { useAuthStore } from '@/stores/auth'
import { useCatalogueStore } from '@/stores/catalogue'
import type { FeeQuote, PriceCheck } from '@/types'
import { mediaUrl } from '@/utils/media'
import { CURRENCY_SYMBOL, formatMoney } from '@/utils/money'
import { MAX_PHOTOS, useListingDraft } from './useListingDraft'

/**
 * S1–S6. Photos upload one by one to POST /media (type=listing) as they're picked;
 * the draft is autosaved (POST then PATCH /listings) on every Continue; publish is
 * POST /listings/{id}/publish. 422s jump back to the step that owns the field, and
 * 403 KYC_REQUIRED (4th live listing without KYC) explains how to unlock it.
 */
const route = useRoute()
const router = useIonRouter()
const auth = useAuthStore()
const catalogue = useCatalogueStore()
const { toast, toastError, confirm } = useFeedback()

const draft = useListingDraft(auth.user?.currency ?? 'USD', auth.user?.countryCode ?? null)
const f = draft.fields
const step = ref(Number(route.query.step) || 1)
const busy = ref(false)
const formError = ref<string | null>(null)
const errors = reactive<Record<string, string | undefined>>({})
const kycBlocked = ref<string | null>(null)
const loadingExisting = ref(false)
const loadError = ref<ApiError | null>(null)

const existingId = route.params.id ? String(route.params.id) : null

async function loadExisting() {
  if (!existingId) return
  loadingExisting.value = true
  loadError.value = null
  try {
    draft.hydrate(await sellingApi.myListing(existingId))
  } catch (e) {
    loadError.value = toApiError(e)
  } finally {
    loadingExisting.value = false
  }
}

onMounted(() => {
  void catalogue.loadCategories().catch(() => undefined)
  void loadExisting()
})

const categoryOptions = computed(() =>
  catalogue.categories.flatMap((c) => [{ slug: c.slug, label: c.name }, ...(c.children ?? []).map((ch) => ({ slug: ch.slug, label: `${c.name} › ${ch.name}` }))]),
)
/** No selection means "any aircraft". */
const aircraftOptions = AIRCRAFT_TYPES.map((a) => ({ value: a.value as string, label: a.label }))
const parcelSizes = [
  { value: 'small' as const, label: 'S', hint: '< 1 kg' },
  { value: 'medium' as const, label: 'M', hint: '1–3 kg' },
  { value: 'large' as const, label: 'L', hint: '3 kg +' },
]

/* Price check + fee quote (debounced, informational; backend recomputes at sale). */
const priceCheck = ref<PriceCheck | null>(null)
const fee = ref<FeeQuote | null>(null)
const debouncedPrice = useDebounced(computed(() => `${f.price}|${f.currency}`), 450)
watch([debouncedPrice, step], async () => {
  if (step.value !== 4 || !f.price) return
  const price = { amount: f.price, currency: f.currency }
  const [check, quote] = await Promise.allSettled([
    sellingApi.priceCheck({ listingId: draft.id.value ?? undefined, categoryId: f.categoryId || undefined, brand: f.brand || undefined, model: f.model || undefined, condition: f.condition ?? undefined, price }),
    sellingApi.feeQuote(price),
  ])
  priceCheck.value = check.status === 'fulfilled' ? check.value : null
  fee.value = quote.status === 'fulfilled' ? quote.value : null
})

const reviewRows = computed(() => [
  { label: 'Category', value: `${categoryOptions.value.find((c) => c.slug === f.categoryId)?.label ?? '—'}${f.aircraftTypes.length ? ` · ${f.aircraftTypes.join(', ')}` : ''}`, step: 2 },
  { label: 'Condition', value: f.condition ? CONDITION_LABELS[f.condition].label : '—', step: 3 },
  { label: 'Price', value: f.price ? formatMoney({ amount: f.price, currency: f.currency }) : '—', step: 4 },
  { label: 'You receive', value: fee.value ? `${formatMoney(fee.value.sellerReceives)} after ${fee.value.platformFeeRate}% fee` : '—', step: 4, accent: true },
  { label: 'Freight', value: `${f.whoPays === 'buyer' ? 'Buyer pays' : 'Free delivery'}${f.allowHandoff ? ' · pickup OK' : ''}`, step: 5 },
  { label: 'Offers & swaps', value: [f.negotiable ? 'Offers' : null, f.swappable ? 'Swaps' : null].filter(Boolean).join(', ') || 'Fixed price', step: 4 },
])

/** Light client checks per step; the backend validates everything on publish. */
function validateStep(n: number): boolean {
  for (const k of Object.keys(errors)) delete errors[k]
  if (n === 1 && !draft.uploadedIds.value.length) errors.mediaIds = 'Add at least one photo.'
  if (n === 2) {
    if (f.title.trim().length < 5) errors.title = 'Give your listing a descriptive title.'
    if (!f.categoryId) errors.categoryId = 'Choose a category.'
  }
  if (n === 3 && !f.condition) errors.condition = 'Choose the condition.'
  if (n === 4) {
    if (!f.price || f.price <= 0) errors.price = 'Enter a price.'
    if (f.negotiable && f.minimumOffer && f.price && f.minimumOffer > f.price) errors.minimumOffer = 'Must be below your price.'
  }
  return !Object.values(errors).some(Boolean)
}

const STEP_OF_FIELD: Record<string, number> = {
  mediaIds: 1,
  title: 2,
  categoryId: 2,
  brand: 2,
  model: 2,
  description: 2,
  condition: 3,
  serialNumber: 3,
  price: 4,
  priceAmount: 4,
  minimumOffer: 4,
  freight: 5,
}

function applyError(error: unknown) {
  const err = toApiError(error)
  if (err.isValidation && err.hasFieldErrors) {
    let firstStep = 7
    for (const [key, messages] of Object.entries(err.fieldErrors)) {
      const root = key.split('.')[0] ?? key
      const fieldKey = key === 'price.amount' ? 'priceAmount' : root
      errors[fieldKey] = messages[0]
      firstStep = Math.min(firstStep, STEP_OF_FIELD[fieldKey] ?? 6)
    }
    if (firstStep < 7) step.value = firstStep
    formError.value = firstStep === 6 ? err.message : null
  } else if (err.code === 'KYC_REQUIRED') {
    kycBlocked.value = err.message
  } else {
    formError.value = err.message
  }
}

async function next() {
  if (busy.value) return
  formError.value = null
  if (step.value < 6) {
    if (!validateStep(step.value)) return
    busy.value = true
    try {
      await draft.save()
      step.value += 1
    } catch (e) {
      applyError(e)
    } finally {
      busy.value = false
    }
    return
  }
  // Publish
  busy.value = true
  kycBlocked.value = null
  try {
    const id = await draft.save()
    const res = await sellingApi.publish(id)
    track({ name: 'listing_created', params: { listing_id: id } })
    router.navigate(`/sell/${id}/live`, 'forward', 'replace')
    if (res.message) await toast(res.message, 'success')
  } catch (e) {
    applyError(e)
  } finally {
    busy.value = false
  }
}

function prev() {
  if (step.value > 1) step.value -= 1
  else void exit()
}

async function saveAndExit() {
  if (busy.value) return
  busy.value = true
  try {
    if (draft.uploadedIds.value.length || f.title) await draft.save()
    await toast('Draft saved. Resume it from My hangar.', 'success')
    router.navigate('/tabs/profile/hangar', 'back', 'replace')
  } catch (e) {
    applyError(e)
  } finally {
    busy.value = false
  }
}

async function exit() {
  const dirty = draft.photos.value.some((p) => p.fresh) || (!draft.id.value && !!f.title)
  if (dirty && !(await confirm({ header: 'Leave without saving?', message: 'Unsaved changes to this listing will be lost.', confirmText: 'Discard changes', cancelText: 'Keep editing', destructive: true }))) return
  if (router.canGoBack()) router.back()
  else router.navigate('/tabs/home', 'back', 'replace')
}

/* Android back walks the wizard instead of leaving it mid-flow. */
useBackButton(10, (processNext) => {
  if (step.value > 1) step.value -= 1
  else if (draft.photos.value.length === 0) processNext()
  else void exit()
})

async function addPhotos(source: 'camera' | 'library') {
  try {
    const picked = await pickPhotos(source, { multiple: source === 'library', limit: MAX_PHOTOS - draft.photos.value.length })
    for (const p of picked) void draft.addPhoto(p.blob, p.previewUrl)
    if (picked.length) delete errors.mediaIds
  } catch (e) {
    if (e instanceof PhotoPermissionError) await toast(e.message, 'danger')
    else await toastError(e)
  }
}

async function photoMenu(key: string, index: number) {
  const sheet = await actionSheetController.create({
    header: `Photo ${index + 1}`,
    buttons: [
      ...(index > 0 ? [{ text: 'Make cover photo', handler: () => draft.makeCover(key) }] : []),
      ...(index > 0 ? [{ text: 'Move earlier', handler: () => draft.move(key, -1) }] : []),
      ...(index < draft.photos.value.length - 1 ? [{ text: 'Move later', handler: () => draft.move(key, 1) }] : []),
      { text: 'Remove photo', role: 'destructive', handler: () => void draft.removePhoto(key) },
      { text: 'Cancel', role: 'cancel' },
    ],
  })
  await sheet.present()
}
</script>

<style scoped>
.wiz {
  padding-bottom: var(--pw-space-8);
}

.photos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.photo,
.tile {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--pw-radius-lg);
  overflow: hidden;
}

.photo {
  background: var(--pw-image-bg);
}

.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo__cover {
  position: absolute;
  left: 8px;
  bottom: 8px;
  padding: 3px 10px;
  border-radius: 6px;
  background: var(--pw-navy-700);
  color: #fff;
  font-size: var(--pw-text-xs);
  font-weight: 700;
  text-transform: uppercase;
}

.photo__menu {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 0;
  background: rgb(16 26 45 / 65%);
  color: #fff;
  display: grid;
  place-items: center;
}

.photo__progress {
  position: absolute;
  inset: auto 8px 8px 8px;
}

.photo__error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 0;
  background: rgb(196 61 51 / 80%);
  color: #fff;
  font-weight: 600;
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 2px dashed var(--pw-border-strong);
  background: var(--pw-surface);
  color: var(--pw-text-2);
  font: inherit;
  font-size: 26px;
}

.tile span {
  font-size: var(--pw-text-base);
  font-weight: 600;
}

.tile--primary {
  border-color: var(--pw-primary);
  background: var(--pw-navy-50);
  color: var(--pw-primary);
}

.center {
  text-align: center;
}

.small {
  font-size: var(--pw-text-sm);
}

.err {
  color: var(--pw-danger-600);
  font-size: var(--pw-text-sm);
}

.fieldset {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lbl {
  font-weight: 500;
  color: var(--pw-ink-2);
}

.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.cond-hint {
  font-family: var(--pw-font-body);
  font-weight: 400;
  color: var(--pw-text-2);
  line-height: 1.45;
}

.mono :deep(input) {
  font-family: var(--pw-font-mono);
}

.currency {
  border: 1.5px solid var(--pw-input-border);
  border-radius: var(--pw-radius-full);
  padding: 0 14px;
  min-height: 44px;
  font-weight: 600;
}

.check {
  align-items: flex-start;
}

.grow {
  flex: 1 1 auto;
}

.check__title {
  font-weight: 700;
  font-family: var(--pw-font-display);
  font-size: var(--pw-text-md);
}

.ok {
  color: var(--pw-success-600);
  font-weight: 600;
}

.warn {
  color: var(--pw-warning-700);
  font-weight: 600;
}

.receive dt {
  color: var(--pw-text);
  font-weight: 600;
}

.receive .pw-price {
  font-size: var(--pw-text-xl);
}

.strong {
  font-weight: 600;
  font-size: var(--pw-text-md);
}

.sizes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.size {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border-radius: var(--pw-radius-lg);
  border: 1.5px solid var(--pw-border);
  background: var(--pw-surface);
  color: var(--pw-text-2);
  font: inherit;
}

.size strong {
  font-size: var(--pw-text-lg);
  color: var(--pw-text);
}

.size.on {
  border: 2.5px solid var(--pw-primary);
  color: var(--pw-primary);
}

.badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.review-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  min-height: 52px;
  border: 0;
  border-bottom: 1px solid var(--pw-border);
  background: transparent;
  color: var(--pw-text);
  font: inherit;
  text-align: right;
}

.review-row:last-child {
  border-bottom: 0;
}

.review-row__v {
  font-weight: 500;
}

.accent {
  color: var(--pw-primary);
  font-weight: 700;
}

.gold {
  color: var(--pw-gold-500);
}
</style>
