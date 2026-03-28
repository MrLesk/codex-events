import { describe, expect, test } from 'vitest'

import { isShellNavigationLinkActive } from '../../../../app/utils/shell-navigation'

describe('isShellNavigationLinkActive', () => {
  test('marks the account root active only for my hackathons routes', () => {
    expect(isShellNavigationLinkActive('/account', undefined, '/account')).toBe(true)
    expect(isShellNavigationLinkActive('/account/settings', undefined, '/account')).toBe(false)
    expect(isShellNavigationLinkActive('/account/admin', undefined, '/account')).toBe(false)
    expect(isShellNavigationLinkActive('/account/judging', undefined, '/account')).toBe(false)
  })

  test('maps account hackathon detail tabs to the correct sidebar entry', () => {
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', undefined, '/account')).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'overview', '/account')).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'judging', '/account')).toBe(false)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'operations', '/account')).toBe(false)

    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'judging', '/account/judging')).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'settings', '/account/admin')).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'operations', '/account/admin')).toBe(true)
  })

  test('keeps exact dashboard roots active for their own pages', () => {
    expect(isShellNavigationLinkActive('/account/judging', undefined, '/account/judging')).toBe(true)
    expect(isShellNavigationLinkActive('/account/admin', undefined, '/account/admin')).toBe(true)
    expect(isShellNavigationLinkActive('/account/settings', undefined, '/account/settings')).toBe(true)
  })
})
