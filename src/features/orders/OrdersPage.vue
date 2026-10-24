<template>
  <ion-page>
    <AppHeader title="Orders" default-href="/tabs/profile" />
    <ion-segment v-model="role" class="pw-tabs seg">
      <ion-segment-button value="buying"><ion-label>Purchases</ion-label></ion-segment-button>
      <ion-segment-button value="selling"><ion-label>Sales</ion-label></ion-segment-button>
    </ion-segment>
    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="list.onRefresh"><ion-refresher-content /></ion-refresher>
      <div class="pw-pad pw-stack-sm pw-container">
        <template v-if="list.loading.value">
          <ion-skeleton-text v-for="n in 4" :key="n" animated style="height: 96px; border-radius: 16px" />
        </template>
        <ErrorState v-else-if="list.error.value && !list.items.value.length" :error="list.error.value" @retry="list.loadFirst" />
        <EmptyState
          v-else-if="list.isEmpty.value"
          :icon="cubeOutline"
          :title="role === 'buying' ? 'No purchases yet' : 'No sales yet'"
          :message="role === 'buying' ? 'Orders you place appear here with live tracking.' : 'When someone buys your gear, the order shows here.'"
          :action-label="role === 'buying' ? 'Browse gear' : 'Sell an item'"
          :action-to="role === 'buying' ? '/tabs/search/results' : '/sell'"
        />
        <router-link v-for="o in list.items.value" :key="o.id" :to="`/orders/${o.id}`" class="order">
          <PwImage class="order__img" :asset="o.items[0]?.image" :ratio="1" :width="64" fit="contain" />
          <div class="order__body">
            <p class="order__title">{{ o.items[0]?.title ?? o.number }}</p>
            <p class="pw-muted small">{{ o.number }} · {{ formatShortDate(o.placedAt) }} · {{ role === 'buying' ? o.seller.displayName : o.buyer.displayName }}</p>
            <StatusBadge :tone="labelFor(ORDER_STATUS, o.status).tone" :label="o.statusLabel ?? labelFor(ORDER_STATUS, o.status).label" />
          </div>
          <strong class="pw-price">{{ formatMoney(o.totals.total) }}</strong>
        </router-link>
        <ion-infinite-scroll :disabled="!list.hasMore.value" @ion-infinite="list.loadMore"><ion-infinite-scroll-content /></ion-infinite-scroll>
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
  onIonViewWillEnter,
} from '@ionic/vue'
import { cubeOutline } from 'ionicons/icons'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ordersApi } from '@/api/orders'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PwImage from '@/components/PwImage.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { ORDER_STATUS, labelFor } from '@/constants/labels'
import { usePagedList } from '@/composables/usePagedList'
import type { Order, OrderRoleFilter } from '@/types'
import { formatShortDate } from '@/utils/date'
import { formatMoney } from '@/utils/money'

/** Derived screen — GET /me/orders?role=buying|selling (paginated). */
const route = useRoute()
const role = ref<OrderRoleFilter>(route.query.role === 'selling' || route.query.role === 'seller' ? 'selling' : 'buying')
const list = usePagedList<Order>((page) => ordersApi.mine({ role: role.value, page, perPage: 20 }))
onIonViewWillEnter(() => void list.loadFirst())
watch(role, () => void list.loadFirst())
</script>

<style scoped>
.seg {
  background: var(--pw-surface);
}

.small {
  font-size: var(--pw-text-sm);
}

.order {
  display: flex;
  align-items: center;
  gap: var(--pw-space-3);
  padding: var(--pw-space-4);
  background: var(--pw-surface);
  border: 1px solid var(--pw-border);
  border-radius: var(--pw-radius-lg);
  text-decoration: none;
  color: inherit;
}

.order__img {
  flex: 0 0 64px;
  width: 64px;
  border-radius: var(--pw-radius-md);
}

.order__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.order__title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
