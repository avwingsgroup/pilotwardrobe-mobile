<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div v-if="profile.loading.value && !seller" class="pw-pad">
        <ion-skeleton-text animated style="height: 260px; border-radius: 16px" />
      </div>
      <template v-else-if="profile.error.value && !seller">
        <div class="top-back"><ion-back-button default-href="/tabs/home" text="" :icon="chevronBack" /></div>
        <ErrorState :error="profile.error.value" @retry="profile.load" />
      </template>

      <template v-else-if="seller">
        <!-- Photographer storefront (W5) -->
        <header v-if="isPhotographer" class="photo">
          <div class="photo__cover">
            <PwImage v-if="seller.coverImage" :asset="seller.coverImage" :ratio="2.2" :width="430" eager />
            <ion-back-button class="photo__back" default-href="/tabs/home" text="" :icon="chevronBack" />
          </div>
          <div class="photo__id pw-container">
            <AvatarInitials class="photo__avatar" :name="seller.displayName" :image="seller.avatar" :size="96" :verified="seller.verified" />
            <div class="photo__text">
              <h1 class="photo__name">{{ seller.displayName }}</h1>
              <p class="pw-muted">{{ seller.jobTitle ?? 'Aviation photographer' }} · ★ {{ seller.rating.toFixed(1) }} · {{ seller.stats.soldCount }} licenses sold</p>
            </div>
            <ion-button class="photo__follow" :fill="following ? 'outline' : 'solid'" :disabled="followBusy" @click="toggleFollow">{{ following ? 'Following' : 'Follow' }}</ion-button>
          </div>
          <div class="photo__tags pw-container">
            <StatusBadge tone="navy" solid :icon="cameraOutline" label="Photographer store" />
            <StatusBadge tone="info" label="Digital delivery" />
          </div>
        </header>

        <!-- Seller hero (B12) -->
        <header v-else class="hero">
          <div class="hero__bar">
            <ion-back-button default-href="/tabs/home" text="" :icon="chevronBack" />
            <ion-button fill="clear" aria-label="More options" @click="more">
              <ion-icon slot="icon-only" :icon="ellipsisVertical" />
            </ion-button>
          </div>
          <AvatarInitials class="hero__avatar" :name="seller.displayName" :image="seller.avatar" :size="104" :verified="seller.verified" />
          <h1 class="hero__name">{{ seller.displayName }}</h1>
          <p class="hero__meta">{{ metaLine }}</p>
          <dl class="hero__stats">
            <div><dt>{{ seller.totalReviews }} reviews</dt><dd>{{ seller.rating.toFixed(1) }}★</dd></div>
            <div><dt>sales</dt><dd>{{ seller.stats.soldCount }}</dd></div>
            <div><dt>member since</dt><dd>{{ formatYear(seller.memberSince) }}</dd></div>
          </dl>
        </header>

        <ion-segment v-if="!isPhotographer" v-model="tab" class="pw-tabs tabs">
          <ion-segment-button value="listings"><ion-label>Listings · {{ seller.stats.listingsCount }}</ion-label></ion-segment-button>
          <ion-segment-button value="reviews"><ion-label>Reviews</ion-label></ion-segment-button>
          <ion-segment-button value="about"><ion-label>About</ion-label></ion-segment-button>
        </ion-segment>

        <div class="pane pw-container">
          <template v-if="tab === 'listings'">
            <div v-if="isPhotographer" class="pw-row-between pane__head">
              <h2 class="pw-section-title">Prints &amp; licenses</h2>
              <span class="pw-muted">{{ seller.stats.listingsCount }} works</span>
            </div>
            <div v-if="listings.loading.value" class="pw-grid-2"><ListingCardSkeleton v-for="n in 4" :key="n" /></div>
            <EmptyState v-else-if="listings.isEmpty.value" compact title="No live listings" message="Check back soon — or follow to hear about new gear." />
            <div v-else class="pw-grid-2">
              <ListingCard v-for="l in listings.items.value" :key="l.id" :listing="l" compact :show-seller="false" :show-favorite="false" />
            </div>
            <ion-infinite-scroll :disabled="!listings.hasMore.value" @ion-infinite="listings.loadMore">
              <ion-infinite-scroll-content />
            </ion-infinite-scroll>

            <section v-if="isPhotographer && seller.photographer?.licensing?.length" class="pw-card licensing">
              <h3 class="pw-eyebrow">Licensing</h3>
              <div v-for="tier in seller.photographer.licensing" :key="tier.tier" class="pw-row-between licensing__row">
                <div>
                  <p class="licensing__label">{{ tier.label }}</p>
                  <p class="pw-muted">{{ tier.description }}</p>
                </div>
                <strong v-if="tier.price" class="pw-price">{{ formatMoney(tier.price, { whole: true }) }}</strong>
              </div>
            </section>
          </template>

          <template v-else-if="tab === 'reviews'">
            <router-link :to="`/seller/${username}/reviews`" class="pw-link">See all {{ seller.totalReviews }} reviews →</router-link>
          </template>

          <template v-else>
            <section class="pw-card pw-stack-sm">
              <p v-if="seller.bio" class="pw-body">{{ seller.bio }}</p>
              <dl>
                <div v-if="seller.location" class="pw-kv"><dt>Based in</dt><dd>{{ seller.location }}</dd></div>
                <div v-if="seller.responseTime" class="pw-kv"><dt>Responds</dt><dd>{{ seller.responseTime }}</dd></div>
                <div class="pw-kv"><dt>On-time dispatch</dt><dd>{{ seller.stats.onTimeDispatchRate }}%</dd></div>
                <div class="pw-kv"><dt>Followers</dt><dd>{{ seller.followers }}</dd></div>
              </dl>
            </section>
          </template>
        </div>
      </template>
    </ion-content>

    <ion-footer v-if="seller && !isPhotographer && !isMe" class="pw-footer-bar">
      <ion-toolbar>
        <div class="foot">
          <ion-button fill="outline" class="pw-btn-lg" :disabled="messaging || !firstListingId" @click="message">Message</ion-button>
          <ion-button class="pw-btn-lg" :fill="following ? 'outline' : 'solid'" :disabled="followBusy" @click="toggleFollow">
            {{ following ? 'Following' : 'Follow' }}
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import {
  actionSheetController,
  IonBackButton,
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonToolbar,
  useIonRouter,
} from '@ionic/vue'
import { cameraOutline, chevronBack, ellipsisVertical } from 'ionicons/icons'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { catalogueApi } from '@/api/catalogue'
import { messagesApi } from '@/api/messages'
import AvatarInitials from '@/components/AvatarInitials.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import ListingCard from '@/components/ListingCard.vue'
import ListingCardSkeleton from '@/components/ListingCardSkeleton.vue'
import PwImage from '@/components/PwImage.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { appConfig } from '@/config/env'
import { useAsync } from '@/composables/useAsync'
import { useAuthGate } from '@/composables/useAuthGate'
import { useFeedback } from '@/composables/useFeedback'
import { usePagedList } from '@/composables/usePagedList'
import { useAuthStore } from '@/stores/auth'
import type { SellerProfile } from '@/types'
import { formatYear } from '@/utils/date'
import { formatMoney } from '@/utils/money'

/** B12 / W5 — GET /sellers/{username} (+ /listings), follow / unfollow, message. */
const route = useRoute()
const router = useIonRouter()
const auth = useAuthStore()
const { requireAuth } = useAuthGate()
const { toast, toastError } = useFeedback()

const username = String(route.params.username)
const profile = useAsync<SellerProfile>(() => catalogueApi.seller(username))
const listings = usePagedList((page) => catalogueApi.sellerListings(username, { page, perPage: 20 }))
onMounted(() => void listings.loadFirst())

const seller = computed(() => profile.data.value)
const isPhotographer = computed(() => !!seller.value?.isPhotographer)
const isMe = computed(() => auth.user?.username === username)
const tab = ref<'listings' | 'reviews' | 'about'>('listings')
const metaLine = computed(() => [seller.value?.jobTitle, seller.value?.aircraftType, seller.value?.location].filter(Boolean).join(' · '))
const firstListingId = computed(() => listings.items.value[0]?.id)

watch(tab, (t) => t === 'reviews' && router.push(`/seller/${username}/reviews`))

const following = ref(false)
watch(seller, (s) => (following.value = !!s?.isFollowing), { immediate: true })
const followBusy = ref(false)
const messaging = ref(false)

async function toggleFollow() {
  if (!requireAuth() || followBusy.value || !seller.value) return
  followBusy.value = true
  const next = !following.value
  following.value = next
  try {
    const res = next ? await catalogueApi.follow(username) : await catalogueApi.unfollow(username)
    profile.data.value = { ...seller.value, followers: res.followers, isFollowing: next }
  } catch (e) {
    following.value = !next
    await toastError(e)
  } finally {
    followBusy.value = false
  }
}

/** Conversations are about a listing (POST /conversations requires listing_id). */
async function message() {
  if (!requireAuth() || !firstListingId.value) return
  messaging.value = true
  try {
    const c = await messagesApi.start(firstListingId.value)
    router.push(`/conversations/${c.id}`)
  } catch (e) {
    await toastError(e)
  } finally {
    messaging.value = false
  }
}

async function more() {
  const sheet = await actionSheetController.create({
    buttons: [
      {
        text: 'Copy profile link',
        handler: () => void navigator.clipboard?.writeText(`${appConfig.webAppUrl}/seller/${username}`).then(() => toast('Link copied.', 'success')),
      },
      { text: 'Cancel', role: 'cancel' },
    ],
  })
  await sheet.present()
}
</script>

<style scoped>
.top-back {
  padding: calc(var(--ion-safe-area-top, 0px) + 8px) 8px 0;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: calc(var(--ion-safe-area-top, 0px) + 8px) var(--pw-gutter) var(--pw-space-6);
  background: var(--pw-hero);
  color: #fff;
  text-align: center;
}

.hero__bar {
  align-self: stretch;
  display: flex;
  justify-content: space-between;
  --color: #fff;
  color: #fff;
}

.hero__bar ion-back-button,
.hero__bar ion-button {
  --color: #fff;
}

.hero__avatar {
  border: 3px solid var(--pw-gold-400);
}

.hero__name {
  color: #fff;
  font-size: var(--pw-text-2xl);
  margin-top: 8px;
}

.hero__meta {
  color: rgb(255 255 255 / 75%);
}

.hero__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: 100%;
  max-width: 420px;
  margin: var(--pw-space-4) 0 0;
}

.hero__stats div {
  display: flex;
  flex-direction: column-reverse;
  border-left: 1px solid rgb(255 255 255 / 25%);
}

.hero__stats div:first-child {
  border-left: 0;
}

.hero__stats dd {
  margin: 0;
  font-family: var(--pw-font-display);
  font-size: var(--pw-text-2xl);
  font-weight: 700;
}

.hero__stats dt {
  color: rgb(255 255 255 / 75%);
  font-size: var(--pw-text-sm);
}

.tabs {
  background: var(--pw-surface);
}

.pane {
  padding: var(--pw-space-4) var(--pw-gutter) var(--pw-space-8);
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-4);
}

.pane__head {
  margin-top: var(--pw-space-2);
}

.photo__cover {
  position: relative;
}

.photo__back {
  position: absolute;
  top: calc(var(--ion-safe-area-top, 0px) + 8px);
  left: 12px;
  --background: rgb(255 255 255 / 92%);
  --border-radius: 50%;
  --color: #101a2d;
  width: 52px;
  height: 52px;
}

.photo__id {
  display: flex;
  align-items: flex-end;
  gap: var(--pw-space-3);
  padding: 0 var(--pw-gutter);
  margin-top: -40px;
  position: relative;
}

.photo__avatar {
  border: 4px solid var(--pw-surface);
}

.photo__text {
  flex: 1 1 auto;
  min-width: 0;
}

.photo__name {
  font-size: var(--pw-text-xl);
}

.photo__tags {
  display: flex;
  gap: 8px;
  padding: var(--pw-space-4) var(--pw-gutter) 0;
}

.licensing__row {
  padding: var(--pw-space-3) 0;
  border-bottom: 1px solid var(--pw-border);
}

.licensing__row:last-child {
  border-bottom: 0;
}

.licensing__label {
  font-weight: 600;
  font-size: var(--pw-text-md);
}

.foot {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
