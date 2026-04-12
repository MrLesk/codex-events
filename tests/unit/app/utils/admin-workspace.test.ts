import { describe, expect, test } from 'vitest'

import type {
  AdminApplicationRecord,
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
  formatApplicationLumaSyncStatus,
  formatApplicationStatus,
  formatAdminJudgeAssignmentStatus,
  formatSubmissionStatus,
  filterAdminOperationalTeams,
  filterManageableHackathons,
  fromDateTimeLocalValue,
  getAdminJudgeAssignmentInterventionPolicy,
  getAdminSubmissionDashboardBucket,
  getAdminSubmissionDashboardMetrics,
  getHackathonOperationsPhase,
  getAdminWorkspaceSubjectKey,
  getHackathonDashboardStateBadgePresentation,
  hasHackathonJudgingAccess,
  hasHackathonParticipantVisibilityAccess,
  getNextAgendaItemDefaultTimes,
  getAdminSubmissionInterventionPolicy,
  getApplicationLumaSyncStatusColor,
  getApplicationStatusColor,
  getCurrentLifecycleControl,
  getJudgeAssignmentStatusColor,
  getParticipantsLimitSummary,
  getTermsVersionPublishErrorMessage,
  hasHackathonAdminAccess,
  normalizeApiError,
  getSubmissionStatusColor,
  sortAdminOperationalTeamsForSubmissionDashboard,
  shouldShowApplicationLumaSyncStatus,
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
    lumaEventUrl: null,
    lumaEventApiId: null,
    city: 'Vienna',
    country: 'Austria',
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
    requireLumaEmail: false,
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
      isStaff: false,
      createdAt: '2026-03-01T00:00:00.000Z'
    }],
    ...overrides
  }
}

function createApplication(overrides: Partial<AdminApplicationRecord> = {}): AdminApplicationRecord {
  return {
    id: 'application-1',
    hackathonId: 'hackathon-1',
    userId: 'user-1',
    status: 'submitted',
    preApprovalStatus: null,
    submittedAt: '2026-03-22T12:00:00.000Z',
    reviewedAt: null,
    reviewedByUserId: null,
    applicationTermsDocumentId: 'terms-1',
    applicationTermsAcceptedAt: '2026-03-22T12:00:00.000Z',
    createdAt: '2026-03-22T12:00:00.000Z',
    updatedAt: '2026-03-22T12:00:00.000Z',
    ...overrides
  }
}

function createTeamSummary(overrides: Partial<TeamSummary> = {}): TeamSummary {
  return {
    id: 'team-1',
    hackathonId: 'hackathon-1',
    name: 'Alpha Team',
    bio: 'A focused admin-visible team.',
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
  test('renders a visible draft chip treatment on the admin dashboard', () => {
    expect(getHackathonDashboardStateBadgePresentation('draft')).toEqual({
      color: 'neutral',
      variant: 'outline',
      className: 'border-black/10 bg-black/[0.04] text-neutral-700 dark:border-white/[0.14] dark:bg-white/[0.08] dark:text-white/85'
    })

    expect(getHackathonDashboardStateBadgePresentation('registration_open')).toEqual({
      color: 'info',
      variant: 'soft',
      className: ''
    })
  })

  test('groups hackathon states into the supported operations dashboard phases', () => {
    expect(getHackathonOperationsPhase('draft')).toBeNull()
    expect(getHackathonOperationsPhase('registration_open')).toBe('registration_open')
    expect(getHackathonOperationsPhase('submission_open')).toBe('submission_open')
    expect(getHackathonOperationsPhase('judging_preparation')).toBe('judging')
    expect(getHackathonOperationsPhase('judge_review')).toBe('judging')
    expect(getHackathonOperationsPhase('shortlist')).toBe('judging')
    expect(getHackathonOperationsPhase('winners_announced')).toBe('judging')
    expect(getHackathonOperationsPhase('completed')).toBe('completed')
  })

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

  test('grants participant visibility to explicit staff without admin mutations', () => {
    const actor = createActor({
      hackathonRoles: [{
        hackathonId: 'hackathon-1',
        role: 'staff',
        isInJudgePool: false,
        isStaff: true,
        createdAt: '2026-03-01T00:00:00.000Z'
      }]
    })

    expect(hasHackathonParticipantVisibilityAccess(actor, 'hackathon-1')).toBe(true)
    expect(hasHackathonParticipantVisibilityAccess(actor, 'hackathon-2')).toBe(false)
    expect(hasHackathonJudgingAccess(actor, 'hackathon-1')).toBe(false)
    expect(canMutateRoleAssignments(actor)).toBe(false)
  })

  test('grants judging access only when an admin assignment is judge-enabled', () => {
    const adminActor = createActor()
    const judgingAdminActor = createActor({
      hackathonRoles: [{
        hackathonId: 'hackathon-1',
        role: 'hackathon_admin',
        isInJudgePool: true,
        isStaff: true,
        createdAt: '2026-03-01T00:00:00.000Z'
      }]
    })

    expect(hasHackathonJudgingAccess(adminActor, 'hackathon-1')).toBe(false)
    expect(hasHackathonJudgingAccess(judgingAdminActor, 'hackathon-1')).toBe(true)
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
      description: '# Overview\n\n- Build something ambitious\n- Share what you learned',
      backgroundImageUrl: 'https://example.com/background.jpg',
      bannerImageUrl: 'https://example.com/banner.jpg',
      lumaEventUrl: 'https://lu.ma/codex-builders',
      lumaEventApiId: 'evt-123',
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
      description: '# Overview\n\n- Build something ambitious\n- Share what you learned',
      city: hackathon.city,
      country: hackathon.country,
      address: hackathon.address,
      backgroundImageUrl: 'https://example.com/background.jpg',
      bannerImageUrl: 'https://example.com/banner.jpg',
      lumaEventUrl: 'https://lu.ma/codex-builders',
      lumaEventApiId: 'evt-123',
      maxTeamMembers: 5,
      participantsLimit: null,
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

  test('defaults a new agenda item to the previous end time when available', () => {
    expect(getNextAgendaItemDefaultTimes({
      id: 'agenda-item-1',
      startsAt: '2026-03-22T11:00',
      endsAt: '2026-03-22T12:00',
      title: 'Opening',
      details: '',
      displayOrder: 1
    })).toEqual({
      startsAt: '2026-03-22T12:00',
      endsAt: '2026-03-22T12:00'
    })
  })

  test('leaves new agenda item times blank without a previous end time', () => {
    expect(getNextAgendaItemDefaultTimes()).toEqual({
      startsAt: '',
      endsAt: ''
    })

    expect(getNextAgendaItemDefaultTimes({
      id: 'agenda-item-1',
      startsAt: '2026-03-22T11:00',
      endsAt: '',
      title: 'Opening',
      details: '',
      displayOrder: 1
    })).toEqual({
      startsAt: '',
      endsAt: ''
    })
  })

  test('normalizes authenticated subjects for cache-key partitioning', () => {
    expect(getAdminWorkspaceSubjectKey('  auth0|admin  ')).toBe('auth0|admin')
    expect(getAdminWorkspaceSubjectKey('')).toBe('anonymous')
    expect(buildAdminWorkspaceCacheKey('admin-workspace-session', 'auth0|admin')).toBe('admin-workspace-session:auth0|admin')
  })

  test('requires a title before publishing a terms version', () => {
    expect(getTermsVersionPublishErrorMessage('', 'Canonical application terms')).toBe(
      'Enter a title before publishing this terms version.'
    )

    expect(getTermsVersionPublishErrorMessage('   ', 'Canonical application terms')).toBe(
      'Enter a title before publishing this terms version.'
    )
  })

  test('requires content before publishing a terms version', () => {
    expect(getTermsVersionPublishErrorMessage('Application Terms v2', '')).toBe(
      'Enter the terms content before publishing this terms version.'
    )

    expect(getTermsVersionPublishErrorMessage('Application Terms v2', '   ')).toBe(
      'Enter the terms content before publishing this terms version.'
    )
  })

  test('allows publishing a terms version when title and content are present', () => {
    expect(getTermsVersionPublishErrorMessage(' Application Terms v2 ', ' Canonical application terms ')).toBe('')
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

  test('shows a draft publish control only while the registration window is active', () => {
    const control = getCurrentLifecycleControl(
      createHackathon({
        state: 'draft',
        registrationOpensAt: '2026-03-20T10:00:00.000Z',
        registrationClosesAt: '2026-03-22T10:00:00.000Z'
      }),
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
      new Date('2026-03-19T10:00:00.000Z')
    )

    expect(control).toMatchObject({
      key: 'open_registration',
      isEnabled: false,
      code: 'registration_window_not_open_yet'
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
  test('extracts canonical API messages from fetch-style upload errors', () => {
    expect(normalizeApiError({
      response: {
        _data: {
          error: {
            code: 'profile_icon_file_too_large',
            message: 'Profile icons must be 1MB or smaller.'
          }
        }
      }
    })).toEqual({
      code: 'profile_icon_file_too_large',
      message: 'Profile icons must be 1MB or smaller.'
    })
  })

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
    expect(formatApplicationLumaSyncStatus('not_synced')).toBe('Luma sync pending')
    expect(formatApplicationLumaSyncStatus('approve_synced')).toBe('Luma approved')
    expect(formatApplicationLumaSyncStatus('reject_synced')).toBe('Luma rejected')
    expect(getApplicationLumaSyncStatusColor('not_synced')).toBe('warning')
    expect(getApplicationLumaSyncStatusColor('approve_synced')).toBe('success')
    expect(getApplicationLumaSyncStatusColor('reject_synced')).toBe('error')
    expect(getApplicationLumaSyncStatusColor('approve_failed')).toBe('warning')
    expect(getApplicationLumaSyncStatusColor('reject_failed')).toBe('warning')
    expect(formatAdminJudgeAssignmentStatus('judge_started')).toBe('Judge Started')
    expect(getJudgeAssignmentStatusColor('judge_completed')).toBe('success')
    expect(formatSubmissionStatus('none')).toBe('No Submission')
    expect(getSubmissionStatusColor('disqualified')).toBe('error')
  })

  test('shows Luma sync status only for decided applications with a stored sync state', () => {
    expect(shouldShowApplicationLumaSyncStatus(
      createApplication({
        status: 'approved',
        lumaSyncStatus: 'not_synced'
      })
    )).toBe(true)

    expect(shouldShowApplicationLumaSyncStatus(
      createApplication({
        status: 'submitted',
        lumaSyncStatus: 'not_synced'
      })
    )).toBe(false)

    expect(shouldShowApplicationLumaSyncStatus(
      createApplication({
        status: 'rejected',
        lumaSyncStatus: null
      })
    )).toBe(false)

    expect(shouldShowApplicationLumaSyncStatus(
      createApplication({
        status: 'approved',
        lumaSyncStatus: 'approve_synced'
      })
    )).toBe(true)
  })

  test('summarizes participant limit fill including staged approvals', () => {
    expect(getParticipantsLimitSummary([
      createApplication({ id: 'application-approved', status: 'approved' }),
      createApplication({ id: 'application-staged-approved', preApprovalStatus: 'approved' }),
      createApplication({ id: 'application-staged-rejected', preApprovalStatus: 'rejected' })
    ], 3)).toMatchObject({
      participantsLimit: 3,
      approvedCount: 1,
      stagedApprovedCount: 1,
      projectedApprovedCount: 2,
      description: 'Current fill: 1/3 approved against the planning target. If you save the current staged decisions, projected fill becomes 2/3, leaving 1 spot remaining against the target.'
    })
  })

  test('reports when staged approvals would push the participant target over limit', () => {
    expect(getParticipantsLimitSummary([
      createApplication({ id: 'application-approved-1', status: 'approved' }),
      createApplication({ id: 'application-approved-2', status: 'approved' }),
      createApplication({ id: 'application-staged-approved', preApprovalStatus: 'approved' })
    ], 2)).toMatchObject({
      participantsLimit: 2,
      approvedCount: 2,
      stagedApprovedCount: 1,
      projectedApprovedCount: 3,
      description: 'Current fill: 2/2 approved against the planning target. If you save the current staged decisions, projected fill becomes 3/2, which is 1 spot over the target.'
    })
  })

  test('returns no participant-limit summary when the hackathon has no configured limit', () => {
    expect(getParticipantsLimitSummary([
      createApplication({ status: 'approved' })
    ], null)).toBeNull()
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

  test('derives compact submission dashboard metrics and lifecycle buckets', () => {
    const operationalTeams = buildAdminOperationalTeams(
      [
        createTeamSummary({
          id: 'team-none',
          name: 'No Record Team',
          slug: 'no-record-team',
          createdByUserId: 'user-none'
        }),
        createTeamSummary({
          id: 'team-draft',
          name: 'Draft Team',
          slug: 'draft-team',
          createdByUserId: 'user-draft'
        }),
        createTeamSummary({
          id: 'team-ready',
          name: 'Ready Team',
          slug: 'ready-team',
          createdByUserId: 'user-ready'
        }),
        createTeamSummary({
          id: 'team-out',
          name: 'Out Team',
          slug: 'out-team',
          createdByUserId: 'user-out'
        })
      ],
      {
        teamDetails: [
          createTeamDetail({
            id: 'team-none',
            name: 'No Record Team',
            slug: 'no-record-team',
            createdByUserId: 'user-none'
          }),
          createTeamDetail({
            id: 'team-draft',
            name: 'Draft Team',
            slug: 'draft-team',
            createdByUserId: 'user-draft'
          }),
          createTeamDetail({
            id: 'team-ready',
            name: 'Ready Team',
            slug: 'ready-team',
            createdByUserId: 'user-ready'
          }),
          createTeamDetail({
            id: 'team-out',
            name: 'Out Team',
            slug: 'out-team',
            createdByUserId: 'user-out'
          })
        ],
        submissions: [
          null,
          createSubmission({
            id: 'submission-draft',
            teamId: 'team-draft',
            status: 'draft',
            projectName: 'Draft Console'
          }),
          createSubmission({
            id: 'submission-ready',
            teamId: 'team-ready',
            status: 'submitted',
            projectName: 'Ready Console'
          }),
          createSubmission({
            id: 'submission-out',
            teamId: 'team-out',
            status: 'withdrawn',
            projectName: 'Withdrawn Console'
          })
        ],
        noSubmissionEntries: [
          createNoSubmissionEntry({
            team: createTeamSummary({
              id: 'team-none',
              name: 'No Record Team',
              slug: 'no-record-team',
              createdByUserId: 'user-none'
            })
          }),
          createNoSubmissionEntry({
            team: createTeamSummary({
              id: 'team-draft',
              name: 'Draft Team',
              slug: 'draft-team',
              createdByUserId: 'user-draft'
            }),
            submission: createSubmission({
              id: 'submission-draft',
              teamId: 'team-draft',
              status: 'draft',
              projectName: 'Draft Console'
            })
          })
        ]
      }
    )

    expect(getAdminSubmissionDashboardBucket('none')).toBe('late')
    expect(getAdminSubmissionDashboardBucket('draft')).toBe('late')
    expect(getAdminSubmissionDashboardBucket('submitted')).toBe('ready')
    expect(getAdminSubmissionDashboardBucket('locked')).toBe('ready')
    expect(getAdminSubmissionDashboardBucket('withdrawn')).toBe('out')
    expect(getAdminSubmissionDashboardBucket('disqualified')).toBe('out')

    expect(getAdminSubmissionDashboardMetrics(operationalTeams)).toEqual({
      totalTeams: 4,
      readyTeams: 1,
      draftTeams: 1,
      noSubmissionTeams: 1,
      lateTeams: 2,
      outTeams: 1
    })
  })

  test('sorts and filters submission monitor rows by metadata only', () => {
    const operationalTeams = buildAdminOperationalTeams(
      [
        createTeamSummary({
          id: 'team-ready',
          name: 'Ready Team',
          slug: 'ready-team',
          createdByUserId: 'user-ready',
          updatedAt: '2026-03-24T15:00:00.000Z'
        }),
        createTeamSummary({
          id: 'team-draft',
          name: 'Draft Team',
          slug: 'draft-team',
          createdByUserId: 'user-draft',
          updatedAt: '2026-03-24T14:00:00.000Z'
        }),
        createTeamSummary({
          id: 'team-none',
          name: 'No Record Team',
          slug: 'no-record-team',
          createdByUserId: 'user-none',
          updatedAt: '2026-03-24T13:00:00.000Z'
        })
      ],
      {
        teamDetails: [
          createTeamDetail({
            id: 'team-ready',
            name: 'Ready Team',
            slug: 'ready-team',
            createdByUserId: 'user-ready',
            members: [{
              id: 'membership-ready-admin',
              teamId: 'team-ready',
              userId: 'user-ready',
              role: 'admin',
              joinedAt: '2026-03-22T12:00:00.000Z',
              leftAt: null,
              createdAt: '2026-03-22T12:00:00.000Z',
              user: {
                id: 'user-ready',
                email: 'ready-admin@example.com',
                displayName: 'Ready Admin'
              }
            }]
          }),
          createTeamDetail({
            id: 'team-draft',
            name: 'Draft Team',
            slug: 'draft-team',
            createdByUserId: 'user-draft',
            members: [{
              id: 'membership-draft-admin',
              teamId: 'team-draft',
              userId: 'user-draft',
              role: 'admin',
              joinedAt: '2026-03-22T12:00:00.000Z',
              leftAt: null,
              createdAt: '2026-03-22T12:00:00.000Z',
              user: {
                id: 'user-draft',
                email: 'draft-admin@example.com',
                displayName: 'Draft Admin'
              }
            }]
          }),
          createTeamDetail({
            id: 'team-none',
            name: 'No Record Team',
            slug: 'no-record-team',
            createdByUserId: 'user-none',
            members: [{
              id: 'membership-none-admin',
              teamId: 'team-none',
              userId: 'user-none',
              role: 'admin',
              joinedAt: '2026-03-22T12:00:00.000Z',
              leftAt: null,
              createdAt: '2026-03-22T12:00:00.000Z',
              user: {
                id: 'user-none',
                email: 'none-admin@example.com',
                displayName: 'None Admin'
              }
            }]
          })
        ],
        submissions: [
          createSubmission({
            id: 'submission-ready',
            teamId: 'team-ready',
            status: 'submitted',
            projectName: 'Launch Console',
            summary: 'Hidden summary terms',
            submittedAt: '2026-03-24T15:00:00.000Z',
            updatedAt: '2026-03-24T15:00:00.000Z'
          }),
          createSubmission({
            id: 'submission-draft',
            teamId: 'team-draft',
            status: 'draft',
            projectName: 'Draft Console',
            summary: 'Internal-only draft summary',
            submittedAt: null,
            updatedAt: '2026-03-24T14:00:00.000Z'
          }),
          null
        ],
        noSubmissionEntries: [
          createNoSubmissionEntry({
            team: createTeamSummary({
              id: 'team-none',
              name: 'No Record Team',
              slug: 'no-record-team',
              createdByUserId: 'user-none'
            })
          }),
          createNoSubmissionEntry({
            team: createTeamSummary({
              id: 'team-draft',
              name: 'Draft Team',
              slug: 'draft-team',
              createdByUserId: 'user-draft'
            }),
            submission: createSubmission({
              id: 'submission-draft',
              teamId: 'team-draft',
              status: 'draft',
              projectName: 'Draft Console'
            })
          })
        ]
      }
    )
    const sortedTeams = sortAdminOperationalTeamsForSubmissionDashboard(operationalTeams)

    expect(sortedTeams.map(team => team.team.id)).toEqual([
      'team-none',
      'team-draft',
      'team-ready'
    ])

    expect(filterAdminOperationalTeams(sortedTeams, {
      filter: 'late'
    }).map(team => team.team.id)).toEqual([
      'team-none',
      'team-draft'
    ])

    expect(filterAdminOperationalTeams(sortedTeams, {
      filter: 'ready'
    }).map(team => team.team.id)).toEqual([
      'team-ready'
    ])

    expect(filterAdminOperationalTeams(sortedTeams, {
      search: 'draft-admin@example.com'
    }).map(team => team.team.id)).toEqual([
      'team-draft'
    ])

    expect(filterAdminOperationalTeams(sortedTeams, {
      search: 'user-none'
    }).map(team => team.team.id)).toEqual([
      'team-none'
    ])

    expect(filterAdminOperationalTeams(sortedTeams, {
      search: 'launch console'
    }).map(team => team.team.id)).toEqual([
      'team-ready'
    ])

    expect(filterAdminOperationalTeams(sortedTeams, {
      search: 'internal-only draft summary'
    })).toEqual([])
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
