import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { IonicVue, toastController } from '@ionic/vue'

/* Ionic core + utilities */
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
import '@ionic/vue/css/palettes/dark.class.css'

/* Brand fonts (same as web) */
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'

/* Pilotwardrobe theme */
import './theme/tokens.css'
import './theme/variables.css'
import './theme/global.css'

import App from './App.vue'
import { httpEvents } from './api/client'
import { resetKycFlow } from './features/verification/kycFlow'
import { router } from './router'
import { routeForWebLink, initAppLinks } from './services/appLinks'
import { initLifecycle } from './services/lifecycle'
import { logger } from './services/logger'
import { initNetwork } from './services/network'
import { hideSplash, initKeyboard, syncStatusBar } from './services/platform'
import { initPushListeners, registerForPush, unregisterPushDevice } from './services/push'
import { beforeLogout, onSignIn, onSignOut, useAuthStore } from './stores/auth'
import { useBadgesStore } from './stores/badges'
import { useSettingsStore } from './stores/settings'

// The router is installed only after bootstrap: installing it starts the initial
// navigation, and the guards need the restored session and onboarding flag first.
const app = createApp(App).use(IonicVue, { swipeBackEnabled: true }).use(createPinia())

app.config.errorHandler = (error, _instance, info) => {
  logger.error('Unhandled UI error', { info, message: String((error as Error)?.message ?? error) })
}

async function bootstrap() {
  const settings = useSettingsStore()
  const auth = useAuthStore()
  const badges = useBadgesStore()

  await settings.load()
  void syncStatusBar(document.documentElement.classList.contains('ion-palette-dark'))
  await initNetwork()

  // Session lifecycle hooks.
  onSignIn(() => {
    badges.start()
    void registerForPush({ prompt: true })
  })
  beforeLogout(unregisterPushDevice)
  onSignOut(async () => {
    badges.reset()
    resetKycFlow()
    await settings.clearUserData()
  })

  // Global API events.
  httpEvents.on('unauthenticated', async () => {
    const wasSignedIn = auth.hasSession
    await auth.handleUnauthenticated()
    if (!wasSignedIn) return
    const current = router.currentRoute.value
    await router.replace({ path: '/auth/login', query: { next: current.fullPath, expired: '1' } })
  })
  httpEvents.on('session-expired', async () => {
    await auth.handleUnauthenticated()
    await router.replace({ path: '/auth/login', query: { expired: '1' } })
  })
  httpEvents.on('maintenance', () => {
    if (router.currentRoute.value.path !== '/maintenance') void router.push('/maintenance')
  })
  httpEvents.on('kyc-required', async ({ message }) => {
    const toast = await toastController.create({
      message: message ?? 'Verify your identity to continue.',
      duration: 5000,
      position: 'top',
      color: 'dark',
      buttons: [{ text: 'Verify', handler: () => void router.push('/verification') }],
    })
    await toast.present()
  })

  const navigate = (route: string) => void router.push(route)
  await initAppLinks(navigate)
  await initPushListeners(
    (link) => navigate(routeForWebLink(link)),
    async (notification) => {
      const toast = await toastController.create({
        header: notification.title,
        message: notification.body,
        duration: 4000,
        position: 'top',
        color: 'dark',
        buttons: [{ text: 'View', handler: () => navigate(routeForWebLink((notification.data as Record<string, string>)?.link)) }],
      })
      await toast.present()
    },
  )
  await initLifecycle()
  await initKeyboard()

  await auth.bootstrap()
}

bootstrap()
  .catch((error) => logger.error('Bootstrap failed', { message: String(error) }))
  .finally(async () => {
    app.use(router)
    await router.isReady()
    app.mount('#app')
    await hideSplash()
  })
