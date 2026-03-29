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
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'prizes', '/account')).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'judging', '/account')).toBe(false)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'participants', '/account')).toBe(false)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'submissions', '/account')).toBe(false)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'operations', '/account')).toBe(false)

    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'judging', '/account/judging')).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'participants', '/account/admin')).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'submissions', '/account/admin')).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'settings', '/account/admin')).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'operations', '/account/admin')).toBe(true)
  })

  test('keeps admin dashboard active for admin-accessible hackathon detail routes', () => {
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', undefined, '/account/admin', {
      accountHackathonNavigationMode: 'admin'
    })).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'details', '/account/admin', {
      accountHackathonNavigationMode: 'admin'
    })).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'prizes', '/account/admin', {
      accountHackathonNavigationMode: 'admin'
    })).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'judging', '/account/admin', {
      accountHackathonNavigationMode: 'admin'
    })).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'judging', '/account/judging', {
      accountHackathonNavigationMode: 'admin'
    })).toBe(false)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'overview', '/account', {
      accountHackathonNavigationMode: 'admin'
    })).toBe(false)
  })

  test('keeps exact dashboard roots active for their own pages', () => {
    expect(isShellNavigationLinkActive('/account/judging', undefined, '/account/judging')).toBe(true)
    expect(isShellNavigationLinkActive('/account/admin', undefined, '/account/admin')).toBe(true)
    expect(isShellNavigationLinkActive('/account/settings', undefined, '/account/settings')).toBe(true)
  })
})
