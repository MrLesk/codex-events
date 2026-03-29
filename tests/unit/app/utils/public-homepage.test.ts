import { describe, expect, test } from 'vitest'

import { getPublicHomepageHackathonView } from '../../../../app/utils/public-homepage'

describe('public homepage hackathon view helpers', () => {
  test('forces the active view and hides filters when there is exactly one active hackathon', () => {
    expect(getPublicHomepageHackathonView('past', 5, 4, 1)).toEqual({
      activeHackathonCount: 1,
      effectiveTab: 'active',
      showFilters: false,
      useSingleActiveLayout: true
    })
  })

  test('keeps the requested tab and filters when multiple active hackathons exist', () => {
    expect(getPublicHomepageHackathonView('past', 6, 4, 2)).toEqual({
      activeHackathonCount: 2,
      effectiveTab: 'past',
      showFilters: true,
      useSingleActiveLayout: false
    })
  })

  test('clamps the active count at zero when past counts exceed total counts', () => {
    expect(getPublicHomepageHackathonView('active', 2, 5, 0)).toEqual({
      activeHackathonCount: 0,
      effectiveTab: 'active',
      showFilters: true,
      useSingleActiveLayout: false
    })
  })

  test('keeps filters visible until the single active hackathon is present in the loaded results', () => {
    expect(getPublicHomepageHackathonView('past', 5, 4, 0)).toEqual({
      activeHackathonCount: 1,
      effectiveTab: 'past',
      showFilters: true,
      useSingleActiveLayout: false
    })
  })
})
