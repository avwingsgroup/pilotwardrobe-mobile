<template>
  <ion-page>
    <AppHeader title="Disputes" default-href="/tabs/profile" />
    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="list.onRefresh"><ion-refresher-content /></ion-refresher>
      <div class="pw-pad pw-stack-sm pw-container">
        <template v-if="list.loading.value">
          <ion-skeleton-text v-for="n in 3" :key="n" animated style="height: 96px; border-radius: 16px" />
        </template>
        <ErrorState v-else-if="list.error.value && !list.items.value.length" :error="list.error.value" @retry="list.loadFirst" />
        <EmptyState
          v-else-if="list.isEmpty.value"
          :icon="shieldCheckmarkOutline"
          title="No disputes"
          message="If an order arrives damaged or not as described, report it from the order within the inspection window."
        />
        <router-link v-for="d in list.items.value" :key="d.id" :to="`/disputes/${d.id}`" class="row">
          <PwImage class="row__img" :asset="d.item.image" :ratio="1" :width="56" fit="contain" />
          <div class="row__body">
            <p class="row__title">{{ d.number }} · {{ d.item.title }}</p>
            <p class="pw-muted small">{{ d.reasonLabel }} · opened {{ formatShortDate(d.openedAt) }}</p>
          </div>
          <StatusBadge :tone="labelFor(DISPUTE_STATUS, d.status).tone" :label="labelFor(DISPUTE_STATUS, d.status).label" />
        </router-link>
        <ion-infinite-scroll :disabled="!list.hasMore.value" @ion-infinite="list.loadMore"><ion-infinite-scroll-content /></ion-infinite-scroll>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonPage, IonRefresher, IonRefresherContent, IonSkeletonText, onIonViewWillEnter } from '@ionic/vue'
import { shieldCheckmarkOutline } from 'ionicons/icons'
import { disputesApi } from '@/api/disputes'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PwImage from '@/components/PwImage.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { DISPUTE_STATUS, labelFor } from '@/constants/labels'
import { usePagedList } from '@/composables/usePagedList'
import type { Dispute } from '@/types'
import { formatShortDate } from '@/utils/date'

/** Derived screen — GET /me/disputes. */
const list = usePagedList<Dispute>((page) => disputesApi.mine({ page }))
onIonViewWillEnter(() => void list.loadFirst())
</script>

<style scoped>
.small {
  font-size: var(--pw-text-sm);
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: var(--pw-space-4);
  border: 1px solid var(--pw-border);
  border-radius: var(--pw-radius-lg);
  background: var(--pw-surface);
  text-decoration: none;
  color: inherit;
}

.row__img {
  flex: 0 0 56px;
  width: 56px;
  border-radius: 8px;
}

.row__body {
  flex: 1 1 auto;
  min-width: 0;
}

.row__title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
