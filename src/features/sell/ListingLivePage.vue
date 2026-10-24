<template>
  <ion-page>
    <ion-content class="pw-content-plain">
      <div class="live pw-container">
        <div v-if="detail.loading.value && !listing" class="center"><ion-spinner name="crescent" /></div>
        <ErrorState v-else-if="detail.error.value && !listing" :error="detail.error.value" @retry="detail.load" />

        <template v-else-if="listing">
          <SuccessHero
            v-if="isLive"
            tone="navy"
            :icon="airplaneOutline"
            title="You’re live!"
            :message="`Your ${shortTitle} is on the runway and visible to verified members.`"
          />
          <SuccessHero
            v-else
            tone="pending"
            :icon="timeOutline"
            title="Submitted for review"
            :message="`Our team checks new listings before they go live — usually within a few hours. We'll notify you when ${shortTitle} is approved.`"
          />

          <ItemSummary :title="listing.title" :image="listing.images[0]" class="item">
            <p class="pw-muted small"><strong class="pw-price">{{ formatMoney(listing.price) }}</strong> · {{ listing.id.slice(0, 12).toUpperCase() }}</p>
            <template #aside><StatusBadge :tone="status.tone" :label="status.label" /></template>
          </ItemSummary>

          <section v-if="isLive && auth.can('listings.promote')" class="promo">
            <p class="promo__title"><ion-icon :icon="star" aria-hidden="true" /> Get seen more</p>
            <p class="promo__text">Promoted listings appear on the home feed and top of search results.</p>
            <ion-button color="secondary" @click="promoteOpen = true">Promote listing</ion-button>
            <img :src="markWhite" alt="" aria-hidden="true" class="promo__mark" />
          </section>

          <div v-if="isLive" class="share">
            <span class="pw-muted">Share:</span>
            <button type="button" class="share__btn" aria-label="Copy link" @click="copyLink"><ion-icon :icon="linkOutline" /></button>
            <button type="button" class="share__btn" aria-label="Share" @click="share"><ion-icon :icon="shareSocialOutline" /></button>
          </div>
        </template>
      </div>
    </ion-content>
    <ion-footer v-if="listing" class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" fill="outline" class="pw-btn-lg" :router-link="`/listing/${listing.slug}`">View my listing</ion-button>
        <ion-button expand="block" fill="clear" color="medium" @click="done">Done</ion-button>
      </ion-toolbar>
    </ion-footer>

    <ion-modal class="pw-sheet" :is-open="promoteOpen" :initial-breakpoint="0.85" :breakpoints="[0, 0.85, 1]" @did-dismiss="promoteOpen = false">
      <PromoteSheet v-if="listing" :listing-id="listing.id" @close="promoteOpen = false" />
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonIcon, IonModal, IonPage, IonSpinner, IonToolbar, useIonRouter } from '@ionic/vue'
import { Share } from '@capacitor/share'
import { airplaneOutline, linkOutline, shareSocialOutline, star, timeOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { sellingApi } from '@/api/selling'
import markWhite from '@/assets/brand/logo-mark-white.png'
import ErrorState from '@/components/ErrorState.vue'
import ItemSummary from '@/components/ItemSummary.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import SuccessHero from '@/components/SuccessHero.vue'
import { appConfig } from '@/config/env'
import { LISTING_STATUS, labelFor } from '@/constants/labels'
import { useAsync } from '@/composables/useAsync'
import { useFeedback } from '@/composables/useFeedback'
import { useAuthStore } from '@/stores/auth'
import { formatMoney } from '@/utils/money'
import PromoteSheet from './PromoteSheet.vue'

/** S7 — outcome of publish: live (active) or in moderation (pending_review). */
const route = useRoute()
const router = useIonRouter()
const auth = useAuthStore()
const { toast } = useFeedback()

const detail = useAsync(() => sellingApi.myListing(String(route.params.id)))
const listing = computed(() => detail.data.value)
const isLive = computed(() => listing.value?.status === 'active')
const status = computed(() => labelFor(LISTING_STATUS, listing.value?.status ?? 'draft'))
const shortTitle = computed(() => (listing.value?.title ?? '').split(/[—,-]/)[0]?.trim() ?? 'item')
const promoteOpen = ref(false)
const url = computed(() => `${appConfig.webAppUrl}/marketplace/${listing.value?.slug}`)

async function copyLink() {
  await navigator.clipboard?.writeText(url.value)
  await toast('Link copied.', 'success')
}

async function share() {
  try {
    await Share.share({ title: listing.value?.title, url: url.value })
  } catch {
    // dismissed
  }
}

function done() {
  router.navigate('/tabs/profile/hangar', 'root', 'replace')
}
</script>

<style scoped>
.live {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-6);
  padding: calc(var(--ion-safe-area-top, 0px) + 40px) var(--pw-gutter) var(--pw-space-6);
}

.center {
  text-align: center;
  padding: var(--pw-space-10);
}

.item {
  background: var(--pw-surface-muted);
  border: 0;
}

.small {
  font-size: var(--pw-text-sm);
}

.promo {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: var(--pw-space-5);
  border-radius: var(--pw-radius-xl);
  background: var(--pw-hero);
  color: #fff;
}

.promo__title {
  font-family: var(--pw-font-display);
  font-weight: 700;
  font-size: var(--pw-text-lg);
}

.promo__title ion-icon {
  color: var(--pw-gold-400);
}

.promo__text {
  color: rgb(255 255 255 / 80%);
}

.promo__mark {
  position: absolute;
  right: -10px;
  bottom: -14px;
  width: 140px;
  opacity: 0.12;
}

.share {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.share__btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 0;
  background: var(--pw-surface-muted);
  color: var(--pw-primary);
  font-size: 22px;
  display: grid;
  place-items: center;
}
</style>
