<template>
  <ion-page>
    <AppHeader title="" default-href="/tabs/home" />
    <ion-content class="pw-content-plain">
      <EmptyState :icon="compassOutline" title="Off the flight plan" message="We couldn't find that page. It may have moved or the link is incomplete." action-label="Back to home" action-to="/tabs/home" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage } from '@ionic/vue'
import { compassOutline } from 'ionicons/icons'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
</script>
