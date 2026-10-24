import { reactive } from 'vue'

/** Size chosen per listing slug, shared by the detail page (B10) and size chart (F4). */
export const selectedSizes = reactive<Record<string, string | null>>({})
