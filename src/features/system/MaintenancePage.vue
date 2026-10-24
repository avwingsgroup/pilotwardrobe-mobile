<template>
  <ion-page>
    <ion-content class="pw-content-plain">
      <div class="pw-pad pw-container mt">
        <EmptyState :icon="constructOutline" title="Scheduled maintenance" message="Pilotwardrobe is briefly down for maintenance. Your orders and escrow funds are safe." />
        <ion-button expand="block" class="pw-btn-lg" :disabled="checking" @click="retry">{{ checking ? 'Checking…' : 'Try again' }}</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonPage, useIonRouter } from '@ionic/vue'
import { constructOutline } from 'ionicons/icons'
import { ref } from 'vue'
import { catalogueApi } from '@/api/catalogue'
import EmptyState from '@/components/EmptyState.vue'

/** Shown on 503 MAINTENANCE from any endpoint. */
const router = useIonRouter()
const checking = ref(false)

async function retry() {
  checking.value = true
  try {
    await catalogueApi.categories()
    router.navigate('/tabs/home', 'root', 'replace')
  } catch {
    // still down
  } finally {
    checking.value = false
  }
}
</script>

<style scoped>
.mt {
  padding-top: calc(var(--ion-safe-area-top, 0px) + 60px);
}
</style>
