<template>
  <ion-page>
    <ion-content class="pw-content-plain">
      <div class="ready pw-container">
        <SuccessHero
          class="ready__hero"
          title="You’re cleared for takeoff"
          message="Your account is ready. Browse the marketplace, save favourites, and verify your identity when you’re ready to sell."
        />
      </div>
    </ion-content>
    <ion-footer class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" class="pw-btn-lg" @click="go">Start exploring</ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonPage, IonToolbar, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import SuccessHero from '@/components/SuccessHero.vue'
import { safeRedirect } from '@/utils/security'

/** A2b */
const route = useRoute()
const router = useIonRouter()

function go() {
  router.navigate(safeRedirect(route.query.next), 'root', 'replace')
}
</script>

<style scoped>
.ready {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: var(--pw-space-8) var(--pw-gutter);
}
</style>
