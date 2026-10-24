import { Network } from '@capacitor/network'
import { setOnline } from '@/api/client'
import { useNetworkStore } from '@/stores/network'

/** Wire the Network plugin into the store and the HTTP client's offline guard. */
export async function initNetwork() {
  const store = useNetworkStore()
  const apply = (status: { connected: boolean; connectionType: string }) => {
    store.update(status)
    setOnline(status.connected)
  }
  try {
    apply(await Network.getStatus())
  } catch {
    apply({ connected: navigator.onLine, connectionType: 'unknown' })
  }
  await Network.addListener('networkStatusChange', apply)
}
