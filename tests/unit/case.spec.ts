import { describe, expect, it } from 'vitest'
import { camelPath, toCamel, toSnake } from '@/api/case'

describe('key casing at the HTTP boundary', () => {
  it('camelCases nested keys but never values', () => {
    const out = toCamel<{ escrowStatus: string; items: { listingId: string }[] }>({
      escrow_status: 'not_funded',
      items: [{ listing_id: 'lst_1' }],
    })
    expect(out).toEqual({ escrowStatus: 'not_funded', items: [{ listingId: 'lst_1' }] })
  })

  it('snake_cases request bodies and keeps enum values untouched', () => {
    expect(toSnake({ offeredListingIds: ['a'], cashAdjustment: { amount: 100, currency: 'USD' }, condition: 'like_new' })).toEqual({
      offered_listing_ids: ['a'],
      cash_adjustment: { amount: 100, currency: 'USD' },
      condition: 'like_new',
    })
  })

  it('leaves primitives alone', () => {
    expect(toCamel('plain')).toBe('plain')
    expect(toCamel(null)).toBeNull()
  })

  it('converts Laravel dot-path error keys segment by segment', () => {
    expect(camelPath('items.0.size_label')).toBe('items.0.sizeLabel')
    expect(camelPath('price.amount')).toBe('price.amount')
  })
})
