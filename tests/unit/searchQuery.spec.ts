import { describe, expect, it } from 'vitest'
import { activeFilterCount, filtersFromState, queryFromState, stateFromQuery } from '@/features/search/searchQuery'

describe('search state ↔ URL', () => {
  it('round-trips filters through the route query', () => {
    const state = stateFromQuery({
      search: 'bose',
      category: 'headsets,anr-headsets',
      condition: 'new',
      minPrice: '20000',
      verifiedOnly: 'true',
      sort: 'price_asc',
    })
    expect(state.category).toEqual(['headsets', 'anr-headsets'])
    expect(state.minPrice).toBe(20000)
    expect(queryFromState(state)).toEqual({
      search: 'bose',
      category: 'headsets,anr-headsets',
      condition: 'new',
      minPrice: '20000',
      verifiedOnly: 'true',
      sort: 'price_asc',
    })
  })

  it('counts active refinements for the Filters badge', () => {
    expect(activeFilterCount(stateFromQuery({ category: 'headsets', minPrice: '200', verifiedOnly: 'true' }))).toBe(3)
  })

  it('omits empty params from GET /listings', () => {
    expect(filtersFromState(stateFromQuery({}))).toMatchObject({ search: undefined, minPrice: undefined, sort: 'recommended' })
  })
})
