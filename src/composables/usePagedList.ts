import { computed, ref, shallowRef, type Ref } from 'vue'
import { ApiError, toApiError } from '@/api/errors'
import type { Paginated } from '@/types'

/**
 * Server-paginated list for IonInfiniteScroll + IonRefresher. Never loads unbounded
 * data: pages are requested one at a time as the user scrolls (contract §1.7).
 */
export function usePagedList<T, M extends object = Record<never, never>>(
  fetchPage: (page: number, signal: AbortSignal) => Promise<Paginated<T, M>>,
  options: { perPageHint?: number } = {},
) {
  const items = shallowRef<T[]>([]) as Ref<T[]>
  const meta = shallowRef<(Paginated<T, M>['meta']) | null>(null)
  const page = ref(0)
  const lastPage = ref(1)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<ApiError | null>(null)
  let controller: AbortController | null = null

  const hasMore = computed(() => page.value < lastPage.value)
  const isEmpty = computed(() => !loading.value && !error.value && items.value.length === 0)

  async function loadFirst() {
    controller?.abort()
    const current = new AbortController()
    controller = current
    loading.value = items.value.length === 0
    error.value = null
    try {
      const res = await fetchPage(1, current.signal)
      if (current.signal.aborted) return
      items.value = res.data
      meta.value = res.meta
      page.value = res.meta?.currentPage ?? 1
      lastPage.value = res.meta?.lastPage ?? 1
    } catch (e) {
      const err = toApiError(e)
      if (!err.isCancelled) error.value = err
    } finally {
      if (controller === current) loading.value = false
    }
  }

  async function loadMore(event?: CustomEvent) {
    if (!hasMore.value || loadingMore.value) {
      ;(event?.target as HTMLIonInfiniteScrollElement | null)?.complete()
      return
    }
    loadingMore.value = true
    const current = controller ?? new AbortController()
    try {
      const res = await fetchPage(page.value + 1, current.signal)
      items.value = [...items.value, ...res.data]
      meta.value = res.meta
      page.value = res.meta?.currentPage ?? page.value + 1
      lastPage.value = res.meta?.lastPage ?? page.value
    } catch (e) {
      const err = toApiError(e)
      if (!err.isCancelled) error.value = err
    } finally {
      loadingMore.value = false
      ;(event?.target as HTMLIonInfiniteScrollElement | null)?.complete()
    }
  }

  async function onRefresh(event: CustomEvent) {
    await loadFirst()
    ;(event.target as HTMLIonRefresherElement | null)?.complete()
  }

  /** Replace one item in place (after a mutation returns the updated resource). */
  function replace(predicate: (item: T) => boolean, next: T) {
    items.value = items.value.map((item) => (predicate(item) ? next : item))
  }

  function remove(predicate: (item: T) => boolean) {
    items.value = items.value.filter((item) => !predicate(item))
  }

  return { items, meta, loading, loadingMore, error, hasMore, isEmpty, loadFirst, loadMore, onRefresh, replace, remove, perPage: options.perPageHint ?? 20 }
}
