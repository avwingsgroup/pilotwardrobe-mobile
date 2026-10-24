<template>
  <ion-app>
    <OfflineBanner />
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, useBackButton, useIonRouter } from '@ionic/vue'
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import OfflineBanner from '@/components/OfflineBanner.vue'
import { syncStatusBar } from '@/services/platform'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const ionRouter = useIonRouter()
const settings = useSettingsStore()

/**
 * Android hardware back on a tab root other than Home goes Home first; on Home the
 * default Ionic handler exits the app. Modals, sheets and nested stacks are handled
 * by Ionic's own higher-priority handlers before this runs.
 */
const TAB_ROOTS = ['/tabs/search', '/tabs/inbox', '/tabs/profile']
useBackButton(5, (processNextHandler) => {
  if (TAB_ROOTS.includes(route.path)) {
    ionRouter.navigate('/tabs/home', 'root', 'replace')
    return
  }
  processNextHandler()
})

watch(
  () => settings.theme,
  () => void syncStatusBar(settings.applyTheme()),
)
</script>
