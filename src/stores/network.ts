import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Connectivity, fed by services/network.ts (Capacitor Network plugin). */
export const useNetworkStore = defineStore('network', () => {
  const online = ref(true)
  const connectionType = ref<string>('unknown')
  /** Increments on every offline → online transition so screens can refetch stale data. */
  const reconnects = ref(0)

  function update(next: { connected: boolean; connectionType?: string }) {
    const wasOffline = !online.value
    online.value = next.connected
    if (next.connectionType) connectionType.value = next.connectionType
    if (wasOffline && next.connected) reconnects.value += 1
  }

  return { online, connectionType, reconnects, update }
})
