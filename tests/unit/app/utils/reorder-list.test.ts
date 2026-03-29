import { describe, expect, test } from 'vitest'

import { moveListItemByIndex } from '../../../../app/utils/reorder-list'

describe('moveListItemByIndex', () => {
  test('moves an item to a later position', () => {
    expect(moveListItemByIndex(['a', 'b', 'c', 'd'], 1, 3)).toEqual(['a', 'c', 'd', 'b'])
  })

  test('moves an item to an earlier position', () => {
    expect(moveListItemByIndex(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  test('returns the original list when indices are invalid or unchanged', () => {
    const items = ['a', 'b', 'c']

    expect(moveListItemByIndex(items, 1, 1)).toBe(items)
    expect(moveListItemByIndex(items, -1, 1)).toBe(items)
    expect(moveListItemByIndex(items, 1, 99)).toBe(items)
  })
})
