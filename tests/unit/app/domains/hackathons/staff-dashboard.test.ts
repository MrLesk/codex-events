import { describe, expect, test } from 'vitest'

import type { SessionActor } from '../../../../../app/domains/accounts/session-actor'

import { filterStaffAccessibleHackathons } from '../../../../../app/domains/hackathons/staff-dashboard'

interface StaffDashboardHackathonFixture {
  id: string
  slug: string
}

function createHackathon(overrides: Partial<StaffDashboardHackathonFixture> = {}): StaffDashboardHackathonFixture {
  return {
    id: 'hackathon-1',
    slug: 'codex-vienna',
    ...overrides
  }
}

function createActor(overrides: Partial<SessionActor> = {}): SessionActor {
  return {
    kind: 'platform_user',
    isAuthenticated: true,
    hasPlatformAccount: true,
    hasAcceptedCurrentPlatformDocuments: true,
    sessionUser: {
      sub: 'auth0|staff',
      email: 'staff@example.com',
      name: 'Staff Member'
    },
    platformUser: {
      id: 'user-staff',
      email: 'staff@example.com',
      displayName: 'Staff Member',
      firstName: 'Staff',
      familyName: 'Member',
      company: null,
      bio: null,
      isPlatformAdmin: false,
      xProfileUrl: null,
      linkedinProfileUrl: null,
      githubProfileUrl: null,
      chatgptEmail: null,
      openaiOrgId: null,
      lumaEmail: null,
      lumaUsername: null,
      profileIconUpdatedAt: null,
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      deletedAt: null
    },
    isPlatformAdmin: false,
    hackathonRoles: [{
      hackathonId: 'hackathon-1',
      role: 'staff',
      isInJudgePool: false,
      isStaff: true,
      createdAt: '2026-04-01T00:00:00.000Z'
    }],
    ...overrides
  }
}

describe('filterStaffAccessibleHackathons', () => {
  test('includes hackathons with an explicit staff assignment', () => {
    expect(filterStaffAccessibleHackathons([
      createHackathon(),
      createHackathon({
        id: 'hackathon-2',
        slug: 'codex-berlin'
      })
    ], createActor()).map(hackathon => hackathon.id)).toEqual(['hackathon-1'])
  })

  test('includes hackathons where the admin assignment is also marked as staff', () => {
    expect(filterStaffAccessibleHackathons([
      createHackathon()
    ], createActor({
      hackathonRoles: [{
        hackathonId: 'hackathon-1',
        role: 'hackathon_admin',
        isInJudgePool: false,
        isStaff: true,
        createdAt: '2026-04-01T00:00:00.000Z'
      }]
    })).map(hackathon => hackathon.id)).toEqual(['hackathon-1'])
  })

  test('excludes hackathons without staff visibility on the current assignment', () => {
    expect(filterStaffAccessibleHackathons([
      createHackathon()
    ], createActor({
      hackathonRoles: [{
        hackathonId: 'hackathon-1',
        role: 'hackathon_admin',
        isInJudgePool: false,
        isStaff: false,
        createdAt: '2026-04-01T00:00:00.000Z'
      }]
    }))).toEqual([])
  })

  test('excludes anonymous and identity-only actors', () => {
    expect(filterStaffAccessibleHackathons([
      createHackathon()
    ], {
      kind: 'anonymous',
      isAuthenticated: false,
      hasPlatformAccount: false,
      hasAcceptedCurrentPlatformDocuments: false,
      sessionUser: null,
      platformUser: null,
      isPlatformAdmin: false,
      hackathonRoles: []
    })).toEqual([])

    expect(filterStaffAccessibleHackathons([
      createHackathon()
    ], {
      kind: 'authenticated_identity',
      isAuthenticated: true,
      hasPlatformAccount: false,
      hasAcceptedCurrentPlatformDocuments: false,
      accountLink: null,
      sessionUser: {
        sub: 'auth0|identity',
        email: 'identity@example.com',
        name: 'Identity'
      },
      platformUser: null,
      isPlatformAdmin: false,
      hackathonRoles: []
    })).toEqual([])
  })
})
