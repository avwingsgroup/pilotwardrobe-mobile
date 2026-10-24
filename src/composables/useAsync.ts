import { onBeforeUnmount, ref, shallowRef, watch, type Ref, type WatchSource } from 'vue'
import { ApiError, toApiError } from '@/api/errors'
import { useNetworkStore } from '@/stores/network'

export interface UseAsyncOptions {
  /** Load immediately (default true). */
  immediate?: boolean
  /** Reload when any of these change. */
  watch?: WatchSource[]
  /** Refetch automatically when connectivity returns after a failure. */
  refetchOnReconnect?: boolean
}

/**
 * Loads one resource with loading / error / refreshing state. Screens render a
 * skeleton while `loading`, an error state when `error`, and keep showing stale
 * data during `refreshing` (pull-to-refresh). Superseded requests are aborted.
 */
export function useAsync<T>(loader: (signal: AbortSignal) => Promise<T>, options: UseAsyncOptions = {}) {
  const data = shallowRef<T | null>(null) as Ref<T | null>
  const error = ref<ApiError | null>(null)
  const loading = ref(false)
  const refreshing = ref(false)
  let controller: AbortController | null = null

  async function run(mode: 'load' | 'refresh' = 'load') {
    controller?.abort()
    const current = new AbortController()
    controller = current
    if (mode === 'refresh' && data.value !== null) refreshing.value = true
    else loading.value = true
    error.value = null
    try {
      const result = await loader(current.signal)
      if (!current.signal.aborted) data.value = result
    } catch (e) {
      const err = toApiError(e)
      if (!err.isCancelled && !current.signal.aborted) error.value = err
    } finally {
      if (controller === current) {
        loading.value = false
        refreshing.value = false
      }
    }
  }

  const load = () => run('load')
  const refresh = () => run('refresh')

  /** For <ion-refresher @ionRefresh>. */
  async function onRefresh(event: CustomEvent) {
    await refresh()
    ;(event.target as HTMLIonRefresherElement | null)?.complete()
  }

  if (options.watch?.length) watch(options.watch, () => void load())
  if (options.refetchOnReconnect !== false) {
    const network = useNetworkStore()
    watch(
      () => network.reconnects,
      () => {
        if (error.value?.isNetwork) void refresh()
      },
    )
  }
  if (options.immediate !== false) void load()

  onBeforeUnmount(() => controller?.abort())

  return { data, error, loading, refreshing, load, refresh, onRefresh }
}
