import { describe, expect, test } from 'vitest'

import {
  accountEventPageNames,
  accountEventPagePaths,
  buildAccountEventPageCacheKey,
  buildAccountEventPagePath
} from '../../../../../app/domains/events/account-workspace-page'

describe('account-event page contract boundary', () => {
  test('keeps the named page set and concrete REST paths aligned', () => {
    expect(accountEventPageNames).toEqual([
      'entry',
      'prizes',
      'operations',
      'submissions',
      'judging',
      'settings',
      'participants',
      'workspace',
      'teams',
      'rosters',
      'gallery',
      'feedback',
      'certificates'
    ])

    for (const page of accountEventPageNames) {
      expect(accountEventPagePaths[page]).toBe(`/api/account/events/:slug/${page}`)
      expect(buildAccountEventPagePath('vienna-2026', page)).toBe(`/api/account/events/vienna-2026/${page}`)
    }
  })

  test('encodes the slug and keeps the cache key page-specific', () => {
    expect(buildAccountEventPagePath('event with spaces', 'entry')).toBe(
      '/api/account/events/event%20with%20spaces/entry'
    )
    expect(buildAccountEventPageCacheKey('fixture-event', 'entry')).not.toBe(
      buildAccountEventPageCacheKey('fixture-event', 'prizes')
    )
  })
})
