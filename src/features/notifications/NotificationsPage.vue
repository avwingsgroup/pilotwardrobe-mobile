<template>
  <ion-page>
    <AppHeader title="Notifications" default-href="/tabs/home">
      <template #end>
        <ion-button fill="clear" class="mark" :disabled="!hasUnread || marking" @click="markAll">Mark all read</ion-button>
      </template>
    </AppHeader>
    <ion-content class="pw-content-plain">
      <ion-refresher slot="fixed" @ion-refresh="list.onRefresh"><ion-refresher-content /></ion-refresher>

      <div v-if="list.loading.value" class="pw-pad pw-stack">
        <ion-skeleton-text v-for="n in 5" :key="n" animated style="height: 76px; border-radius: 12px" />
      </div>
      <ErrorState v-else-if="list.error.value && !list.items.value.length" :error="list.error.value" @retry="list.loadFirst" />
      <EmptyState
        v-else-if="list.isEmpty.value"
        :icon="notificationsOffOutline"
        title="You're all caught up"
        message="Offers, order updates and price drops on saved gear will land here."
      />

      <template v-else>
        <section v-for="group in groups" :key="group.key">
          <h2 class="pw-eyebrow group">{{ group.label }}</h2>
          <ul class="list">
            <li v-for="n in group.items" :key="n.id">
              <button type="button" class="ntf" :class="{ 'ntf--unread': !n.readAt }" @click="open(n)">
                <span class="ntf__icon" :class="`ntf__icon--${tone(n)}`" aria-hidden="true"><ion-icon :icon="iconFor(n)" /></span>
                <span class="ntf__body">
                  <span class="ntf__title" :class="{ 'ntf__title--danger': tone(n) === 'danger' }">{{ n.title }}</span>
                  <span v-if="n.body" class="ntf__text">{{ n.body }}</span>
                  <span class="ntf__meta">{{ timeAgo(n.createdAt) }} · {{ categoryLabel(n.category) }}</span>
                  <span v-if="n.actions?.length" class="ntf__actions">
                    <ion-button v-for="a in n.actions" :key="a.to" size="small" :fill="a.variant === 'primary' ? 'solid' : 'outline'" @click.stop="go(n, a.to)">
                      {{ a.label }}
                    </ion-button>
                  </span>
                </span>
                <span v-if="!n.readAt" class="ntf__dot" aria-label="Unread" />
              </button>
            </li>
          </ul>
        </section>
      </template>
      <ion-infinite-scroll :disabled="!list.hasMore.value" @ion-infinite="list.loadMore"><ion-infinite-scroll-content /></ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue'
import {
  airplaneOutline,
  alertCircleOutline,
  cardOutline,
  chatbubbleOutline,
  cubeOutline,
  heartOutline,
  notificationsOffOutline,
  notificationsOutline,
  shieldCheckmarkOutline,
  starOutline,
  timeOutline,
  walletOutline,
} from 'ionicons/icons'
import { computed, ref } from 'vue'
import { notificationsApi } from '@/api/notifications'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import { titleCase } from '@/constants/labels'
import { useFeedback } from '@/composables/useFeedback'
import { usePagedList } from '@/composables/usePagedList'
import { routeForWebLink } from '@/services/appLinks'
import { useBadgesStore } from '@/stores/badges'
import type { AppNotification } from '@/types'
import { dayBucket, timeAgo } from '@/utils/date'

/**
 * M3 — GET /notifications. In-app records (database notifications) are distinct
 * from push: a push tap marks its record read via `notification_id`.
 * Links are web paths and go through the route mapper; absolute URLs are ignored.
 */
const router = useIonRouter()
const badges = useBadgesStore()
const { toastError } = useFeedback()
const list = usePagedList<AppNotification>((page) => notificationsApi.list({ page, perPage: 30 }))
const marking = ref(false)

onIonViewWillEnter(() => void list.loadFirst())

const hasUnread = computed(() => list.items.value.some((n) => !n.readAt))

const groups = computed(() => {
  const labels = { today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier' } as const
  const out: { key: string; label: string; items: AppNotification[] }[] = []
  for (const n of list.items.value) {
    const key = dayBucket(n.createdAt)
    let g = out.find((x) => x.key === key)
    if (!g) out.push((g = { key, label: labels[key], items: [] }))
    g.items.push(n)
  }
  return out
})

const ICONS: Record<string, string> = {
  offer: cardOutline,
  order: airplaneOutline,
  landed: cubeOutline,
  dispute: alertCircleOutline,
  review: starOutline,
  payout: walletOutline,
  verified: shieldCheckmarkOutline,
  message: chatbubbleOutline,
  price_drop: heartOutline,
  action: timeOutline,
}
const iconFor = (n: AppNotification) => ICONS[n.icon] ?? notificationsOutline
const tone = (n: AppNotification) =>
  n.icon === 'offer' || n.icon === 'payout' ? 'success' : n.icon === 'dispute' ? 'danger' : n.icon === 'review' ? 'gold' : 'navy'

const CATEGORY: Record<string, string> = {
  offers_swaps: 'Offers',
  orders: 'Orders',
  messages: 'Messages',
  account: 'Account',
  disputes: 'Disputes',
  payouts: 'Payouts',
  reviews: 'Reviews',
}
const categoryLabel = (c: string) => CATEGORY[c] ?? titleCase(c)

async function markRead(n: AppNotification) {
  if (n.readAt) return
  list.replace((x) => x.id === n.id, { ...n, readAt: new Date().toISOString() })
  try {
    await notificationsApi.markRead(n.id)
  } catch {
    // The unread dot will reappear on next refresh; not worth interrupting.
  }
  void badges.refresh()
}

function go(n: AppNotification, link: string | null | undefined) {
  void markRead(n)
  router.push(routeForWebLink(link))
}

function open(n: AppNotification) {
  go(n, n.link ?? n.actions?.[0]?.to)
}

async function markAll() {
  marking.value = true
  try {
    await notificationsApi.markAllRead()
    const now = new Date().toISOString()
    list.items.value = list.items.value.map((n) => ({ ...n, readAt: n.readAt ?? now }))
    void badges.refresh()
  } catch (e) {
    await toastError(e)
  } finally {
    marking.value = false
  }
}
</script>

<style scoped>
.mark {
  font-weight: 600;
  --padding-end: 0;
}

.group {
  padding: var(--pw-space-5) var(--pw-gutter) var(--pw-space-2);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ntf {
  display: flex;
  gap: var(--pw-space-4);
  align-items: flex-start;
  width: 100%;
  padding: var(--pw-space-4) var(--pw-gutter);
  border: 0;
  background: transparent;
  text-align: left;
  font: inherit;
  color: inherit;
}

.ntf--unread {
  background: var(--pw-navy-50);
}

.ntf__icon {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  font-size: 22px;
}

.ntf__icon--navy {
  background: var(--pw-navy-100);
  color: var(--pw-primary);
}

.ntf__icon--success {
  background: var(--pw-success-100);
  color: var(--pw-success-600);
}

.ntf__icon--gold {
  background: var(--pw-gold-100);
  color: var(--pw-gold-500);
}

.ntf__icon--danger {
  background: var(--pw-danger-100);
  color: var(--pw-danger-600);
}

.ntf__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ntf__title {
  font-weight: 600;
  line-height: 1.4;
}

.ntf__title--danger {
  color: var(--pw-danger-600);
}

.ntf__text {
  color: var(--pw-text-2);
  line-height: 1.45;
}

.ntf__meta {
  color: var(--pw-text-3);
  font-size: var(--pw-text-sm);
}

.ntf__actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.ntf__dot {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--pw-primary);
  margin-top: 8px;
}
</style>
