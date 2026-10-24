<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom" class="tabbar">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="homeOutline" aria-hidden="true" />
          <ion-label>Home</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="search" href="/tabs/search">
          <ion-icon :icon="searchOutline" aria-hidden="true" />
          <ion-label>Search</ion-label>
        </ion-tab-button>

        <div class="sell">
          <button type="button" class="sell__fab" aria-label="Sell an item" @click="startSelling">
            <ion-icon :icon="add" aria-hidden="true" />
          </button>
          <span class="sell__label" aria-hidden="true">Sell</span>
        </div>

        <ion-tab-button tab="inbox" href="/tabs/inbox">
          <ion-icon :icon="chatboxOutline" aria-hidden="true" />
          <ion-label>Inbox</ion-label>
          <ion-badge v-if="inboxCount > 0" color="danger" :aria-label="`${inboxCount} unread`">{{ inboxCount > 99 ? '99+' : inboxCount }}</ion-badge>
        </ion-tab-button>
        <ion-tab-button tab="profile" href="/tabs/profile">
          <ion-icon :icon="personOutline" aria-hidden="true" />
          <ion-label>Profile</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBadge, IonIcon, IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs, useIonRouter } from '@ionic/vue'
import { add, chatboxOutline, homeOutline, personOutline, searchOutline } from 'ionicons/icons'
import { computed } from 'vue'
import { useAuthGate } from '@/composables/useAuthGate'
import { useBadgesStore } from '@/stores/badges'

const router = useIonRouter()
const badges = useBadgesStore()
const { requireAuth } = useAuthGate()

const inboxCount = computed(() => badges.messages)

function startSelling() {
  if (requireAuth('/sell')) router.push('/sell')
}
</script>

<style scoped>
.tabbar {
  height: calc(var(--pw-tabbar-h) + var(--ion-safe-area-bottom, 0px));
  padding-bottom: var(--ion-safe-area-bottom, 0px);
  border-top: 1px solid var(--pw-border);
  overflow: visible;
}

ion-tab-button {
  --color-selected: var(--pw-primary);
  font-weight: 600;
}

ion-tab-button ion-label {
  font-size: 12px;
  margin-top: 4px;
}

ion-badge {
  font-size: 10px;
}

.sell {
  position: relative;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 8px;
}

.sell__fab {
  position: absolute;
  top: -28px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 4px solid var(--pw-surface);
  background: var(--pw-primary);
  color: var(--pw-primary-contrast);
  display: grid;
  place-items: center;
  font-size: 30px;
  box-shadow: var(--pw-shadow-fab);
}

.sell__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--pw-text-3);
}
</style>
