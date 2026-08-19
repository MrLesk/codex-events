import { describe, expect, test } from 'vitest'

import { buildProfileIconHref } from '../../../../../app/domains/accounts/profile-icon'

describe('profile icon helpers', () => {
  test('builds a user-scoped versioned profile icon href', () => {
    expect(buildProfileIconHref('user_1', 3)).toBe(
      '/api/account/profile-icon?user=user_1&v=3'
    )
  })

  test('appends the event query when participant visibility context is required', () => {
    expect(buildProfileIconHref('user_1', 3, 'event_1')).toBe(
      '/api/account/profile-icon?user=user_1&v=3&event=event_1'
    )
  })

  test('returns undefined when the user or version is missing', () => {
    expect(buildProfileIconHref('', 3)).toBeUndefined()
    expect(buildProfileIconHref('user_1', 0)).toBeUndefined()
    expect(buildProfileIconHref(undefined, undefined)).toBeUndefined()
  })
})
