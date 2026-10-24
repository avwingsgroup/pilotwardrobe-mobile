<template>
  <ion-page>
    <AppHeader title="Get verified" default-href="/tabs/profile" />
    <ion-content class="pw-content-plain">
      <div v-if="kyc.loading.value && !kyc.data.value" class="center"><ion-spinner name="crescent" /></div>
      <ErrorState v-else-if="kyc.error.value && !kyc.data.value" :error="kyc.error.value" @retry="kyc.load" />
      <div v-else class="intro pw-container">
        <div class="intro__icon" aria-hidden="true"><ion-icon :icon="shieldCheckmarkOutline" /></div>
        <h1 class="intro__title">Become a<br />Verified Seller</h1>
        <p class="intro__text">Verification keeps the runway clear of fraud — and unlocks swaps, payouts and unlimited listings.</p>

        <ul class="steps">
          <li>
            <span class="steps__icon"><ion-icon :icon="idCardOutline" aria-hidden="true" /></span>
            <span><strong>Government ID</strong><br /><span class="pw-muted">Passport, national ID or driver's licence</span></span>
          </li>
          <li>
            <span class="steps__icon"><ion-icon :icon="personOutline" aria-hidden="true" /></span>
            <span><strong>Selfie check</strong><br /><span class="pw-muted">A quick photo to match you to your ID</span></span>
          </li>
          <li>
            <span class="steps__icon"><ion-icon :icon="timeOutline" aria-hidden="true" /></span>
            <span><strong>Under 24 hours</strong><br /><span class="pw-muted">Most checks clear the tower much faster</span></span>
          </li>
        </ul>
        <p class="pw-callout pw-callout--muted"><ion-icon :icon="lockClosedOutline" aria-hidden="true" />Your documents are encrypted, used only for verification, and never shown to other members.</p>
      </div>
    </ion-content>
    <ion-footer v-if="kyc.data.value" class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" class="pw-btn-lg" @click="start">Start verification</ion-button>
        <ion-button expand="block" fill="clear" color="medium" @click="later">Do it later</ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonIcon, IonPage, IonSpinner, IonToolbar, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { idCardOutline, lockClosedOutline, personOutline, shieldCheckmarkOutline, timeOutline } from 'ionicons/icons'
import { useRoute } from 'vue-router'
import { accountApi } from '@/api/account'
import AppHeader from '@/components/AppHeader.vue'
import ErrorState from '@/components/ErrorState.vue'
import { useAsync } from '@/composables/useAsync'
import { safeRedirect } from '@/utils/security'
import { kycFlow, resetKycFlow } from './kycFlow'

/** K1 — GET /me/kyc decides where the user resumes (status, personal details or document). */
const route = useRoute()
const router = useIonRouter()
const kyc = useAsync(() => accountApi.kyc())
kycFlow.next = route.query.next ? safeRedirect(route.query.next) : ''

onIonViewWillEnter(async () => {
  if (kyc.data.value) await kyc.refresh()
  const s = kyc.data.value?.status
  if (s === 'pending' || s === 'escalated' || s === 'approved') router.navigate('/verification/status', 'forward', 'replace')
})

function start() {
  resetKycFlow()
  const k = kyc.data.value
  const hasPersonal = !!k?.personal?.firstName && !!k.personal.dateOfBirth
  router.push(hasPersonal && k?.status !== 'rejected' ? '/verification/document' : '/verification/personal')
}

function later() {
  router.navigate(kycFlow.next || '/tabs/profile', 'back', 'replace')
}
</script>

<style scoped>
.center {
  text-align: center;
  padding: var(--pw-space-10);
}

.intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--pw-space-5);
  padding: var(--pw-space-6) var(--pw-gutter);
  text-align: center;
}

.intro__icon {
  display: grid;
  place-items: center;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: var(--pw-primary-tint);
  color: var(--pw-primary);
  font-size: 72px;
}

.intro__title {
  font-size: var(--pw-text-3xl);
  font-weight: 700;
  line-height: 1.15;
}

.intro__text {
  color: var(--pw-text-2);
  font-size: var(--pw-text-md);
  line-height: 1.55;
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-4);
  text-align: left;
}

.steps li {
  display: flex;
  gap: var(--pw-space-4);
  align-items: center;
  line-height: 1.4;
}

.steps__icon {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: var(--pw-radius-lg);
  background: var(--pw-navy-50);
  color: var(--pw-primary);
  font-size: 26px;
}
</style>
