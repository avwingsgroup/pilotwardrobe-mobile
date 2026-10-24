<template>
  <ion-page>
    <ion-header class="pw-header-plain">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/search" text="" :icon="chevronBack" />
        </ion-buttons>
        <button type="button" class="query" @click="editQuery">
          {{ state.search || activeCategoryName || 'All gear' }}
        </button>
        <ion-buttons slot="end">
          <ion-button :aria-label="layout === 'grid' ? 'Show as list' : 'Show as grid'" @click="layout = layout === 'grid' ? 'list' : 'grid'">
            <ion-icon slot="icon-only" :icon="layout === 'grid' ? listOutline : gridOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <div v-if="chips.length" class="chips">
        <button v-for="chip in chips" :key="chip.key" type="button" class="chip" :aria-label="`Remove filter ${chip.label}`" @click="chip.remove()">
          {{ chip.label }} <ion-icon :icon="close" aria-hidden="true" />
        </button>
      </div>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="results.onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="results pw-container">
        <div class="pw-row-between results__bar">
          <span class="pw-muted">{{ results.meta.value ? `${results.meta.value.total} result${results.meta.value.total === 1 ? '' : 's'}` : ' ' }}</span>
          <button type="button" class="pw-link sort" @click="chooseSort">
            <ion-icon :icon="swapVerticalOutline" aria-hidden="true" /> {{ sortLabel }}
          </button>
        </div>

        <div v-if="results.loading.value" class="pw-grid-2">
          <ListingCardSkeleton v-for="n in 6" :key="n" />
        </div>

        <ErrorState v-else-if="results.error.value && !results.items.value.length" :error="results.error.value" @retry="results.loadFirst" />

        <EmptyState
          v-else-if="results.isEmpty.value"
          :icon="searchOutline"
          title="No gear matches"
          message="Try a different term or remove a filter."
          :action-label="filterCount ? 'Clear filters' : undefined"
          @action="clearFilters"
        />

        <div v-else :class="layout === 'grid' ? 'pw-grid-2' : 'list'">
          <ListingCard
            v-for="item in results.items.value"
            :key="item.id"
            :listing="item"
            :show-seller="layout === 'list'"
            :ratio="layout === 'list' ? 16 / 10 : 4 / 3"
            :width="layout === 'list' ? 360 : 180"
            @toggle-favorite="favorite.toggle"
          />
        </div>

        <ion-infinite-scroll :disabled="!results.hasMore.value" @ion-infinite="results.loadMore">
          <ion-infinite-scroll-content loading-spinner="crescent" />
        </ion-infinite-scroll>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="center" class="filters-fab">
        <ion-button class="filters-btn" @click="filtersOpen = true">
          <ion-icon slot="start" :icon="optionsOutline" aria-hidden="true" />
          Filters{{ filterCount ? ` · ${filterCount}` : '' }}
        </ion-button>
      </ion-fab>
    </ion-content>

    <ion-modal class="pw-sheet" :is-open="filtersOpen" :initial-breakpoint="0.92" :breakpoints="[0, 0.92]" handle-behavior="cycle" @did-dismiss="filtersOpen = false">
      <FiltersSheet :state="state" :categories="catalogue.categories" :facets="results.meta.value?.facets" @apply="applyFilters" />
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  actionSheetController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonToolbar,
  useIonRouter,
} from '@ionic/vue'
import { chevronBack, close, gridOutline, listOutline, optionsOutline, searchOutline, swapVerticalOutline } from 'ionicons/icons'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { catalogueApi } from '@/api/catalogue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import ListingCard from '@/components/ListingCard.vue'
import ListingCardSkeleton from '@/components/ListingCardSkeleton.vue'
import { AIRCRAFT_TYPES, CONDITION_LABELS, SORT_OPTIONS } from '@/constants/labels'
import { useFavorite } from '@/composables/useFavorite'
import { usePagedList } from '@/composables/usePagedList'
import { track } from '@/services/analytics'
import { useCatalogueStore } from '@/stores/catalogue'
import type { Listing, ListingSearchMeta, SortOption } from '@/types'
import { formatMoney } from '@/utils/money'
import FiltersSheet from './FiltersSheet.vue'
import { activeFilterCount, filtersFromState, queryFromState, stateFromQuery, type SearchState } from './searchQuery'

/** B4 — GET /listings with filters, sort, facets and infinite scroll. */
const route = useRoute()
const vueRouter = useRouter()
const ionRouter = useIonRouter()
const catalogue = useCatalogueStore()

const state = computed(() => stateFromQuery(route.query))
const filterCount = computed(() => activeFilterCount(state.value))
const layout = ref<'grid' | 'list'>('grid')
const filtersOpen = ref(false)

const results = usePagedList<Listing, ListingSearchMeta>((page, signal) =>
  catalogueApi.search({ ...filtersFromState(state.value), page, perPage: 20 }, signal),
)

/** Ionic keeps this page alive in the stack; reload only when the search itself changes. */
let loadedFor = ''
function loadIfChanged() {
  if (route.path !== '/tabs/search/results') return
  const key = JSON.stringify(queryFromState(state.value))
  if (key === loadedFor) return
  loadedFor = key
  void results.loadFirst()
  track({ name: 'search_performed', params: { has_query: !!state.value.search, filters: filterCount.value } })
}

onMounted(() => {
  void catalogue.loadCategories().catch(() => undefined)
  loadIfChanged()
})

watch(() => route.fullPath, loadIfChanged)

const favorite = useFavorite((updated) => results.replace((l) => l.id === updated.id, updated))

const activeCategoryName = computed(() => catalogue.flat().find((c) => c.slug === state.value.category[0])?.name)
const sortLabel = computed(() => SORT_OPTIONS.find((s) => s.value === state.value.sort)?.label ?? 'Relevance')

function update(next: Partial<SearchState>) {
  void vueRouter.replace({ path: route.path, query: queryFromState({ ...state.value, ...next }) })
}

const chips = computed(() => {
  const s = state.value
  const out: { key: string; label: string; remove: () => void }[] = []
  for (const slug of s.category) {
    out.push({ key: `c-${slug}`, label: catalogue.flat().find((c) => c.slug === slug)?.name ?? slug, remove: () => update({ category: s.category.filter((c) => c !== slug) }) })
  }
  if (s.minPrice !== null || s.maxPrice !== null) {
    const cur = results.meta.value?.facets?.priceRange?.currency ?? 'USD'
    const lo = s.minPrice !== null ? formatMoney({ amount: s.minPrice, currency: cur }, { whole: true }) : 'Any'
    const hi = s.maxPrice !== null ? formatMoney({ amount: s.maxPrice, currency: cur }, { whole: true }) : 'Any'
    out.push({ key: 'price', label: `${lo}–${hi}`, remove: () => update({ minPrice: null, maxPrice: null }) })
  }
  if (s.condition.length) {
    out.push({ key: 'cond', label: s.condition.map((c) => CONDITION_LABELS[c]?.label ?? c).join(', '), remove: () => update({ condition: [] }) })
  }
  if (s.aircraftType) {
    out.push({ key: 'ac', label: AIRCRAFT_TYPES.find((a) => a.value === s.aircraftType)?.label ?? s.aircraftType, remove: () => update({ aircraftType: null }) })
  }
  if (s.verifiedOnly) out.push({ key: 'ver', label: '✓ Verified only', remove: () => update({ verifiedOnly: false }) })
  return out
})

async function chooseSort() {
  const sheet = await actionSheetController.create({
    header: 'Sort by',
    buttons: [
      ...SORT_OPTIONS.map((o) => ({
        text: o.label,
        role: o.value === state.value.sort ? 'selected' : undefined,
        handler: () => update({ sort: o.value as SortOption }),
      })),
      { text: 'Cancel', role: 'cancel' },
    ],
  })
  await sheet.present()
}

function applyFilters(next: SearchState) {
  filtersOpen.value = false
  update(next)
}

function clearFilters() {
  update({ category: [], condition: [], minPrice: null, maxPrice: null, verifiedOnly: false, aircraftType: null })
}

function editQuery() {
  ionRouter.back()
}
</script>

<style scoped>
.query {
  width: 100%;
  min-height: 46px;
  padding: 0 18px;
  border: 0;
  border-radius: var(--pw-radius-full);
  background: var(--pw-surface-muted);
  color: var(--pw-text);
  font: inherit;
  font-size: var(--pw-text-md);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chips {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 4px var(--pw-gutter) 12px;
  background: var(--pw-surface);
}

.chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--pw-radius-full);
  background: var(--pw-primary);
  color: var(--pw-primary-contrast);
  font: inherit;
  font-weight: 600;
}

.results {
  padding: var(--pw-space-3) var(--pw-gutter) 110px;
}

.results__bar {
  min-height: var(--pw-touch);
  margin-bottom: var(--pw-space-2);
}

.sort {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: var(--pw-touch);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-3);
}

.filters-fab {
  margin-bottom: calc(var(--ion-safe-area-bottom, 0px) + 8px);
}

.filters-btn {
  height: 52px;
  --padding-start: 24px;
  --padding-end: 24px;
  --box-shadow: var(--pw-shadow-fab);
  font-family: var(--pw-font-display);
  font-weight: 700;
  font-size: var(--pw-text-md);
}
</style>
