import { getCurrentInstance, onBeforeUnmount, ref, watch, type Ref } from 'vue'

/** A copy of `source` that settles `delay` ms after the last change (search-as-you-type). */
export function useDebounced<T>(source: Ref<T>, delay = 300): Ref<T> {
  const settled = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | null = null
  watch(source, (value) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (settled.value = value), delay)
  })
  if (getCurrentInstance()) onBeforeUnmount(() => timer && clearTimeout(timer))
  return settled
}
