<template>
  <ion-page>
    <ion-header class="pw-header-plain">
      <ion-toolbar>
        <ion-title class="title">Inbox</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/tabs/inbox/offers" aria-label="Offers and swaps">
            <ion-icon slot="icon-only" :icon="pricetagsOutline" />
          </ion-button>
          <ion-button :aria-label="searching ? 'Close search' : 'Search conversations'" @click="searching = !searching">
            <ion-icon slot="icon-only" :icon="searching ? closeOutline : searchOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar v-if="searching">
        <ion-searchbar v-model="query" class="pw-searchbar" placeholder="Search by name or item" />
      </ion-toolbar>
      <div class="filters" role="tablist" aria-label="Filter conversations">
        <button
          v-for="f in filterOptions"
          :key="f.value"
          type="button"
          role="tab"
          class="filter"
          :class="{ on: filter === f.value }"
          :aria-selected="filter === f.value"
          @click="filter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </ion-header>

    <ion-content class="pw-content-plain">
      <ion-refresher slot="fixed" @ion-refresh="list.onRefresh"><ion-refresher-content /></ion-refresher>

      <div v-if="list.loading.value" class="pw-pad pw-stack">
        <ion-skeleton-text v-for="n in 5" :key="n" animated style="height: 72px; border-radius: 12px" />
      </div>
      <ErrorState v-else-if="list.error.value && !list.items.value.length" :error="list.error.value" @retry="list.loadFirst" />
      <EmptyState
        v-else-if="!visible.length"
        :icon="chatbubblesOutline"
        :title="list.items.value.length ? 'No matches' : 'No messages yet'"
        :message="list.items.value.length ? 'Try another filter.' : 'Ask a seller a question from any listing — conversations appear here.'"
        :action-label="list.items.value.length ? undefined : 'Browse gear'"
        action-to="/tabs/search/results"
      />

      <ul v-else class="threads">
        <li v-for="c in visible" :key="c.id">
          <router-link :to="`/conversations/${c.id}`" class="thread" :class="{ 'thread--unread': c.unreadCount > 0 }">
            <span class="thread__avatar">
              <AvatarInitials :name="c.participant.displayName" :initials-text="c.participant.initials" :size="56" />
              <PwImage v-if="c.listing?.image" class="thread__thumb" :asset="c.listing.image" :ratio="1" :width="28" />
            </span>
            <span class="thread__body">
              <span class="thread__top">
                <span class="thread__name">{{ c.participant.displayName }} <VerifiedShield v-if="c.participant.kycVerified" /></span>
                <span class="thread__time">{{ timeAgoShort(c.lastMessageAt) }}</span>
              </span>
              <span v-if="c.listing" class="thread__ctx">{{ c.listing.title }}</span>
              <span class="thread__preview">{{ c.lastMessagePreview }}</span>
            </span>
            <span v-if="c.unreadCount" class="thread__badge" :aria-label="`${c.unreadCount} unread`">{{ c.unreadCount }}</span>
          </router-link>
        </li>
      </ul>
      <ion-infinite-scroll :disabled="!list.hasMore.value" @ion-infinite="list.loadMore"><ion-infinite-scroll-content /></ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { chatbubblesOutline, closeOutline, pricetagsOutline, searchOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { messagesApi } from '@/api/messages'
import AvatarInitials from '@/components/AvatarInitials.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PwImage from '@/components/PwImage.vue'
import VerifiedShield from '@/components/VerifiedShield.vue'
import { usePagedList } from '@/composables/usePagedList'
import { useBadgesStore } from '@/stores/badges'
import type { Conversation } from '@/types'
import { timeAgoShort } from '@/utils/date'

/** M1 — GET /conversations (paginated). Polling-based; refreshed on every visit. */
const badges = useBadgesStore()
const list = usePagedList<Conversation>((page) => messagesApi.conversations({ page, perPage: 30 }))

const filter = ref<'all' | 'buying' | 'selling' | 'unread'>('all')
const searching = ref(false)
const query = ref('')

const count = (ctx: 'buying' | 'selling') => list.items.value.filter((c) => c.context === ctx).length
const filterOptions = computed(() => [
  { value: 'all' as const, label: 'All' },
  { value: 'buying' as const, label: `Buying · ${count('buying')}` },
  { value: 'selling' as const, label: `Selling · ${count('selling')}` },
  { value: 'unread' as const, label: 'Unread' },
])

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return list.items.value.filter((c) => {
    if (filter.value === 'unread' && !c.unreadCount) return false
    if ((filter.value === 'buying' || filter.value === 'selling') && c.context !== filter.value) return false
    if (q && !`${c.participant.displayName} ${c.listing?.title ?? ''}`.toLowerCase().includes(q)) return false
    return true
  })
})

onIonViewWillEnter(() => {
  void list.loadFirst()
  void badges.refresh()
})
</script>

<style scoped>
.title {
  font-size: var(--pw-text-2xl);
}

.filters {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 4px var(--pw-gutter) 12px;
  background: var(--pw-surface);
  scrollbar-width: none;
}

.filter {
  flex: 0 0 auto;
  min-height: 44px;
  padding: 0 20px;
  border-radius: var(--pw-radius-full);
  border: 1.5px solid var(--pw-border);
  background: var(--pw-surface);
  color: var(--pw-ink-2);
  font: inherit;
  font-weight: 500;
}

.filter.on {
  background: var(--pw-primary);
  border-color: var(--pw-primary);
  color: var(--pw-primary-contrast);
}

.threads {
  list-style: none;
  margin: 0;
  padding: 0;
}

.thread {
  display: flex;
  gap: var(--pw-space-4);
  align-items: flex-start;
  padding: var(--pw-space-4) var(--pw-gutter);
  border-bottom: 1px solid var(--pw-border);
  text-decoration: none;
  color: inherit;
}

.thread--unread {
  background: var(--pw-navy-50);
  box-shadow: inset 4px 0 0 var(--pw-primary);
}

.thread__avatar {
  position: relative;
  flex: 0 0 auto;
}

.thread__thumb {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 28px;
  border-radius: 6px;
  border: 2px solid var(--pw-surface);
}

.thread__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.thread__top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.thread__name {
  font-family: var(--pw-font-display);
  font-weight: 600;
  font-size: var(--pw-text-md);
}

.thread__time {
  color: var(--pw-text-3);
  font-size: var(--pw-text-sm);
  flex: 0 0 auto;
}

.thread--unread .thread__time {
  color: var(--pw-primary);
  font-weight: 600;
}

.thread__ctx {
  color: var(--pw-text-2);
  font-size: var(--pw-text-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thread__preview {
  color: var(--pw-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thread--unread .thread__preview {
  color: var(--pw-text);
  font-weight: 500;
}

.thread__badge {
  align-self: center;
  display: grid;
  place-items: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 14px;
  background: var(--pw-primary);
  color: var(--pw-primary-contrast);
  font-size: var(--pw-text-sm);
  font-weight: 700;
}
</style>
