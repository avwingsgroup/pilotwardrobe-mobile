<template>
  <ion-page>
    <ion-header class="pw-header-plain">
      <ion-toolbar>
        <ion-title>Profile</ion-title>
        <ion-buttons v-if="auth.hasSession" slot="end">
          <ion-button aria-label="Settings" router-link="/settings">
            <ion-icon slot="icon-only" :icon="settingsOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher v-if="auth.hasSession" slot="fixed" @ion-refresh="onRefresh"><ion-refresher-content /></ion-refresher>

      <div class="pw-pad pw-stack pw-container">
        <!-- Guest -->
        <template v-if="!auth.hasSession">
          <EmptyState
            :icon="personCircleOutline"
            title="Your aviation wardrobe"
            message="Log in to buy, sell and swap gear, track orders and manage your hangar."
            action-label="Log in or sign up"
            action-to="/auth?next=/tabs/profile"
          />
          <ion-list inset lines="full" class="menu">
            <ion-item button detail router-link="/support/contact"><ion-icon slot="start" :icon="helpBuoyOutline" /><ion-label>Help &amp; contact</ion-label></ion-item>
            <ion-item button detail router-link="/pages/terms"><ion-icon slot="start" :icon="documentTextOutline" /><ion-label>Terms of service</ion-label></ion-item>
            <ion-item button detail router-link="/pages/privacy"><ion-icon slot="start" :icon="lockClosedOutline" /><ion-label>Privacy policy</ion-label></ion-item>
          </ion-list>
        </template>

        <template v-else-if="user">
          <router-link to="/settings/profile" class="pw-card me">
            <AvatarInitials :name="user.displayName" :image="user.avatar" :size="64" :verified="auth.kycApproved" />
            <div class="me__text">
              <p class="me__name">{{ user.displayName }}</p>
              <p class="pw-muted">@{{ user.username }} · since {{ user.memberSince ? formatYear(user.memberSince) : '—' }}</p>
              <StatusBadge :tone="kyc.tone" :label="kyc.label" class="me__badge" />
            </div>
            <ion-icon :icon="chevronForward" aria-hidden="true" class="me__chev" />
          </router-link>

          <router-link v-if="!auth.kycApproved" to="/verification" class="pw-callout">
            <ion-icon :icon="shieldCheckmarkOutline" aria-hidden="true" />
            <span>
              <strong>{{ auth.kycStatus === 'pending' || auth.kycStatus === 'escalated' ? 'Verification in progress' : 'Become a Verified Seller' }}</strong><br />
              {{ auth.kycStatus === 'pending' || auth.kycStatus === 'escalated' ? 'We’ll notify you the moment you’re cleared.' : 'Unlock swaps, payouts and unlimited listings.' }}
            </span>
          </router-link>

          <div class="stats">
            <router-link to="/tabs/profile/hangar" class="stat"><strong>{{ counters?.activeListings ?? 0 }}</strong><span>Live listings</span></router-link>
            <router-link to="/orders" class="stat"><strong>{{ counters?.activeOrders ?? 0 }}</strong><span>Active orders</span></router-link>
            <router-link to="/tabs/inbox/offers" class="stat"><strong>{{ counters?.openOffers ?? 0 }}</strong><span>Open offers</span></router-link>
          </div>

          <ion-list inset lines="full" class="menu">
            <ion-list-header>Selling</ion-list-header>
            <ion-item button detail router-link="/tabs/profile/hangar"><ion-icon slot="start" :icon="airplaneOutline" /><ion-label>My hangar</ion-label></ion-item>
            <ion-item button detail router-link="/wallet"><ion-icon slot="start" :icon="walletOutline" /><ion-label>Wallet</ion-label></ion-item>
            <ion-item button detail router-link="/reviews"><ion-icon slot="start" :icon="starOutline" /><ion-label>Reviews</ion-label></ion-item>
          </ion-list>

          <ion-list inset lines="full" class="menu">
            <ion-list-header>Buying</ion-list-header>
            <ion-item button detail router-link="/orders"><ion-icon slot="start" :icon="cubeOutline" /><ion-label>Orders</ion-label></ion-item>
            <ion-item button detail router-link="/tabs/inbox/offers"><ion-icon slot="start" :icon="swapHorizontalOutline" /><ion-label>Offers &amp; swaps</ion-label></ion-item>
            <ion-item button detail router-link="/favorites"><ion-icon slot="start" :icon="heartOutline" /><ion-label>Saved items</ion-label></ion-item>
            <ion-item button detail router-link="/disputes">
              <ion-icon slot="start" :icon="alertCircleOutline" /><ion-label>Disputes</ion-label>
              <ion-badge v-if="counters?.openDisputes" slot="end" color="danger">{{ counters.openDisputes }}</ion-badge>
            </ion-item>
          </ion-list>

          <ion-list inset lines="full" class="menu">
            <ion-list-header>Account</ion-list-header>
            <ion-item button detail router-link="/settings/fit-kit"><ion-icon slot="start" :icon="resizeOutline" /><ion-label>Fit Kit — my sizes</ion-label></ion-item>
            <ion-item button detail router-link="/settings"><ion-icon slot="start" :icon="settingsOutline" /><ion-label>Settings</ion-label></ion-item>
            <ion-item button detail router-link="/support/contact"><ion-icon slot="start" :icon="helpBuoyOutline" /><ion-label>Help &amp; contact</ion-label></ion-item>
          </ion-list>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import {
  airplaneOutline,
  alertCircleOutline,
  chevronForward,
  cubeOutline,
  documentTextOutline,
  heartOutline,
  helpBuoyOutline,
  lockClosedOutline,
  personCircleOutline,
  resizeOutline,
  settingsOutline,
  shieldCheckmarkOutline,
  starOutline,
  swapHorizontalOutline,
  walletOutline,
} from 'ionicons/icons'
import { computed } from 'vue'
import AvatarInitials from '@/components/AvatarInitials.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { KYC_STATUS } from '@/constants/labels'
import { useAuthStore } from '@/stores/auth'
import { formatYear } from '@/utils/date'

/** Profile tab root (derived — no frame). Counts come from /auth/me `counters`. */
const auth = useAuthStore()
const user = computed(() => auth.user)
const counters = computed(() => auth.counters)
const kyc = computed(() => KYC_STATUS[auth.kycStatus])

onIonViewWillEnter(() => void auth.refresh({ maxAgeMs: 30_000 }))

async function onRefresh(event: CustomEvent) {
  await auth.refresh()
  ;(event.target as HTMLIonRefresherElement).complete()
}
</script>

<style scoped>
.me {
  display: flex;
  align-items: center;
  gap: var(--pw-space-4);
  text-decoration: none;
  color: inherit;
}

.me__text {
  flex: 1 1 auto;
  min-width: 0;
}

.me__name {
  font-family: var(--pw-font-display);
  font-size: var(--pw-text-xl);
  font-weight: 700;
}

.me__badge {
  margin-top: 6px;
}

.me__chev {
  color: var(--pw-text-3);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--pw-space-3);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--pw-space-4) var(--pw-space-2);
  border-radius: var(--pw-radius-lg);
  background: var(--pw-surface);
  border: 1px solid var(--pw-border);
  text-decoration: none;
  color: var(--pw-text-2);
  font-size: var(--pw-text-sm);
  text-align: center;
}

.stat strong {
  font-family: var(--pw-font-display);
  font-size: var(--pw-text-2xl);
  color: var(--pw-primary);
}

.menu {
  margin: 0;
  border-radius: var(--pw-radius-lg);
}

.menu ion-icon[slot='start'] {
  color: var(--pw-primary);
}

ion-list-header {
  font-size: var(--pw-text-sm);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pw-text-3);
}
</style>
