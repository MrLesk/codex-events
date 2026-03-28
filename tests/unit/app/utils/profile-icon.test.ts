import { describe, expect, test } from 'vitest'

import { buildProfileIconHref } from '../../../../app/utils/profile-icon'

describe('profile icon helpers', () => {
  test('builds a user-scoped versioned profile icon href', () => {
    expect(buildProfileIconHref('user_1', '2026-03-28T12:34:56.000Z')).toBe(
      '/api/account/profile-icon?user=user_1&v=2026-03-28T12%3A34%3A56.000Z'
    )
  })

  test('returns undefined when the user or version is missing', () => {
    expect(buildProfileIconHref('', '2026-03-28T12:34:56.000Z')).toBeUndefined()
    expect(buildProfileIconHref('user_1', '')).toBeUndefined()
    expect(buildProfileIconHref(undefined, undefined)).toBeUndefined()
  })
})
