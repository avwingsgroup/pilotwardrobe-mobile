<template>
  <ion-page>
    <ion-header class="pw-header-plain">
      <ion-toolbar>
        <div class="top">
          <AppLogo size="sm" />
          <router-link to="/tabs/search" class="top__search" aria-label="Search the marketplace">
            <ion-icon :icon="searchOutline" aria-hidden="true" />
            <span>Search headsets, uniforms…</span>
          </router-link>
          <button type="button" class="top__bell" :aria-label="bellLabel" @click="openNotifications">
            <ion-icon :icon="notificationsOutline" aria-hidden="true" />
            <span v-if="badges.notifications > 0" class="top__dot" aria-hidden="true" />
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="home.onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="home pw-container">
        <!-- Loading -->
        <template v-if="home.loading.value && !home.data.value">
          <ion-skeleton-text animated class="sk-hero" />
          <div class="pw-grid-2">
            <ListingCardSkeleton v-for="n in 4" :key="n" />
          </div>
        </template>

        <ErrorState v-else-if="home.error.value && !home.data.value" :error="home.error.value" @retry="home.load" />

        <template v-else-if="home.data.value">
          <!-- Hero slides -->
          <div v-if="slides.length" class="hero-rail">
            <a v-for="slide in slides" :key="slide.id" class="hero" href="#" @click.prevent="openLink(slide.link)">
              <p class="hero__eyebrow">{{ slide.eyebrow ?? 'Official store' }}</p>
              <h2 class="hero__title">{{ slide.headline }}</h2>
              <span v-if="slide.buttonLabel" class="hero__cta">{{ slide.buttonLabel }} <ion-icon :icon="arrowForward" aria-hidden="true" /></span>
              <img :src="markWhite" alt="" class="hero__mark" aria-hidden="true" />
            </a>
          </div>

          <!-- Categories -->
          <nav class="cats" aria-label="Categories">
            <router-link v-for="cat in categories" :key="cat.id" :to="`/tabs/search/results?category=${cat.slug}`" class="cat">
              <span class="cat__icon"><ion-icon :icon="categoryIcon(cat.slug)" aria-hidden="true" /></span>
              <span class="cat__name">{{ shortName(cat.name) }}</span>
            </router-link>
          </nav>

          <!-- Sections -->
          <section v-for="(section, si) in sections" :key="section.key" class="section">
            <div class="pw-row-between section__head">
              <h2 class="pw-section-title">{{ section.title }}</h2>
              <button v-if="section.viewAllTo" type="button" class="pw-link" @click="openLink(section.viewAllTo)">See all</button>
            </div>
            <div v-if="si === 0" class="pw-grid-2">
              <ListingCard v-for="item in section.listings" :key="item.id" :listing="item" @toggle-favorite="favorite.toggle" />
            </div>
            <div v-else class="pw-scroll-x rail">
              <ListingCard
                v-for="item in section.listings"
                :key="item.id"
                class="rail__item"
                :listing="item"
                compact
                :show-favorite="false"
                :width="160"
              />
            </div>
          </section>

          <EmptyState
            v-if="!sections.length"
            title="The hangar is quiet"
            message="No listings yet. Be the first to list gear for other crews."
            action-label="Sell an item"
            action-to="/sell"
          />
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonToolbar,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue'
import { arrowForward, notificationsOutline, searchOutline } from 'ionicons/icons'
import { computed } from 'vue'
import { catalogueApi } from '@/api/catalogue'
import markWhite from '@/assets/brand/logo-mark-white.png'
import AppLogo from '@/components/AppLogo.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import ListingCard from '@/components/ListingCard.vue'
import ListingCardSkeleton from '@/components/ListingCardSkeleton.vue'
import { categoryIcon } from '@/constants/categoryIcons'
import { useAsync } from '@/composables/useAsync'
import { useAuthGate } from '@/composables/useAuthGate'
import { useFavorite } from '@/composables/useFavorite'
import { useBadgesStore } from '@/stores/badges'
import type { HomeFeed, Listing } from '@/types'
import { webPathToAppRoute } from '@/utils/routeMapping'

/** B1 (+ D2 dark) — GET /home: hero slides, categories, curated rails. */
const router = useIonRouter()
const badges = useBadgesStore()
const { requireAuth } = useAuthGate()

const home = useAsync<HomeFeed>(() => catalogueApi.home())

const slides = computed(() => home.data.value?.heroSlides ?? [])
const categories = computed(() => home.data.value?.categories ?? [])
const sections = computed(() => (home.data.value?.sections ?? []).filter((s) => s.listings.length))
const bellLabel = computed(() => (badges.notifications > 0 ? `Notifications, ${badges.notifications} unread` : 'Notifications'))

/** Patch a listing everywhere it appears on the feed after a favourite toggle. */
const favorite = useFavorite((updated: Listing) => {
  const feed = home.data.value
  if (!feed) return
  home.data.value = {
    ...feed,
    sections: feed.sections.map((s) => ({ ...s, listings: s.listings.map((l) => (l.id === updated.id ? updated : l)) })),
  }
})

onIonViewWillEnter(() => void badges.refresh())

function shortName(name: string) {
  return name.replace(/\s*&\s*audio$/i, '').replace(/^Uniform & apparel$/i, 'Apparel')
}

function openLink(link?: string | null) {
  if (!link) return
  router.push(webPathToAppRoute(link) ?? '/tabs/search/results')
}

function openNotifications() {
  if (requireAuth('/notifications')) router.push('/notifications')
}
</script>

<style scoped>
.top {
  display: flex;
  align-items: center;
  gap: var(--pw-space-3);
  padding: 4px var(--pw-gutter);
}

.top__search {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 16px;
  border-radius: var(--pw-radius-full);
  background: var(--pw-surface-muted);
  color: var(--pw-text-3);
  text-decoration: none;
  font-size: var(--pw-text-base);
  min-width: 0;
}

.top__search span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top__bell {
  position: relative;
  width: var(--pw-touch);
  height: var(--pw-touch);
  border: 0;
  background: transparent;
  color: var(--pw-text);
  font-size: 26px;
  display: grid;
  place-items: center;
}

.top__dot {
  position: absolute;
  top: 8px;
  right: 9px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--pw-danger-600);
  border: 2px solid var(--pw-surface);
}

.home {
  padding: var(--pw-space-4) var(--pw-gutter) var(--pw-space-10);
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-6);
}

.sk-hero {
  height: 170px;
  border-radius: var(--pw-radius-xl);
}

.hero-rail {
  display: flex;
  gap: var(--pw-space-3);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.hero {
  position: relative;
  flex: 0 0 100%;
  scroll-snap-align: start;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: var(--pw-space-6);
  border-radius: var(--pw-radius-xl);
  background: var(--pw-hero);
  color: #fff;
  text-decoration: none;
}

.hero__eyebrow {
  font-size: var(--pw-text-sm);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 75%);
}

.hero__title {
  color: #fff;
  font-size: var(--pw-text-2xl);
  line-height: 1.2;
  max-width: 16ch;
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.hero__mark {
  position: absolute;
  right: -20px;
  bottom: -18px;
  width: 170px;
  opacity: 0.12;
}

.cats {
  display: flex;
  gap: var(--pw-space-3);
  overflow-x: auto;
  scrollbar-width: none;
  margin-inline: calc(var(--pw-gutter) * -1);
  padding-inline: var(--pw-gutter);
}

.cat {
  flex: 0 0 auto;
  width: 82px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--pw-ink-2);
  font-size: var(--pw-text-sm);
  text-align: center;
}

.cat__icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--pw-surface);
  border: 1px solid var(--pw-border);
  color: var(--pw-primary);
  font-size: 26px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-3);
}

.rail {
  padding-bottom: 4px;
}

.rail__item {
  flex: 0 0 168px;
  scroll-snap-align: start;
}
</style>
