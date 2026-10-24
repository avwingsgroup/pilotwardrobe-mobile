<template>
  <ion-page>
    <AppHeader title="Verify identity" default-href="/verification" :step="2" :total="3" />
    <ion-content class="pw-content-plain">
      <div class="pw-pad pw-stack pw-container">
        <h2 class="pw-title">Choose a document</h2>
        <p class="pw-body">Use a government-issued document with your photo on it.</p>
        <div v-if="types.loading.value" class="pw-stack-sm">
          <ion-skeleton-text v-for="n in 3" :key="n" animated style="height: 84px; border-radius: 16px" />
        </div>
        <ErrorState v-else-if="types.error.value" :error="types.error.value" @retry="types.load" />
        <div v-else class="pw-stack-sm" role="radiogroup" aria-label="Document type">
          <RadioCard
            v-for="t in options"
            :key="t.value"
            :selected="kycFlow.documentType === t.value"
            :title="t.label"
            :description="hint(t.value)"
            @select="kycFlow.documentType = t.value"
          >
            <template #media>
              <span class="doc-icon" :class="{ on: kycFlow.documentType === t.value }" aria-hidden="true"><ion-icon :icon="iconFor(t.value)" /></span>
            </template>
          </RadioCard>
        </div>
        <div class="country">
          <label for="country" class="pw-muted">Issuing country</label>
          <select id="country" v-model="kycFlow.documentCountry" class="country__select">
            <option v-for="c in COUNTRIES" :key="c.code" :value="c.code">{{ c.code }} {{ c.name }}</option>
          </select>
        </div>
      </div>
    </ion-content>
    <ion-footer class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" class="pw-btn-lg" @click="next">Continue</ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonIcon, IonPage, IonSkeletonText, IonToolbar, useIonRouter } from '@ionic/vue'
import { bookOutline, cardOutline, idCardOutline } from 'ionicons/icons'
import { computed } from 'vue'
import { accountApi } from '@/api/account'
import AppHeader from '@/components/AppHeader.vue'
import ErrorState from '@/components/ErrorState.vue'
import RadioCard from '@/components/RadioCard.vue'
import { COUNTRIES } from '@/constants/labels'
import { useAsync } from '@/composables/useAsync'
import { TWO_SIDED_DOCUMENTS, type KycDocumentType } from '@/types'
import { kycFlow, resetKycFlow } from './kycFlow'

/**
 * K2 — document types come from GET /me/kyc `document_types`. Number-only
 * identifiers (BVN) need no photo and aren't offered in this capture flow.
 */
const router = useIonRouter()
const types = useAsync(() => accountApi.kyc())
const options = computed(() => (types.data.value?.documentTypes ?? []).filter((t) => t.value !== 'bvn'))

const hint = (t: KycDocumentType) => (t === 'passport' ? 'Fastest approval · photo page only' : TWO_SIDED_DOCUMENTS.includes(t) ? 'Front and back required' : 'Clear photo of the document')
const iconFor = (t: KycDocumentType) => (t === 'passport' ? bookOutline : t === 'drivers_licence' ? cardOutline : idCardOutline)

function next() {
  resetKycFlow()
  router.push('/verification/capture')
}
</script>

<style scoped>
.doc-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 52px;
  border-radius: var(--pw-radius-md);
  background: var(--pw-navy-100);
  color: var(--pw-primary);
  font-size: 26px;
}

.doc-icon.on {
  background: var(--pw-navy-700);
  color: #fff;
}

.country {
  display: flex;
  align-items: center;
  gap: 12px;
}

.country__select {
  min-height: 48px;
  border-radius: var(--pw-radius-md);
  border: 1px solid var(--pw-border);
  background: var(--pw-surface);
  color: var(--pw-text);
  padding: 0 12px;
  font: inherit;
}
</style>
