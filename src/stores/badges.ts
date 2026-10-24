import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationsApi } from '@/api/notifications'
import { useAuthStore } from './auth'

/** Poll interval for badge counts — matches the contract's "polled every 60 s". */
const POLL_MS = 60_000

/**
 * Unread counts for the tab bar / bell. There is no realtime transport yet
 * (backend D12) so counts are polled while the app is in the foreground and a
 * user is signed in; push notifications trigger an immediate refresh.
 */
export const useBadgesStore = defineStore('badges', () => {
  const notifications = ref(0)
  const messages = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null
  let inFlight: Promise<void> | null = null

  async function refresh() {
    const auth = useAuthStore()
    if (!auth.isAuthenticated) return
    inFlight ??= notificationsApi
      .unreadCount()
      .then((counts) => {
        notifications.value = counts.count
        messages.value = counts.messages ?? auth.counters?.unreadMessages ?? 0
      })
      .catch(() => undefined)
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }

  function start() {
    stop()
    void refresh()
    timer = setInterval(() => void refresh(), POLL_MS)
  }

  function stop() {
    if (timer) clearInterval(timer)
    timer = null
  }

  function reset() {
    stop()
    notifications.value = 0
    messages.value = 0
  }

  return { notifications, messages, refresh, start, stop, reset }
})
