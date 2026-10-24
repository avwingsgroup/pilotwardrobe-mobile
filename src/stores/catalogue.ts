import { defineStore } from 'pinia'
import { ref } from 'vue'
import { catalogueApi } from '@/api/catalogue'
import type { Category } from '@/types'

const CATEGORY_TTL_MS = 10 * 60_000

/** Read-mostly catalogue data reused by Home, filters (B5) and the sell wizard (S2). */
export const useCatalogueStore = defineStore('catalogue', () => {
  const categories = ref<Category[]>([])
  let loadedAt = 0
  let pending: Promise<Category[]> | null = null

  async function loadCategories(force = false): Promise<Category[]> {
    if (!force && categories.value.length && Date.now() - loadedAt < CATEGORY_TTL_MS) return categories.value
    pending ??= catalogueApi
      .categories()
      .then((list) => {
        categories.value = list
        loadedAt = Date.now()
        return list
      })
      .finally(() => {
        pending = null
      })
    return pending
  }

  /** Top-level categories plus their children, flattened for pickers. */
  function flat(): Category[] {
    return categories.value.flatMap((c) => [c, ...(c.children ?? [])])
  }

  return { categories, loadCategories, flat }
})
