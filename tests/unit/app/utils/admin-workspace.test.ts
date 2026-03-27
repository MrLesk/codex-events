import { describe, expect, test } from 'vitest'

import type {
  AdminTeamDetailRecord,
  NoSubmissionEntry,
  HackathonRecord,
  SessionActor,
  SubmissionRecord,
  TeamSummary
} from '../../../../app/utils/admin-workspace'

import {
  buildAdminOperationalTeams,
  listAllPaginatedItems,
  buildAdminWorkspaceCacheKey,
  canMutateRoleAssignments,
  createHackathonFormState,
  createHackathonSlug,
  formatApplicationStatus,
  formatAdminJudgeAssignmentStatus,
  formatSubmissionStatus,
  filterManageableHackathons,
  fromDateTimeLocalValue,
  getAdminJudgeAssignmentInterventionPolicy,
  getAdminWorkspaceSubjectKey,
  getAdminSubmissionInterventionPolicy,
  getApplicationStatusColor,
  getCurrentLifecycleControl,
  getJudgeAssignmentStatusColor,
  hasHackathonAdminAccess,
  getSubmissionStatusColor,
  toDateTimeLocalValue
} from '../../../../app/utils/admin-workspace'

function createHackathon(overrides: Partial<HackathonRecord> = {}): HackathonRecord {
  return {
    id: 'hackathon-1',
    name: 'Codex Builders',
    slug: 'codex-builders',
    description: 'Canonical admin workspace fixture.',
    agendaItems: [],
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
    inPersonEvent: false,
    requireXProfile: false,
    requireLinkedinProfile: true,
    requireGithubProfile: true,
    requireChatgptEmail: false,
    requireOpenaiOrgId: false,
    requireLumaProfile: false,
    requireWhyThisHackathon: false,
    requireProofOfExecution: false,
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
      firstName: 'Admin',
      familyName: 'User',
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

function createTeamSummary(overrides: Partial<TeamSummary> = {}): TeamSummary {
  return {
    id: 'team-1',
    hackathonId: 'hackathon-1',
    name: 'Alpha Team',
    slug: 'alpha-team',
    isOpenToJoinRequests: true,
    createdByUserId: 'user-admin',
    createdAt: '2026-03-22T12:00:00.000Z',
    updatedAt: '2026-03-22T12:00:00.000Z',
    activeMemberCount: 2,
    ...overrides
  }
}

function createTeamDetail(overrides: Partial<AdminTeamDetailRecord> = {}): AdminTeamDetailRecord {
  return {
    ...createTeamSummary(),
    members: [
      {
        id: 'membership-admin',
        teamId: 'team-1',
        userId: 'user-admin',
        role: 'admin',
        joinedAt: '2026-03-22T12:00:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:00:00.000Z',
        user: {
          id: 'user-admin',
          email: 'admin@example.com',
          displayName: 'Admin User'
        }
      },
      {
        id: 'membership-member',
        teamId: 'team-1',
        userId: 'user-member',
        role: 'member',
        joinedAt: '2026-03-22T12:00:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:00:00.000Z',
        user: {
          id: 'user-member',
          email: 'member@example.com',
          displayName: 'Member User'
        }
      }
    ],
    ...overrides
  }
}

function createSubmission(overrides: Partial<SubmissionRecord> = {}): SubmissionRecord {
  return {
    id: 'submission-1',
    teamId: 'team-1',
    status: 'submitted',
    projectName: 'Alpha Project',
    summary: 'Canonical summary',
    repositoryUrl: null,
    demoUrl: null,
    submittedAt: '2026-03-24T12:00:00.000Z',
    lockedAt: null,
    withdrawnAt: null,
    disqualifiedAt: null,
    createdAt: '2026-03-24T12:00:00.000Z',
    updatedAt: '2026-03-24T12:00:00.000Z',
    ...overrides
  }
}

function createNoSubmissionEntry(overrides: Partial<NoSubmissionEntry> = {}): NoSubmissionEntry {
  return {
    team: createTeamSummary(),
    submission: null,
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
        firstName: 'Platform',
        familyName: 'Admin',
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

  test('allows explicit role mutations for hackathon admins and platform admins', () => {
    expect(canMutateRoleAssignments(createActor())).toBe(true)
    expect(canMutateRoleAssignments(createActor({
      isPlatformAdmin: true,
      platformUser: {
        id: 'platform-admin',
        email: 'platform@example.com',
        displayName: 'Platform Admin',
        firstName: 'Platform',
        familyName: 'Admin',
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
    expect(createHackathonSlug('  Spring 2026 @ Codex!  ')).toBe('spring-2026-codex')
    expect(createHackathonSlug('MIXED_Case__Slug')).toBe('mixed-case-slug')
    expect(fromDateTimeLocalValue(localValue)).toBe(isoTimestamp)
  })

  test('maps hackathon records into editable form state', () => {
    const hackathon = createHackathon({
      backgroundImageUrl: 'https://example.com/background.jpg',
      bannerImageUrl: 'https://example.com/banner.jpg',
      agendaItems: [
        {
          id: 'agenda-item-1',
          startsAt: '2026-03-22T11:00:00.000Z',
          endsAt: '2026-03-22T12:00:00.000Z',
          title: 'Opening',
          details: 'Kickoff',
          displayOrder: 1
        }
      ]
    })

    const formState = createHackathonFormState(hackathon)

    expect(formState).toMatchObject({
      name: hackathon.name,
      slug: hackathon.slug,
      city: hackathon.city,
      address: hackathon.address,
      backgroundImageUrl: 'https://example.com/background.jpg',
      bannerImageUrl: 'https://example.com/banner.jpg',
      maxTeamMembers: 5,
      inPersonEvent: false,
      requireLinkedinProfile: true,
      requireGithubProfile: true
    })

    expect(formState.agendaItems).toHaveLength(1)
    expect(formState.agendaItems[0]).toMatchObject({
      id: 'agenda-item-1',
      title: 'Opening',
      details: 'Kickoff',
      displayOrder: 1
    })
    expect(fromDateTimeLocalValue(formState.agendaItems[0].startsAt)).toBe('2026-03-22T11:00:00.000Z')
    expect(fromDateTimeLocalValue(formState.agendaItems[0].endsAt)).toBe('2026-03-22T12:00:00.000Z')
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

  test('returns the completion control once winners are announced', () => {
    const control = getCurrentLifecycleControl(
      createHackathon({ state: 'winners_announced' }),
      {
        submittedSubmissionCount: 2,
        judgePoolCount: 1,
        lockedSubmissionCount: 2,
        activeAssignmentCount: 0,
        lockedLeaderboardEntryCount: 2,
        completedReviewCount: 2,
        prizeCount: 1,
        hasCurrentWinnerTerms: true
      }
    )

    expect(control).toMatchObject({
      key: 'complete',
      isEnabled: true
    })
  })
})

describe('admin-workspace operational helpers', () => {
  test('collects paginated items until the full set is loaded', async () => {
    const responses = [
      {
        data: Array.from({ length: 2 }, (_, index) => ({ id: `team-${index + 1}` })),
        meta: { total: 3 }
      },
      {
        data: [{ id: 'team-3' }],
        meta: { total: 3 }
      }
    ]

    const pagesRequested: number[] = []
    const items = await listAllPaginatedItems(async (page) => {
      pagesRequested.push(page)
      return responses[page - 1] as { data: Array<{ id: string }>, meta: { total: number } }
    }, 2)

    expect(pagesRequested).toEqual([1, 2])
    expect(items).toEqual([
      { id: 'team-1' },
      { id: 'team-2' },
      { id: 'team-3' }
    ])
  })

  test('formats operational statuses into badge labels and colors', () => {
    expect(formatApplicationStatus('submitted')).toBe('Submitted')
    expect(getApplicationStatusColor('approved')).toBe('success')
    expect(formatAdminJudgeAssignmentStatus('judge_started')).toBe('Judge Started')
    expect(getJudgeAssignmentStatusColor('judge_completed')).toBe('success')
    expect(formatSubmissionStatus('none')).toBe('No Submission')
    expect(getSubmissionStatusColor('disqualified')).toBe('error')
  })

  test('allows only the documented admin judging interventions for each assignment state', () => {
    expect(getAdminJudgeAssignmentInterventionPolicy('judge_review', 'assigned')).toMatchObject({
      canReassign: true,
      canForceSkip: false,
      forceSkipReason: 'Only started assignments can be force-skipped.'
    })

    expect(getAdminJudgeAssignmentInterventionPolicy('judge_review', 'judge_started')).toMatchObject({
      canReassign: false,
      reassignReason: 'Only unstarted assignments can be reassigned.',
      canForceSkip: true
    })

    expect(getAdminJudgeAssignmentInterventionPolicy('shortlist', 'assigned')).toMatchObject({
      canReassign: false,
      reassignReason: 'Assignment reassignment is only available during judging preparation or judge review.',
      canForceSkip: false,
      forceSkipReason: 'Force-skip is available only once judge review has started.'
    })
  })

  test('builds operational team rows from team, detail, submission, and no-submission sources', () => {
    const operationalTeams = buildAdminOperationalTeams(
      [
        createTeamSummary(),
        createTeamSummary({
          id: 'team-2',
          name: 'Beta Team',
          slug: 'beta-team',
          createdByUserId: 'user-beta'
        })
      ],
      {
        teamDetails: [
          createTeamDetail(),
          createTeamDetail({
            id: 'team-2',
            name: 'Beta Team',
            slug: 'beta-team',
            createdByUserId: 'user-beta',
            members: [{
              id: 'membership-beta-admin',
              teamId: 'team-2',
              userId: 'user-beta',
              role: 'admin',
              joinedAt: '2026-03-22T12:00:00.000Z',
              leftAt: null,
              createdAt: '2026-03-22T12:00:00.000Z',
              user: {
                id: 'user-beta',
                email: 'beta@example.com',
                displayName: 'Beta Admin'
              }
            }]
          })
        ],
        submissions: [
          createSubmission(),
          null
        ],
        noSubmissionEntries: [
          createNoSubmissionEntry({
            team: createTeamSummary({
              id: 'team-2',
              name: 'Beta Team',
              slug: 'beta-team',
              createdByUserId: 'user-beta'
            })
          })
        ]
      }
    )

    expect(operationalTeams).toHaveLength(2)
    expect(operationalTeams[0]).toMatchObject({
      submissionStatus: 'submitted',
      isInNoSubmissionSection: false,
      activeMemberCount: 2,
      activeAdminChoices: [{
        userId: 'user-admin',
        label: 'Admin User (admin@example.com)'
      }]
    })
    expect(operationalTeams[1]).toMatchObject({
      submissionStatus: 'none',
      isInNoSubmissionSection: true,
      noSubmissionReason: 'none',
      activeAdminChoices: [{
        userId: 'user-beta',
        label: 'Beta Admin (beta@example.com)'
      }]
    })
  })

  test('limits admin interventions to the canonical lifecycle and submission states', () => {
    expect(getAdminSubmissionInterventionPolicy('submission_open', 'submitted')).toMatchObject({
      canAdminWithdraw: true,
      canDisqualify: false
    })

    expect(getAdminSubmissionInterventionPolicy('judge_review', 'locked')).toMatchObject({
      canAdminWithdraw: false,
      canDisqualify: true
    })

    expect(getAdminSubmissionInterventionPolicy('registration_open', 'submitted')).toMatchObject({
      canAdminWithdraw: false,
      adminWithdrawReason: 'Admin withdrawal is available only while submission is open.'
    })
  })
})
