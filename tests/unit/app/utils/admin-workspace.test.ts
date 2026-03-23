import { describe, expect, test } from 'vitest'

import type {
  HackathonRecord,
  SessionActor
} from '../../../../app/utils/admin-workspace'

import {
  buildAdminWorkspaceCacheKey,
  canMutateRoleAssignments,
  createHackathonFormState,
  createHackathonSlug,
  filterManageableHackathons,
  fromDateTimeLocalValue,
  getAdminWorkspaceSubjectKey,
  getCurrentLifecycleControl,
  hasHackathonAdminAccess,
  toDateTimeLocalValue
} from '../../../../app/utils/admin-workspace'

function createHackathon(overrides: Partial<HackathonRecord> = {}): HackathonRecord {
  return {
    id: 'hackathon-1',
    name: 'Codex Builders',
    slug: 'codex-builders',
    description: 'Canonical admin workspace fixture.',
    backgroundImageUrl: null,
    bannerImageUrl: null,
    city: 'Vienna',
    address: 'Operngasse 20',
    registrationOpensAt: '2026-03-20T10:00:00.000Z',
    registrationClosesAt: '2026-03-22T10:00:00.000Z',
    submissionOpensAt: '2026-03-22T10:00:00.000Z',
    submissionClosesAt: '2026-03-24T10:00:00.000Z',
    state: 'registration_open',
    maxTeamMembers: 5,
    requireXProfile: false,
    requireLinkedinProfile: true,
    requireGithubProfile: true,
    currentApplicationTermsDocumentId: null,
    currentWinnerTermsDocumentId: null,
    createdByUserId: 'platform-admin',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides
  }
}

function createActor(overrides: Partial<SessionActor> = {}): SessionActor {
  return {
    kind: 'platform_user',
    isAuthenticated: true,
    hasPlatformAccount: true,
    sessionUser: {
      sub: 'auth0|admin',
      email: 'admin@example.com',
      name: 'Admin'
    },
    platformUser: {
      id: 'user-1',
      email: 'admin@example.com',
      displayName: 'Admin User',
      isPlatformAdmin: false
    },
    isPlatformAdmin: false,
    hackathonRoles: [{
      hackathonId: 'hackathon-1',
      role: 'hackathon_admin',
      isInJudgePool: false,
      createdAt: '2026-03-01T00:00:00.000Z'
    }],
    ...overrides
  }
}

describe('admin-workspace access helpers', () => {
  test('filters hackathons by explicit hackathon-admin access for non-platform admins', () => {
    const actor = createActor()
    const hackathons = [
      createHackathon({ id: 'hackathon-1' }),
      createHackathon({ id: 'hackathon-2', slug: 'other-hackathon', name: 'Other Hackathon' })
    ]

    expect(filterManageableHackathons(hackathons, actor).map(hackathon => hackathon.id)).toEqual(['hackathon-1'])
    expect(hasHackathonAdminAccess(actor, 'hackathon-1')).toBe(true)
    expect(hasHackathonAdminAccess(actor, 'hackathon-2')).toBe(false)
  })

  test('returns every hackathon for platform admins', () => {
    const actor = createActor({
      isPlatformAdmin: true,
      platformUser: {
        id: 'platform-admin',
        email: 'platform@example.com',
        displayName: 'Platform Admin',
        isPlatformAdmin: true
      }
    })
    const hackathons = [
      createHackathon({ id: 'hackathon-1' }),
      createHackathon({ id: 'hackathon-2', slug: 'other-hackathon', name: 'Other Hackathon' })
    ]

    expect(filterManageableHackathons(hackathons, actor).map(hackathon => hackathon.id)).toEqual([
      'hackathon-1',
      'hackathon-2'
    ])
  })

  test('limits explicit role mutations to platform admins', () => {
    expect(canMutateRoleAssignments(createActor())).toBe(false)
    expect(canMutateRoleAssignments(createActor({
      isPlatformAdmin: true,
      platformUser: {
        id: 'platform-admin',
        email: 'platform@example.com',
        displayName: 'Platform Admin',
        isPlatformAdmin: true
      }
    }))).toBe(true)
  })
})

describe('admin-workspace form helpers', () => {
  test('creates stable slugs and round-trips datetime-local values through ISO', () => {
    const isoTimestamp = '2026-03-22T10:30:00.000Z'
    const localValue = toDateTimeLocalValue(isoTimestamp)

    expect(createHackathonSlug('  Codex Spring Builders 2026  ')).toBe('codex-spring-builders-2026')
    expect(fromDateTimeLocalValue(localValue)).toBe(isoTimestamp)
  })

  test('maps hackathon records into editable form state', () => {
    const hackathon = createHackathon({
      backgroundImageUrl: 'https://example.com/background.jpg',
      bannerImageUrl: 'https://example.com/banner.jpg'
    })

    expect(createHackathonFormState(hackathon)).toMatchObject({
      name: hackathon.name,
      slug: hackathon.slug,
      city: hackathon.city,
      address: hackathon.address,
      backgroundImageUrl: 'https://example.com/background.jpg',
      bannerImageUrl: 'https://example.com/banner.jpg',
      maxTeamMembers: 5,
      requireLinkedinProfile: true,
      requireGithubProfile: true
    })
  })

  test('normalizes authenticated subjects for cache-key partitioning', () => {
    expect(getAdminWorkspaceSubjectKey('  auth0|admin  ')).toBe('auth0|admin')
    expect(getAdminWorkspaceSubjectKey('')).toBe('anonymous')
    expect(buildAdminWorkspaceCacheKey('admin-workspace-session', 'auth0|admin')).toBe('admin-workspace-session:auth0|admin')
  })
})

describe('admin-workspace lifecycle controls', () => {
  test('blocks submission opening until registration is closed and submission window is active', () => {
    const control = getCurrentLifecycleControl(
      createHackathon(),
      {
        submittedSubmissionCount: 0,
        judgePoolCount: 0,
        lockedSubmissionCount: 0,
        activeAssignmentCount: 0,
        lockedLeaderboardEntryCount: 0,
        completedReviewCount: 0,
        prizeCount: 0,
        hasCurrentWinnerTerms: false
      },
      new Date('2026-03-21T10:00:00.000Z')
    )

    expect(control).toMatchObject({
      key: 'open_submission',
      isEnabled: false,
      code: 'registration_window_still_open'
    })
  })

  test('enables shortlist transition only when every locked submission is fully reviewed', () => {
    const control = getCurrentLifecycleControl(
      createHackathon({ state: 'judge_review' }),
      {
        submittedSubmissionCount: 3,
        judgePoolCount: 2,
        lockedSubmissionCount: 3,
        activeAssignmentCount: 3,
        lockedLeaderboardEntryCount: 3,
        completedReviewCount: 3,
        prizeCount: 1,
        hasCurrentWinnerTerms: true
      }
    )

    expect(control).toMatchObject({
      key: 'start_shortlist',
      isEnabled: true
    })
  })

  test('blocks winner announcement when prizes exist without current winner terms', () => {
    const control = getCurrentLifecycleControl(
      createHackathon({ state: 'shortlist' }),
      {
        submittedSubmissionCount: 3,
        judgePoolCount: 2,
        lockedSubmissionCount: 3,
        activeAssignmentCount: 3,
        lockedLeaderboardEntryCount: 3,
        completedReviewCount: 3,
        prizeCount: 2,
        hasCurrentWinnerTerms: false
      }
    )

    expect(control).toMatchObject({
      key: 'announce_winners',
      isEnabled: false,
      code: 'winner_terms_required'
    })
  })
})
