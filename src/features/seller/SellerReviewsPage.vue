<template>
  <ion-page>
    <AppHeader :title="title" :default-href="mine ? '/tabs/profile' : `/seller/${username}`" />
    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="pw-pad pw-stack pw-container">
        <section v-if="seller.data.value" class="pw-card summary">
          <div class="summary__score">
            <p class="summary__big">{{ seller.data.value.rating.toFixed(1) }}</p>
            <p class="stars" :aria-label="`${seller.data.value.rating.toFixed(1)} out of 5`">{{ starString(seller.data.value.rating) }}</p>
            <p class="pw-muted">{{ seller.data.value.totalReviews }} reviews</p>
          </div>
          <ul class="bars">
            <li v-for="n in [5, 4, 3, 2, 1]" :key="n">
              <span>{{ n }}</span>
              <span class="bar" aria-hidden="true"><span :style="{ width: `${barPct(n)}%` }" /></span>
              <span class="pw-muted">{{ breakdown(n) }}</span>
            </li>
          </ul>
        </section>

        <div v-if="tagCounts.length" class="tags">
          <span v-for="[tag, count] in tagCounts" :key="tag" class="tag">{{ tag }} · {{ count }}</span>
        </div>

        <ion-segment v-if="mine" v-model="roleFilter" class="pw-tabs">
          <ion-segment-button value="all"><ion-label>All</ion-label></ion-segment-button>
          <ion-segment-button value="buyer"><ion-label>From buyers</ion-label></ion-segment-button>
          <ion-segment-button value="seller"><ion-label>From sellers</ion-label></ion-segment-button>
        </ion-segment>

        <template v-if="reviews.loading.value">
          <ion-skeleton-text v-for="n in 3" :key="n" animated style="height: 120px; border-radius: 16px" />
        </template>
        <ErrorState v-else-if="reviews.error.value && !reviews.items.value.length" :error="reviews.error.value" @retry="reviews.loadFirst" />
        <EmptyState v-else-if="!visible.length" :icon="starOutline" title="No reviews yet" message="Reviews appear here once both sides of a completed order have rated each other." />

        <article v-for="r in visible" :key="r.id" class="pw-card review">
          <div class="review__head">
            <AvatarInitials :name="r.author.displayName" :initials-text="r.author.initials" :size="46" />
            <div class="review__who">
              <p>
                <strong>{{ r.author.displayName }}</strong>
                <span v-if="r.orderId" class="pw-subtle"> · verified purchase</span>
              </p>
              <p class="stars small" :aria-label="`${r.rating} out of 5`">{{ starString(r.rating) }}</p>
            </div>
            <span class="pw-subtle small">{{ timeAgo(r.createdAt) }}</span>
          </div>
          <p v-if="r.comment" class="review__body">{{ r.comment }}</p>
          <p v-if="r.listingTitle" class="pw-subtle small">{{ r.listingTitle }}{{ r.amount ? ` · ${formatMoney(r.amount)}` : '' }}</p>
          <div v-if="r.response" class="review__reply">
            <p class="review__reply-title">Response from {{ sellerFirstName }}</p>
            <p class="pw-muted">{{ r.response.body }}</p>
          </div>
        </article>

        <ion-infinite-scroll :disabled="!reviews.hasMore.value" @ion-infinite="reviews.loadMore">
          <ion-infinite-scroll-content />
        </ion-infinite-scroll>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
} from '@ionic/vue'
import { starOutline } from 'ionicons/icons'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { accountApi } from '@/api/account'
import { catalogueApi } from '@/api/catalogue'
import AppHeader from '@/components/AppHeader.vue'
import AvatarInitials from '@/components/AvatarInitials.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import { useAsync } from '@/composables/useAsync'
import { usePagedList } from '@/composables/usePagedList'
import { useAuthStore } from '@/stores/auth'
import type { SellerProfile, UserReview } from '@/types'
import { timeAgo } from '@/utils/date'
import { formatMoney } from '@/utils/money'

/** W2 — GET /sellers/{username}/reviews (public) or /me/reviews (route meta.mine). */
const route = useRoute()
const auth = useAuthStore()
const mine = !!route.meta.mine
const username = mine ? (auth.user?.username ?? '') : String(route.params.username)

const seller = useAsync<SellerProfile | null>(() => (username ? catalogueApi.seller(username) : Promise.resolve(null)))
const reviews = usePagedList<UserReview>((page) => (mine ? accountApi.reviews({ page }) : catalogueApi.sellerReviews(username, { page })))
onMounted(() => void reviews.loadFirst())

const roleFilter = ref<'all' | 'buyer' | 'seller'>('all')
const visible = computed(() => reviews.items.value.filter((r) => roleFilter.value === 'all' || r.role === roleFilter.value))

const sellerFirstName = computed(() => seller.data.value?.displayName.split(/\s+/)[0] ?? 'seller')
const title = computed(() => (mine ? 'My reviews' : `${seller.data.value?.displayName ?? 'Seller'} — Reviews`))

const total = computed(() => Object.values(seller.data.value?.ratingBreakdown ?? {}).reduce((a, b) => a + (b ?? 0), 0))
const breakdown = (n: number) => seller.data.value?.ratingBreakdown?.[String(n) as '1'] ?? 0
const barPct = (n: number) => (total.value ? Math.round((breakdown(n) / total.value) * 100) : 0)

const tagCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const r of reviews.items.value) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
})

function starString(rating: number) {
  const full = Math.round(rating)
  return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full))
}

async function onRefresh(event: CustomEvent) {
  await Promise.all([seller.refresh(), reviews.loadFirst()])
  ;(event.target as HTMLIonRefresherElement).complete()
}
</script>

<style scoped>
.summary {
  display: flex;
  gap: var(--pw-space-5);
  align-items: center;
}

.summary__score {
  text-align: center;
}

.summary__big {
  font-family: var(--pw-font-display);
  font-size: 3rem;
  font-weight: 700;
  color: var(--pw-primary);
  line-height: 1;
}

.stars {
  color: var(--pw-gold-500);
  letter-spacing: 2px;
}

.small {
  font-size: var(--pw-text-sm);
}

.bars {
  flex: 1 1 auto;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bars li {
  display: grid;
  grid-template-columns: 14px 1fr 28px;
  align-items: center;
  gap: 10px;
  font-size: var(--pw-text-sm);
}

.bar {
  height: 8px;
  border-radius: 4px;
  background: var(--pw-border);
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  background: var(--pw-gold-500);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 8px 14px;
  border-radius: var(--pw-radius-full);
  background: var(--pw-navy-100);
  color: var(--pw-primary);
  font-size: var(--pw-text-sm);
  font-weight: 500;
}

.review {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-3);
}

.review__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.review__who {
  flex: 1 1 auto;
}

.review__body {
  line-height: 1.55;
}

.review__reply {
  background: var(--pw-surface-muted);
  border-radius: var(--pw-radius-md);
  padding: var(--pw-space-3) var(--pw-space-4);
}

.review__reply-title {
  font-weight: 600;
  color: var(--pw-primary);
}
</style>
