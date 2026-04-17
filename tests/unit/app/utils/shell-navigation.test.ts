import { describe, expect, test } from 'vitest'

import {
  isShellNavigationLinkActive,
  resolveShellAccountHackathonNavigationMode
} from '../../../../app/utils/shell-navigation'

describe('isShellNavigationLinkActive', () => {
  test('marks the account root active only for my hackathons routes', () => {
    expect(isShellNavigationLinkActive('/account', undefined, '/account')).toBe(true)
    expect(isShellNavigationLinkActive('/account/settings', undefined, '/account')).toBe(false)
    expect(isShellNavigationLinkActive('/account/admin', undefined, '/account')).toBe(false)
    expect(isShellNavigationLinkActive('/account/staff', undefined, '/account')).toBe(false)
    expect(isShellNavigationLinkActive('/account/judging', undefined, '/account')).toBe(false)
  })

  test('maps account hackathon detail tabs to the correct sidebar entry', () => {
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', undefined, '/account')).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'overview', '/account')).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'credits', '/account')).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'workspace', '/account')).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'teams', '/account')).toBe(true)
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

  test('keeps the staff dashboard active for staff-accessible hackathon detail routes', () => {
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'participants', '/account/staff', {
      accountHackathonNavigationMode: 'staff'
    })).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'teams', '/account/staff', {
      accountHackathonNavigationMode: 'staff'
    })).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'details', '/account/staff', {
      accountHackathonNavigationMode: 'staff'
    })).toBe(true)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'judging', '/account/staff', {
      accountHackathonNavigationMode: 'staff'
    })).toBe(false)
    expect(isShellNavigationLinkActive('/account/hackathons/berlin', 'participants', '/account', {
      accountHackathonNavigationMode: 'staff'
    })).toBe(false)
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
    expect(isShellNavigationLinkActive('/account/staff', undefined, '/account/staff')).toBe(true)
    expect(isShellNavigationLinkActive('/account/platform-admins', undefined, '/account/admin')).toBe(true)
    expect(isShellNavigationLinkActive('/account/settings', undefined, '/account/settings')).toBe(true)
  })

  test('resolves account hackathon navigation mode from the current route and actor access', () => {
    expect(resolveShellAccountHackathonNavigationMode({
      actor: {
        kind: 'platform_user',
        isPlatformAdmin: true,
        hackathonRoles: []
      } as never,
      currentHackathonId: null,
      currentPath: '/account/hackathons/berlin'
    })).toBe('admin')

    expect(resolveShellAccountHackathonNavigationMode({
      actor: {
        kind: 'platform_user',
        isPlatformAdmin: false,
        hackathonRoles: [{
          hackathonId: 'hackathon-1',
          role: 'hackathon_admin'
        }]
      } as never,
      currentHackathonId: 'hackathon-1',
      currentPath: '/account/hackathons/berlin'
    })).toBe('admin')

    expect(resolveShellAccountHackathonNavigationMode({
      actor: {
        kind: 'platform_user',
        isPlatformAdmin: false,
        hackathonRoles: [{
          hackathonId: 'hackathon-1',
          role: 'staff'
        }]
      } as never,
      currentHackathonId: 'hackathon-1',
      currentPath: '/account/hackathons/berlin'
    })).toBe('staff')

    expect(resolveShellAccountHackathonNavigationMode({
      actor: {
        kind: 'platform_user',
        isPlatformAdmin: false,
        hackathonRoles: [{
          hackathonId: 'hackathon-1',
          role: 'hackathon_admin',
          isStaff: true
        }]
      } as never,
      currentHackathonId: 'hackathon-1',
      currentPath: '/account/hackathons/berlin'
    })).toBe('admin')

    expect(resolveShellAccountHackathonNavigationMode({
      actor: {
        kind: 'platform_user',
        isPlatformAdmin: false,
        hackathonRoles: [{
          hackathonId: 'hackathon-2',
          role: 'hackathon_admin'
        }]
      } as never,
      currentHackathonId: 'hackathon-1',
      currentPath: '/account/hackathons/berlin'
    })).toBe('participant')

    expect(resolveShellAccountHackathonNavigationMode({
      actor: {
        kind: 'anonymous'
      } as never,
      currentHackathonId: 'hackathon-1',
      currentPath: '/account/hackathons/berlin'
    })).toBe('participant')
  })
})
