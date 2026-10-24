<template>
  <ion-page :class="{ approved: status === 'approved' }">
    <ion-content :class="status === 'approved' ? 'navy' : 'pw-content-plain'">
      <div v-if="kyc.loading.value && !kyc.data.value" class="center"><ion-spinner name="crescent" /></div>
      <ErrorState v-else-if="kyc.error.value && !kyc.data.value" :error="kyc.error.value" @retry="kyc.load" />

      <div v-else-if="kyc.data.value" class="st pw-container">
        <!-- K6 approved -->
        <template v-if="status === 'approved'">
          <SuccessHero tone="gold" :icon="shieldCheckmarkOutline" title="Wings earned." class="on-navy">
            You're now a <strong class="gold">Verified Seller</strong>. Your gold badge shows on every listing, and listing limits are lifted.
          </SuccessHero>
          <p class="pill"><VerifiedShield /> {{ auth.user?.displayName }} · Verified Seller</p>
        </template>

        <!-- K7 rejected -->
        <template v-else-if="status === 'rejected' || status === 'expired'">
          <SuccessHero tone="danger" :icon="closeOutline" :title="status === 'expired' ? 'Your verification expired' : 'We couldn’t verify you'" :message="status === 'expired' ? 'Your ID document has expired. Verify again with a valid document.' : 'Your submission was reviewed but couldn’t be approved this time.'" />
          <section v-if="kyc.data.value.rejectionReason" class="pw-callout pw-callout--danger reason">
            <div>
              <p class="pw-eyebrow danger">Reason</p>
              <p class="reason__text">{{ kyc.data.value.rejectionReason }}</p>
            </div>
          </section>
          <section class="pw-callout pw-callout--muted">
            <div>
              <p class="pw-eyebrow">Tips for a clean capture</p>
              <ul class="tips">
                <li>Use daylight, avoid overhead lamps</li>
                <li>Lay the document flat on a dark surface</li>
                <li>All four corners inside the frame</li>
              </ul>
            </div>
          </section>
        </template>

        <!-- K5 pending -->
        <template v-else-if="status === 'pending' || status === 'escalated'">
          <div class="pending-art" aria-hidden="true">
            <img :src="markNavy" alt="" />
            <span class="pending-art__clock"><ion-icon :icon="timeOutline" /></span>
          </div>
          <h1 class="title">Verification in progress</h1>
          <p class="text">Your documents are in the review queue — typically under 24 hours. We'll notify you the moment you're cleared.</p>
          <p class="ref pw-mono">REF · {{ kyc.data.value.id.slice(0, 14).toUpperCase() }}</p>
        </template>

        <template v-else>
          <SuccessHero tone="navy" :icon="shieldCheckmarkOutline" title="Not verified yet" message="Verify your identity to unlock swaps, payouts and unlimited listings." />
        </template>
      </div>
    </ion-content>

    <ion-footer v-if="kyc.data.value" class="pw-footer-bar" :class="{ navyfoot: status === 'approved' }">
      <ion-toolbar>
        <template v-if="status === 'approved'">
          <ion-button expand="block" color="light" class="pw-btn-lg" router-link="/sell" router-direction="root">Create your first listing</ion-button>
          <ion-button expand="block" fill="clear" color="light" @click="leave">Later</ion-button>
        </template>
        <template v-else-if="status === 'rejected' || status === 'expired' || status === 'not_started'">
          <ion-button expand="block" class="pw-btn-lg" router-link="/verification/personal">Try again</ion-button>
          <ion-button expand="block" fill="clear" router-link="/support/contact">Contact support</ion-button>
        </template>
        <template v-else>
          <ion-button expand="block" fill="outline" class="pw-btn-lg" :disabled="kyc.refreshing.value" @click="kyc.refresh">Check status</ion-button>
          <ion-button expand="block" fill="clear" color="medium" @click="leave">Back to marketplace</ion-button>
        </template>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonIcon, IonPage, IonSpinner, IonToolbar, useIonRouter } from '@ionic/vue'
import { closeOutline, shieldCheckmarkOutline, timeOutline } from 'ionicons/icons'
import { computed, watch } from 'vue'
import { accountApi } from '@/api/account'
import markNavy from '@/assets/brand/logo-mark-navy.png'
import ErrorState from '@/components/ErrorState.vue'
import SuccessHero from '@/components/SuccessHero.vue'
import VerifiedShield from '@/components/VerifiedShield.vue'
import { useAsync } from '@/composables/useAsync'
import { useAuthStore } from '@/stores/auth'
import { kycFlow } from './kycFlow'

/** K5 pending · K6 approved · K7 rejected — all from GET /me/kyc `status`. */
const router = useIonRouter()
const auth = useAuthStore()
const kyc = useAsync(() => accountApi.kyc())
const status = computed(() => kyc.data.value?.status ?? 'not_started')

// The principal carries verification state used by guards elsewhere.
watch(status, (s, prev) => prev && s !== prev && void auth.refresh())

function leave() {
  router.navigate(kycFlow.next || '/tabs/home', 'root', 'replace')
}
</script>

<style scoped>
.center {
  text-align: center;
  padding: var(--pw-space-10);
}

.navy {
  --background: var(--pw-hero);
}

.navyfoot ion-toolbar {
  --background: #1b3f7a;
}

.st {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--pw-space-5);
  padding: calc(var(--ion-safe-area-top, 0px) + 56px) var(--pw-gutter) var(--pw-space-6);
  text-align: center;
}

.on-navy :deep(.hero__title) {
  color: #fff;
}

.on-navy :deep(.hero__message) {
  color: rgb(255 255 255 / 80%);
}

.on-navy :deep(.hero__halo) {
  background: transparent;
}

.gold {
  color: var(--pw-gold-400);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 22px;
  border-radius: var(--pw-radius-full);
  background: rgb(255 255 255 / 12%);
  color: #fff;
  font-weight: 600;
}

.reason,
.tips {
  text-align: left;
}

.reason {
  width: 100%;
}

.reason__text {
  margin-top: 6px;
  color: var(--pw-text);
  font-size: var(--pw-text-md);
  line-height: 1.5;
}

.danger {
  color: var(--pw-danger-600);
}

.tips {
  margin: 8px 0 0;
  padding-left: 18px;
  line-height: 1.8;
}

.pending-art {
  position: relative;
  display: grid;
  place-items: center;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: var(--pw-primary-tint);
  outline: 3px dashed color-mix(in srgb, var(--pw-primary) 35%, transparent);
  outline-offset: -28px;
}

.pending-art img {
  width: 130px;
}

.pending-art__clock {
  position: absolute;
  right: 26px;
  bottom: 30px;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--pw-warning-600);
  color: #fff;
  font-size: 28px;
  border: 5px solid var(--pw-surface);
}

.title {
  font-size: var(--pw-text-3xl);
  font-weight: 700;
}

.text {
  color: var(--pw-text-2);
  line-height: 1.55;
  font-size: var(--pw-text-md);
}

.ref {
  padding: 12px 22px;
  border-radius: var(--pw-radius-lg);
  background: var(--pw-surface-muted);
  color: var(--pw-text-2);
  font-weight: 700;
  letter-spacing: 0.06em;
}
</style>
