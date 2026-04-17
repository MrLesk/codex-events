import { describe, expect, test } from 'vitest'

import type { ResolvedSessionActor } from '../../../../app/composables/useSessionActor'
import type { UserHackathonEntry } from '../../../../app/composables/useUserHackathons'

import { filterStaffAccessibleHackathons } from '../../../../app/utils/staff-dashboard'

function createHackathon(overrides: Partial<UserHackathonEntry> = {}): UserHackathonEntry {
  return {
    id: 'hackathon-1',
    slug: 'codex-vienna',
    name: 'Codex Vienna',
    description: 'Fixture hackathon',
    state: 'submission_open',
    city: 'Vienna',
    country: 'Austria',
    address: 'Operngasse 20',
    bannerImageUrl: null,
    backgroundImageUrl: null,
    registrationOpensAt: '2026-04-10T09:00:00.000Z',
    registrationClosesAt: '2026-04-12T09:00:00.000Z',
    submissionOpensAt: '2026-04-12T09:00:00.000Z',
    submissionClosesAt: '2026-04-14T09:00:00.000Z',
    applicationStatus: null,
    team: null,
    submissionStatus: null,
    roles: [],
    ...overrides
  }
}

function createActor(overrides: Partial<ResolvedSessionActor> = {}): ResolvedSessionActor {
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
