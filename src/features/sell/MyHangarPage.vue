<template>
  <ion-page>
    <AppHeader title="My hangar" default-href="/tabs/profile">
      <template #end>
        <ion-button aria-label="Wallet" router-link="/wallet"><ion-icon slot="icon-only" :icon="walletOutline" /></ion-button>
      </template>
    </AppHeader>
    <ion-segment v-model="tab" class="pw-tabs seg">
      <ion-segment-button value="live"><ion-label>Active{{ count('live') }}</ion-label></ion-segment-button>
      <ion-segment-button value="drafts"><ion-label>Drafts{{ count('drafts') }}</ion-label></ion-segment-button>
      <ion-segment-button value="sold"><ion-label>Sold{{ count('sold') }}</ion-label></ion-segment-button>
      <ion-segment-button value="paused"><ion-label>Paused{{ count('paused') }}</ion-label></ion-segment-button>
    </ion-segment>

    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="list.onRefresh"><ion-refresher-content /></ion-refresher>
      <div class="pw-pad pw-stack pw-container">
        <router-link v-if="tab === 'live' && resumeDraft" :to="`/sell/${resumeDraft.id}`" class="resume">
          <PwImage class="resume__img" :asset="resumeDraft.images[0]" :ratio="1" :width="56" fit="contain" />
          <div class="resume__text">
            <p class="resume__title">Resume draft — {{ resumeDraft.title || 'Untitled' }}</p>
            <p class="small">Autosaved {{ timeAgo(resumeDraft.updatedAt) }}</p>
          </div>
          <span class="resume__go">Continue</span>
        </router-link>

        <template v-if="list.loading.value">
          <ion-skeleton-text v-for="n in 3" :key="n" animated style="height: 140px; border-radius: 16px" />
        </template>
        <ErrorState v-else-if="list.error.value && !list.items.value.length" :error="list.error.value" @retry="list.loadFirst" />
        <EmptyState
          v-else-if="list.isEmpty.value"
          :icon="airplaneOutline"
          :title="tab === 'drafts' ? 'No drafts' : tab === 'sold' ? 'Nothing sold yet' : 'Your hangar is empty'"
          message="List gear in minutes — photos, price and freight, and you're live."
          action-label="Sell an item"
          action-to="/sell"
        />

        <article v-for="l in list.items.value" :key="l.id" class="item">
          <router-link :to="l.status === 'draft' ? `/sell/${l.id}` : `/listing/${l.slug}`" class="item__media" :aria-label="l.title">
            <PwImage :asset="l.images[0]" :ratio="1" :width="110" fit="contain" />
            <span v-if="l.promoted" class="item__star" aria-label="Promoted"><ion-icon :icon="star" /></span>
          </router-link>
          <div class="item__body">
            <div class="pw-row-between top">
              <h2 class="item__title">{{ l.title || 'Untitled draft' }}</h2>
              <button type="button" class="item__more" :aria-label="`More actions for ${l.title}`" @click="menu(l)"><ion-icon :icon="ellipsisVertical" /></button>
            </div>
            <p class="item__price">
              <span class="pw-price">{{ formatMoney(l.price) }}</span>
              <StatusBadge v-if="l.swappable" :icon="swapHorizontalOutline" label="Swap OK" />
            </p>
            <p class="pw-muted small">{{ l.viewsCount }} views · {{ l.favoritesCount }} saves · {{ l.offersCount ?? 0 }} offers</p>
            <div class="item__foot">
              <StatusBadge v-if="l.promoted" tone="gold" solid :icon="star" label="Promoted" />
              <StatusBadge v-else-if="l.status !== 'active'" :tone="labelFor(LISTING_STATUS, l.status).tone" :label="labelFor(LISTING_STATUS, l.status).label" />
              <span v-if="l.boost?.endsAt" class="boost">boost ends in {{ countdown(l.boost.endsAt) }}</span>
              <template v-else>
                <ion-button v-for="a in quickActions(l)" :key="a.key" size="small" fill="outline" color="medium" @click="a.run()">{{ a.label }}</ion-button>
              </template>
            </div>
            <p v-if="l.moderation?.reason" class="pw-callout pw-callout--danger small">{{ l.moderation.reason }}</p>
          </div>
        </article>

        <ion-infinite-scroll :disabled="!list.hasMore.value" @ion-infinite="list.loadMore"><ion-infinite-scroll-content /></ion-infinite-scroll>
      </div>
    </ion-content>

    <ion-modal class="pw-sheet" :is-open="!!promoteId" :initial-breakpoint="0.85" :breakpoints="[0, 0.85, 1]" @did-dismiss="promoteId = null">
      <PromoteSheet v-if="promoteId" :listing-id="promoteId" @close="promoteId = null" />
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  actionSheetController,
  IonButton,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue'
import { airplaneOutline, ellipsisVertical, star, swapHorizontalOutline, walletOutline } from 'ionicons/icons'
import { computed, ref, watch } from 'vue'
import { toApiError } from '@/api/errors'
import { sellingApi, type ListingStateAction, type MyListingsMeta } from '@/api/selling'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PwImage from '@/components/PwImage.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { LISTING_STATUS, labelFor } from '@/constants/labels'
import { useFeedback } from '@/composables/useFeedback'
import { usePagedList } from '@/composables/usePagedList'
import type { Listing, ListingAction } from '@/types'
import { countdown, timeAgo } from '@/utils/date'
import { formatMoney } from '@/utils/money'
import PromoteSheet from './PromoteSheet.vue'

/**
 * S8 — GET /me/listings with status tabs and `meta.counts`. Every action shown comes
 * from the listing's `allowed_actions`; illegal transitions return 409 and refetch.
 */
const router = useIonRouter()
const { toast, confirm } = useFeedback()

const tab = ref<'live' | 'drafts' | 'sold' | 'paused'>('live')
const list = usePagedList<Listing, MyListingsMeta>((page) => sellingApi.myListings({ status: tab.value, page, perPage: 20 }))
const drafts = ref<Listing[]>([])
const promoteId = ref<string | null>(null)

const counts = computed(() => list.meta.value?.counts)
const count = (key: 'live' | 'drafts' | 'sold' | 'paused') => (counts.value?.[key] !== undefined ? ` · ${counts.value[key]}` : '')
const resumeDraft = computed(() => drafts.value[0] ?? null)

async function loadDrafts() {
  try {
    drafts.value = (await sellingApi.myListings({ status: 'drafts', perPage: 1 })).data
  } catch {
    drafts.value = []
  }
}

onIonViewWillEnter(() => {
  void list.loadFirst()
  void loadDrafts()
})
watch(tab, () => void list.loadFirst())

const ACTION_PATH: Partial<Record<ListingAction, ListingStateAction>> = {
  pause: 'pause',
  resume: 'resume',
  archive: 'archive',
  mark_sold: 'mark-sold',
  mark_unavailable: 'mark-unavailable',
  relist: 'relist',
  resubmit: 'resubmit',
}
const ACTION_LABEL: Record<string, string> = {
  edit: 'Edit',
  finish: 'Finish draft',
  promote: 'Promote',
  pause: 'Pause',
  resume: 'Resume',
  archive: 'Archive',
  mark_sold: 'Mark sold',
  mark_unavailable: 'Mark unavailable',
  relist: 'Relist',
  resubmit: 'Resubmit for review',
  delete: 'Delete',
}

async function runState(l: Listing, action: ListingStateAction) {
  try {
    const res = await sellingApi.action(l.id, action)
    await toast(res.message ?? 'Listing updated.', 'success')
  } catch (e) {
    await toast(toApiError(e).message, 'danger')
  }
  await list.loadFirst()
}

async function remove(l: Listing) {
  if (!(await confirm({ header: 'Delete listing?', message: `"${l.title || 'Untitled draft'}" will be removed permanently.`, confirmText: 'Delete listing', destructive: true }))) return
  try {
    await sellingApi.remove(l.id)
    list.remove((x) => x.id === l.id)
    await toast('Listing deleted.', 'success')
  } catch (e) {
    await toast(toApiError(e).message, 'danger')
  }
}

function perform(l: Listing, action: ListingAction) {
  if (action === 'edit' || action === 'finish') return router.push(`/sell/${l.id}`)
  if (action === 'preview') return router.push(`/listing/${l.slug}`)
  if (action === 'promote') {
    promoteId.value = l.id
    return
  }
  if (action === 'delete') return void remove(l)
  if (action === 'mark_sold') {
    return void confirm({ header: 'Mark as sold?', message: 'Use this when the item sold outside Pilotwardrobe. It will be hidden from search.', confirmText: 'Mark sold' }).then(
      async (ok) => {
        if (ok) await runState(l, 'mark-sold')
      },
    )
  }
  const path = ACTION_PATH[action]
  if (path) void runState(l, path)
}

function quickActions(l: Listing) {
  const order: ListingAction[] = ['finish', 'edit', 'promote', 'mark_sold', 'resume', 'relist', 'resubmit']
  return order
    .filter((a) => l.allowedActions?.includes(a))
    .slice(0, 2)
    .map((a) => ({ key: a, label: ACTION_LABEL[a] ?? a, run: () => perform(l, a) }))
}

async function menu(l: Listing) {
  const actions = (l.allowedActions ?? []).filter((a) => ACTION_LABEL[a] || a === 'preview')
  const sheet = await actionSheetController.create({
    header: l.title || 'Draft',
    buttons: [
      ...actions.map((a) => ({
        text: a === 'preview' ? 'View listing' : (ACTION_LABEL[a] ?? a),
        role: a === 'delete' ? 'destructive' : undefined,
        handler: () => void perform(l, a),
      })),
      { text: 'Cancel', role: 'cancel' },
    ],
  })
  await sheet.present()
}
</script>

<style scoped>
.seg {
  background: var(--pw-surface);
}

.small {
  font-size: var(--pw-text-sm);
}

.resume {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: var(--pw-space-4);
  border-radius: var(--pw-radius-lg);
  background: var(--pw-gold-100);
  border: 1.5px solid color-mix(in srgb, var(--pw-gold-500) 45%, transparent);
  color: var(--pw-warning-700);
  text-decoration: none;
}

.resume__img {
  flex: 0 0 56px;
  width: 56px;
  border-radius: 8px;
}

.resume__text {
  flex: 1 1 auto;
  min-width: 0;
}

.resume__title {
  font-weight: 700;
}

.resume__go {
  font-weight: 700;
}

.item {
  display: flex;
  gap: var(--pw-space-4);
  padding: var(--pw-space-4);
  background: var(--pw-surface);
  border: 1px solid var(--pw-border);
  border-radius: var(--pw-radius-lg);
}

.item__media {
  position: relative;
  flex: 0 0 110px;
  width: 110px;
  border-radius: var(--pw-radius-md);
  overflow: hidden;
  align-self: flex-start;
}

.item__star {
  position: absolute;
  top: 6px;
  left: 6px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: var(--pw-gold-500);
  color: #fff;
}

.item__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.top {
  align-items: flex-start;
}

.item__title {
  font-size: var(--pw-text-md);
  font-weight: 600;
  line-height: 1.3;
}

.item__more {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  color: var(--pw-text-3);
  font-size: 20px;
}

.item__price {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item__price .pw-price {
  font-size: var(--pw-text-xl);
}

.item__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.item__foot ion-button {
  margin: 0;
}

.boost {
  color: var(--pw-warning-700);
  font-size: var(--pw-text-sm);
}
</style>
