<template>
  <ion-page>
    <ion-header class="pw-header-plain">
      <ion-toolbar>
        <div class="bar">
          <ion-searchbar
            ref="searchbar"
            v-model="term"
            class="pw-searchbar bar__input"
            placeholder="Search aviation gear"
            inputmode="search"
            enterkeyhint="search"
            :debounce="0"
            show-clear-button="focus"
            aria-label="Search the marketplace"
            @keyup.enter="submit(term)"
          />
          <ion-button v-if="term" fill="clear" class="bar__cancel" @click="term = ''">Cancel</ion-button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="pw-content-plain">
      <div class="search pw-container">
        <!-- Suggestions from the real search endpoint -->
        <ul v-if="debounced.trim().length >= 2" class="sugg" aria-label="Suggestions">
          <li v-if="suggestions.loading.value && !suggestions.data.value" class="sugg__loading"><ion-spinner name="dots" /></li>
          <li v-for="s in titleSuggestions" :key="s.id">
            <button type="button" class="sugg__row" @click="openListing(s.slug)">
              <ion-icon :icon="searchOutline" aria-hidden="true" />
              <span v-html="highlight(s.title)" />
            </button>
          </li>
          <li v-if="topCategory">
            <button type="button" class="sugg__row" @click="openCategory(topCategory.value)">
              <ion-icon :icon="categoryIcon(topCategory.value)" aria-hidden="true" />
              <span>in <strong class="sugg__accent">{{ topCategory.label }}</strong></span>
            </button>
          </li>
          <li v-for="seller in sellerSuggestions" :key="seller.username">
            <button type="button" class="sugg__row" @click="router.push(`/seller/${seller.username}`)">
              <AvatarInitials :name="seller.displayName" :size="26" />
              <span>Seller · <strong>{{ seller.displayName }}</strong></span>
              <VerifiedShield v-if="seller.verified" />
            </button>
          </li>
          <li>
            <button type="button" class="sugg__row sugg__all" @click="submit(term)">See all results for “{{ term.trim() }}”</button>
          </li>
        </ul>

        <section v-if="settings.recentSearches.length" class="block">
          <h2 class="pw-eyebrow">Recent</h2>
          <ul class="recent">
            <li v-for="r in settings.recentSearches" :key="r" class="recent__row">
              <button type="button" class="recent__term" @click="submit(r)">
                <ion-icon :icon="timeOutline" aria-hidden="true" />
                {{ r }}
              </button>
              <button type="button" class="recent__remove" :aria-label="`Remove ${r} from recent searches`" @click="settings.removeRecentSearch(r)">
                <ion-icon :icon="closeOutline" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>

        <section v-if="catalogue.categories.length" class="block">
          <h2 class="pw-eyebrow">Browse categories</h2>
          <div class="tags">
            <button v-for="c in catalogue.categories" :key="c.id" type="button" class="tag" @click="openCategory(c.slug)">{{ c.name }}</button>
          </div>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonIcon, IonPage, IonSearchbar, IonSpinner, IonToolbar, onIonViewDidEnter, useIonRouter } from '@ionic/vue'
import { closeOutline, searchOutline, timeOutline } from 'ionicons/icons'
import { computed, onMounted, ref } from 'vue'
import { catalogueApi } from '@/api/catalogue'
import AvatarInitials from '@/components/AvatarInitials.vue'
import VerifiedShield from '@/components/VerifiedShield.vue'
import { categoryIcon } from '@/constants/categoryIcons'
import { useAsync } from '@/composables/useAsync'
import { useDebounced } from '@/composables/useDebounced'
import { useCatalogueStore } from '@/stores/catalogue'
import { useSettingsStore } from '@/stores/settings'
import type { Listing, ListingSearchMeta, Paginated } from '@/types'

/**
 * B3 — typeahead. Suggestions are derived from GET /listings (debounced 300 ms,
 * superseded requests aborted): matching titles, the top category facet and
 * matching sellers. The backend has no "trending searches" endpoint, so categories
 * are offered instead (documented deviation).
 */
const router = useIonRouter()
const settings = useSettingsStore()
const catalogue = useCatalogueStore()

const term = ref('')
const debounced = useDebounced(term, 300)
const searchbar = ref<InstanceType<typeof IonSearchbar> | null>(null)

const suggestions = useAsync<Paginated<Listing, ListingSearchMeta> | null>(
  (signal) => (debounced.value.trim().length >= 2 ? catalogueApi.search({ search: debounced.value.trim(), perPage: 6 }, signal) : Promise.resolve(null)),
  { watch: [debounced], immediate: false },
)

const titleSuggestions = computed(() => (suggestions.data.value?.data ?? []).slice(0, 3))
const topCategory = computed(() => suggestions.data.value?.meta.facets?.categories?.find((c) => c.count > 0) ?? null)
const sellerSuggestions = computed(() => {
  const q = debounced.value.trim().toLowerCase()
  const seen = new Map<string, Listing['seller']>()
  for (const l of suggestions.data.value?.data ?? []) if (l.seller.displayName.toLowerCase().includes(q)) seen.set(l.seller.username, l.seller)
  return [...seen.values()].slice(0, 2)
})

onMounted(() => void catalogue.loadCategories().catch(() => undefined))
onIonViewDidEnter(() => void (searchbar.value?.$el as HTMLIonSearchbarElement | undefined)?.setFocus())

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Bold the typed prefix (B3). Input is escaped before markup is added. */
function highlight(title: string) {
  const safe = escapeHtml(title)
  const q = escapeHtml(debounced.value.trim())
  if (!q) return safe
  const i = safe.toLowerCase().indexOf(q.toLowerCase())
  return i < 0 ? safe : `${safe.slice(0, i)}<strong>${safe.slice(i, i + q.length)}</strong>${safe.slice(i + q.length)}`
}

function submit(value: string) {
  const q = value.trim()
  if (!q) return
  void settings.addRecentSearch(q)
  router.push(`/tabs/search/results?search=${encodeURIComponent(q)}`)
}

function openListing(slug: string) {
  void settings.addRecentSearch(term.value)
  router.push(`/listing/${slug}`)
}

function openCategory(slug: string) {
  router.push(`/tabs/search/results?category=${encodeURIComponent(slug)}${term.value.trim() ? `&search=${encodeURIComponent(term.value.trim())}` : ''}`)
}
</script>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px var(--pw-gutter) 6px 12px;
}

.bar__input {
  flex: 1 1 auto;
}

.bar__cancel {
  font-weight: 600;
  --padding-start: 6px;
  --padding-end: 0;
}

.search {
  padding: var(--pw-space-2) var(--pw-gutter) var(--pw-space-10);
}

.sugg {
  list-style: none;
  margin: 0 0 var(--pw-space-6);
  padding: 0;
}

.sugg__loading {
  padding: var(--pw-space-4);
  text-align: center;
}

.sugg__row {
  display: flex;
  align-items: center;
  gap: var(--pw-space-4);
  width: 100%;
  min-height: 56px;
  padding: 0;
  border: 0;
  border-bottom: 1px solid var(--pw-border);
  background: transparent;
  color: var(--pw-text);
  font: inherit;
  font-size: var(--pw-text-md);
  text-align: left;
}

.sugg__row ion-icon {
  font-size: 20px;
  color: var(--pw-text-3);
  flex: 0 0 auto;
}

.sugg__accent {
  color: var(--pw-primary);
}

.sugg__all {
  color: var(--pw-primary);
  font-weight: 600;
  border-bottom: 0;
}

.block {
  margin-top: var(--pw-space-6);
}

.recent {
  list-style: none;
  padding: 0;
  margin: var(--pw-space-2) 0 0;
}

.recent__row {
  display: flex;
  align-items: center;
}

.recent__term {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: var(--pw-space-4);
  min-height: 52px;
  border: 0;
  background: transparent;
  color: var(--pw-text);
  font: inherit;
  font-size: var(--pw-text-md);
  text-align: left;
  padding: 0;
}

.recent__term ion-icon {
  color: var(--pw-text-3);
  font-size: 20px;
}

.recent__remove {
  width: var(--pw-touch);
  height: var(--pw-touch);
  border: 0;
  background: transparent;
  color: var(--pw-text-3);
  font-size: 20px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: var(--pw-space-3);
}

.tag {
  min-height: 44px;
  padding: 0 18px;
  border-radius: var(--pw-radius-full);
  border: 0;
  background: var(--pw-surface-muted);
  color: var(--pw-ink-2);
  font: inherit;
}
</style>
