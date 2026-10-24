import type {
  Category,
  HomeFeed,
  Listing,
  ListingFilters,
  ListingSearchMeta,
  Paginated,
  SellerProfile,
  UserReview,
  PublicSeller,
  PageQuery,
} from '@/types'
import { api } from './client'

/** Public catalogue reads (contract §Catalogue, §Favourites & profiles). */
export const catalogueApi = {
  home: () => api.get<HomeFeed>('/home'),

  categories: () => api.get<Category[]>('/categories'),

  category: (slug: string) => api.get<Category>(`/categories/${encodeURIComponent(slug)}`),

  search: (filters: ListingFilters, signal?: AbortSignal) =>
    api.list<Listing, ListingSearchMeta>('/listings', { params: filters, signal }),

  listing: (slug: string) => api.get<Listing>(`/listings/${encodeURIComponent(slug)}`),

  related: (slug: string) => api.get<Listing[]>(`/listings/${encodeURIComponent(slug)}/related`),

  favorites: (query: PageQuery = {}) => api.list<Listing>('/me/favorites', { params: query }),

  favorite: (listingId: string) => api.post<{ favoritesCount: number }>(`/listings/${listingId}/favorite`),

  unfavorite: (listingId: string) => api.delete<{ favoritesCount: number }>(`/listings/${listingId}/favorite`),

  sellers: (query: PageQuery & { type?: string } = {}) => api.list<PublicSeller>('/sellers', { params: query }),

  seller: (username: string) => api.get<SellerProfile>(`/sellers/${encodeURIComponent(username)}`),

  sellerListings: (username: string, query: PageQuery = {}) =>
    api.list<Listing>(`/sellers/${encodeURIComponent(username)}/listings`, { params: query }),

  sellerReviews: (username: string, query: PageQuery = {}) =>
    api.list<UserReview>(`/sellers/${encodeURIComponent(username)}/reviews`, { params: query }),

  follow: (username: string) => api.post<{ followers: number }>(`/sellers/${encodeURIComponent(username)}/follow`),

  unfollow: (username: string) => api.delete<{ followers: number }>(`/sellers/${encodeURIComponent(username)}/follow`),
}
