<template>
  <ion-page>
    <AppHeader title="Saved items" default-href="/tabs/profile" />
    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="list.onRefresh"><ion-refresher-content /></ion-refresher>
      <div class="pw-pad pw-container">
        <div v-if="list.loading.value" class="pw-grid-2"><ListingCardSkeleton v-for="n in 4" :key="n" /></div>
        <ErrorState v-else-if="list.error.value && !list.items.value.length" :error="list.error.value" @retry="list.loadFirst" />
        <EmptyState
          v-else-if="list.isEmpty.value"
          :icon="heartOutline"
          title="Nothing saved yet"
          message="Tap the heart on any listing to keep it here — we'll tell you if the price drops."
          action-label="Browse gear"
          action-to="/tabs/search/results"
        />
        <div v-else class="pw-grid-2">
          <ListingCard v-for="l in list.items.value" :key="l.id" :listing="l" @toggle-favorite="favorite.toggle" />
        </div>
        <ion-infinite-scroll :disabled="!list.hasMore.value" @ion-infinite="list.loadMore"><ion-infinite-scroll-content /></ion-infinite-scroll>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import { heartOutline } from 'ionicons/icons'
import { onMounted } from 'vue'
import { catalogueApi } from '@/api/catalogue'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import ListingCard from '@/components/ListingCard.vue'
import ListingCardSkeleton from '@/components/ListingCardSkeleton.vue'
import { useFavorite } from '@/composables/useFavorite'
import { usePagedList } from '@/composables/usePagedList'

/** Derived screen — GET /me/favorites. Unsaving removes the card. */
const list = usePagedList((page) => catalogueApi.favorites({ page }))
onMounted(() => void list.loadFirst())

const favorite = useFavorite((updated) => {
  if (updated.isFavorited) list.replace((l) => l.id === updated.id, updated)
  else list.remove((l) => l.id === updated.id)
})
</script>
