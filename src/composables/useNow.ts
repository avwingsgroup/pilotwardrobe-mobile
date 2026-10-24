import { onBeforeUnmount, onMounted, ref } from 'vue'

/** A ticking "now" for countdowns (offer expiry, auto-release, OTP resend). */
export function useNow(intervalMs = 1000) {
  const now = ref(new Date())
  let timer: ReturnType<typeof setInterval> | null = null
  onMounted(() => {
    timer = setInterval(() => (now.value = new Date()), intervalMs)
  })
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
  })
  return now
}
