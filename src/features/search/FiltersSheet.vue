<template>
  <div class="sheet">
    <div class="pw-row-between sheet__head">
      <h2 class="pw-title">Filters</h2>
      <button type="button" class="pw-link sheet__reset" @click="resetAll">Reset all</button>
    </div>

    <ion-content class="sheet__body" :scroll-y="true">
      <section class="grp">
        <h3 class="pw-eyebrow">Category</h3>
        <ChipGroup v-model="draft.category" :options="categoryOptions" multiple label="Category" />
      </section>

      <section v-if="priceBounds" class="grp">
        <h3 class="pw-eyebrow">Price range · {{ priceBounds.currency }}</h3>
        <ion-range
          :min="priceBounds.min"
          :max="priceBounds.max"
          :step="priceStep"
          dual-knobs
          :value="{ lower: draft.minPrice ?? priceBounds.min, upper: draft.maxPrice ?? priceBounds.max }"
          aria-label="Price range"
          @ion-input="onPrice"
        />
        <div class="pw-row-between range-labels">
          <strong>{{ formatMoney({ amount: draft.minPrice ?? priceBounds.min, currency: priceBounds.currency }, { whole: true }) }}</strong>
          <strong>{{ formatMoney({ amount: draft.maxPrice ?? priceBounds.max, currency: priceBounds.currency }, { whole: true }) }}</strong>
        </div>
      </section>

      <section class="grp">
        <h3 class="pw-eyebrow">Condition</h3>
        <ChipGroup v-model="draft.condition" :options="conditionOptions" multiple label="Condition" />
      </section>

      <section class="grp">
        <h3 class="pw-eyebrow">Aircraft type</h3>
        <ChipGroup v-model="draft.aircraftType" :options="aircraftOptions" label="Aircraft type" allow-empty />
      </section>

      <div class="pw-row-between grp toggle-row">
        <div>
          <p class="toggle-row__title">Verified sellers only</p>
          <p class="pw-muted">Gold-badge members</p>
        </div>
        <ion-toggle v-model="draft.verifiedOnly" aria-label="Verified sellers only" />
      </div>
    </ion-content>

    <div class="sheet__foot">
      <ion-button fill="outline" class="pw-btn-lg sheet__secondary" @click="resetAll">Reset</ion-button>
      <ion-button class="pw-btn-lg sheet__primary" @click="$emit('apply', { ...draft })">
        <ion-spinner v-if="counting" name="dots" />
        <span v-else>{{ previewTotal === null ? 'Show results' : `Show ${previewTotal} result${previewTotal === 1 ? '' : 's'}` }}</span>
      </ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonRange, IonSpinner, IonToggle } from '@ionic/vue'
import { computed, reactive, ref, watch } from 'vue'
import { catalogueApi } from '@/api/catalogue'
import ChipGroup from '@/components/ChipGroup.vue'
import { AIRCRAFT_TYPES, CONDITION_LABELS } from '@/constants/labels'
import type { Category, CurrencyCode, ListingFacets, ProductCondition } from '@/types'
import { formatMoney } from '@/utils/money'
import { filtersFromState, type SearchState } from './searchQuery'

/**
 * B5 — refinement sheet. The result count is a live preview from GET /listings
 * (per_page=1, debounced). "Location radius" from the frame is not offered: the
 * API has no distance filter (documented deviation).
 */
const props = defineProps<{ state: SearchState; categories: Category[]; facets?: ListingFacets | null }>()
defineEmits<{ apply: [state: SearchState] }>()

const draft = reactive<SearchState>({ ...props.state, category: [...props.state.category], condition: [...props.state.condition] })

const categoryOptions = computed(() => props.categories.map((c) => ({ value: c.slug, label: c.name })))
const conditionOptions = computed(() =>
  (Object.keys(CONDITION_LABELS) as ProductCondition[]).map((value) => ({ value, label: CONDITION_LABELS[value].label })),
)
const aircraftOptions = AIRCRAFT_TYPES.map((a) => ({ value: a.value as string, label: a.label }))

const priceBounds = computed(() => {
  const r = props.facets?.priceRange
  if (!r || r.max <= r.min) return null
  return { min: r.min, max: r.max, currency: (r.currency ?? 'USD') as CurrencyCode }
})
const priceStep = computed(() => Math.max(100, Math.round(((priceBounds.value?.max ?? 0) - (priceBounds.value?.min ?? 0)) / 100 / 100) * 100))

function onPrice(event: CustomEvent) {
  const { lower, upper } = event.detail.value as { lower: number; upper: number }
  const b = priceBounds.value!
  draft.minPrice = lower <= b.min ? null : lower
  draft.maxPrice = upper >= b.max ? null : upper
}

function resetAll() {
  draft.category = []
  draft.condition = []
  draft.minPrice = null
  draft.maxPrice = null
  draft.verifiedOnly = false
  draft.aircraftType = null
}

const previewTotal = ref<number | null>(null)
const counting = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
let controller: AbortController | null = null

watch(
  draft,
  () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      controller?.abort()
      controller = new AbortController()
      counting.value = true
      try {
        const res = await catalogueApi.search({ ...filtersFromState(draft), perPage: 1 }, controller.signal)
        previewTotal.value = res.meta.total
      } catch {
        previewTotal.value = null
      } finally {
        counting.value = false
      }
    }, 350)
  },
  { deep: true, immediate: true },
)
</script>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--pw-surface);
}

.sheet__head {
  padding: var(--pw-space-6) var(--pw-gutter) var(--pw-space-2);
}

.sheet__reset {
  color: var(--pw-text-2);
  min-height: var(--pw-touch);
}

.sheet__body {
  --background: var(--pw-surface);
  --padding-start: var(--pw-gutter);
  --padding-end: var(--pw-gutter);
  flex: 1 1 auto;
}

.grp {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-3);
  margin: var(--pw-space-5) 0;
}

ion-range {
  --bar-background-active: var(--pw-primary);
  --knob-size: 32px;
  padding: 0 6px;
}

.range-labels {
  color: var(--pw-primary);
  font-family: var(--pw-font-display);
}

.toggle-row {
  flex-direction: row;
  border-top: 1px solid var(--pw-border);
  padding-top: var(--pw-space-5);
}

.toggle-row__title {
  font-weight: 600;
  font-size: var(--pw-text-md);
}

.sheet__foot {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--pw-space-3);
  padding: var(--pw-space-3) var(--pw-gutter) calc(var(--pw-space-3) + var(--ion-safe-area-bottom, 0px));
  border-top: 1px solid var(--pw-border);
}
</style>
