import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { decideNavigation } from './guards'
import { routes } from './routes'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to: RouteLocationNormalized) => {
  const auth = useAuthStore()
  const settings = useSettingsStore()
  return decideNavigation(to, { hasSession: auth.hasSession, user: auth.user, onboarded: settings.onboarded })
})
