import { ref } from 'vue'
import { catalogueApi } from '@/api/catalogue'
import { track } from '@/services/analytics'
import type { Listing } from '@/types'
import { useAuthGate } from './useAuthGate'
import { useFeedback } from './useFeedback'

/**
 * Save / unsave a listing. Optimistic (it's reversible and low-risk) with rollback
 * on failure; guests are routed to sign-in first.
 */
export function useFavorite(onChange?: (listing: Listing) => void) {
  const { requireAuth } = useAuthGate()
  const { toastError } = useFeedback()
  const pending = ref(new Set<string>())

  async function toggle(listing: Listing) {
    if (!requireAuth() || pending.value.has(listing.id)) return
    pending.value.add(listing.id)
    const was = !!listing.isFavorited
    const optimistic: Listing = { ...listing, isFavorited: !was, favoritesCount: listing.favoritesCount + (was ? -1 : 1) }
    onChange?.(optimistic)
    try {
      const res = was ? await catalogueApi.unfavorite(listing.id) : await catalogueApi.favorite(listing.id)
      if (!was) track({ name: 'favorite_added', params: { listing_id: listing.id } })
      onChange?.({ ...optimistic, favoritesCount: res?.favoritesCount ?? optimistic.favoritesCount })
    } catch (e) {
      onChange?.(listing)
      await toastError(e)
    } finally {
      pending.value.delete(listing.id)
    }
  }

  return { toggle }
}
