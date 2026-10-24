import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { ListingFilters, ProductCondition, SortOption } from '@/types'

/**
 * Search state lives in the route query (shareable, back-button friendly, restored
 * on deep links). These helpers convert between the URL and GET /listings params.
 */
export interface SearchState {
  search: string
  category: string[]
  condition: ProductCondition[]
  minPrice: number | null
  maxPrice: number | null
  verifiedOnly: boolean
  aircraftType: string | null
  sort: SortOption
}

const list = (value: unknown): string[] =>
  (Array.isArray(value) ? value.join(',') : String(value ?? ''))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

const num = (value: unknown): number | null => {
  const n = Number(value)
  return value !== undefined && value !== null && value !== '' && Number.isFinite(n) ? n : null
}

export function stateFromQuery(query: LocationQuery): SearchState {
  return {
    search: String(query.search ?? query.q ?? ''),
    category: list(query.category),
    condition: list(query.condition) as ProductCondition[],
    minPrice: num(query.minPrice),
    maxPrice: num(query.maxPrice),
    verifiedOnly: query.verifiedOnly === 'true',
    aircraftType: query.aircraftType ? String(query.aircraftType) : null,
    sort: (query.sort as SortOption) || 'recommended',
  }
}

export function queryFromState(state: SearchState): LocationQueryRaw {
  const q: LocationQueryRaw = {}
  if (state.search) q.search = state.search
  if (state.category.length) q.category = state.category.join(',')
  if (state.condition.length) q.condition = state.condition.join(',')
  if (state.minPrice !== null) q.minPrice = String(state.minPrice)
  if (state.maxPrice !== null) q.maxPrice = String(state.maxPrice)
  if (state.verifiedOnly) q.verifiedOnly = 'true'
  if (state.aircraftType) q.aircraftType = state.aircraftType
  if (state.sort !== 'recommended') q.sort = state.sort
  return q
}

export function filtersFromState(state: SearchState): ListingFilters {
  return {
    search: state.search || undefined,
    category: state.category,
    condition: state.condition,
    minPrice: state.minPrice ?? undefined,
    maxPrice: state.maxPrice ?? undefined,
    verifiedOnly: state.verifiedOnly || undefined,
    aircraftType: state.aircraftType ?? undefined,
    sort: state.sort,
  }
}

/** Number of active refinements (the "Filters · 3" badge). Search text and sort don't count. */
export function activeFilterCount(state: SearchState): number {
  return (
    state.category.length +
    (state.condition.length ? 1 : 0) +
    (state.minPrice !== null || state.maxPrice !== null ? 1 : 0) +
    (state.verifiedOnly ? 1 : 0) +
    (state.aircraftType ? 1 : 0)
  )
}

export const emptyState = (): SearchState => ({
  search: '',
  category: [],
  condition: [],
  minPrice: null,
  maxPrice: null,
  verifiedOnly: false,
  aircraftType: null,
  sort: 'recommended',
})
