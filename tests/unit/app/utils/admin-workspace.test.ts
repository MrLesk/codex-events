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
  buildAdminJudgeAssignmentOversightGroups,
  buildAdminOperationalTeams,
  listAllPaginatedItems,
  buildAdminWorkspaceCacheKey,
  canMutateRoleAssignments,
  countActiveAdminOperationalTeams,
  createEmptyHackathonFormState,
  createHackathonFormState,
  createHackathonSlug,
  formatFailedApplicationLumaSyncAlertToggleLabel,
  formatApplicationAttendanceStatus,
  formatApplicationLumaSyncStatus,
  formatApplicationStatus,
  formatAdminJudgeAssignmentStatus,
  formatApprovedParticipantRegistrationSummary,
  formatSubmissionStatus,
  filterActiveAdminOperationalTeams,
  filterAdminOperationalTeams,
  filterManageableHackathons,
  fromDateTimeLocalValue,
  getAdminJudgeAssignmentInterventionPolicy,
  getAdminSubmissionDashboardMetrics,
  getApplicationAttendanceStatusColor,
  getCriteriaConfigurationValidationIssues,
  getHackathonOperationsPhase,
  getAdminWorkspaceSubjectKey,
  getApprovedParticipantAttendanceSummary,
  hasHackathonJudgingAccess,
  hasHackathonParticipantVisibilityAccess,
  getParticipantApplicationStatusSummary,
  getNextAgendaItemDefaultTimes,
  getAdminSubmissionInterventionPolicy,
  getApplicationLumaSyncStatusColor,
  getApplicationStatusColor,
  getCurrentLifecycleControl,
  getJudgeAssignmentStatusColor,
  getParticipantsLimitSummary,
  shouldShowApprovedParticipantAttendanceSummary,
  getTermsVersionPublishErrorMessage,
  hasHackathonAdminAccess,
  normalizeApiError,
  getSubmissionStatusColor,
  isApplicationCheckedIn,
  listFailedApplicationLumaSyncApplications,
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
    discordServerUrl: null,
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
    blindReviewCount: 1,
    pitchReviewEnabled: false,
    blindScoreWeightPercent: 70,
    pitchScoreWeightPercent: 30,
    pitchPresentationSubmissionIds: [],
    activePitchPresentationSubmissionId: null,
    pitchPresentationsCompletedAt: null,
    inPersonEvent: false,
    requireXProfile: false,
    requireLinkedinProfile: true,
    requireGithubProfile: true,
    requireChatgptEmail: false,
    requireOpenaiOrgId: false,
    requireLumaEmail: false,
    requireWhyThisHackathon: false,
    requireProofOfExecution: false,
    requireSubmissionSummary: false,
    requireSubmissionRepositoryUrl: false,
    requireSubmissionDemoUrl: false,
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
    checkedInAt: null,
    submittedAt: '2026-03-22T12:00:00.000Z',
    withdrawnAt: null,
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
    trackId: null,
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

function createJudgeAssignment(overrides: Partial<import('../../../../app/utils/admin-workspace').JudgeAssignmentSummary> = {}) {
  return {
    id: 'assignment-1',
    hackathonId: 'hackathon-1',
    submissionId: 'submission-1',
    judgeUserId: 'judge-1',
    status: 'assigned',
    assignedAt: '2026-03-24T14:00:00.000Z',
    startedAt: null,
    completedAt: null,
    skippedAt: null,
    skippedByUserId: null,
    skipReason: null,
    ineligibilityStatus: 'eligible',
    ineligibilityReason: null,
    ineligibilityMarkedAt: null,
    ineligibilityMarkedByUserId: null,
    createdAt: '2026-03-24T14:00:00.000Z',
    blindSubmission: {
      id: 'blind-submission-1',
      projectName: 'Alpha Project',
      summary: 'Canonical blind submission summary.',
      repositoryUrl: null,
      demoUrl: null,
      track: null,
      status: 'locked',
      submittedAt: '2026-03-24T13:00:00.000Z',
      lockedAt: '2026-03-24T13:10:00.000Z',
      applications: []
    },
    criterionScores: [],
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
  test('groups hackathon states into the supported operations dashboard phases', () => {
    expect(getHackathonOperationsPhase('draft')).toBeNull()
    expect(getHackathonOperationsPhase('registration_open')).toBe('registration_open')
    expect(getHackathonOperationsPhase('submission_open')).toBe('submission_open')
    expect(getHackathonOperationsPhase('judging_preparation')).toBe('judging')
    expect(getHackathonOperationsPhase('blind_review')).toBe('judging')
    expect(getHackathonOperationsPhase('shortlist')).toBe('judging')
    expect(getHackathonOperationsPhase('pitch')).toBe('judging')
    expect(getHackathonOperationsPhase('pitch_review')).toBe('judging')
    expect(getHackathonOperationsPhase('final_deliberation')).toBe('judging')
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

  test('uses canonical defaults for new hackathon form scoring fields', () => {
    expect(createEmptyHackathonFormState()).toMatchObject({
      blindReviewCount: 1,
      pitchReviewEnabled: false,
      blindScoreWeightPercent: 70,
      pitchScoreWeightPercent: 30
    })
  })

  test('maps hackathon records into editable form state', () => {
    const hackathon = createHackathon({
      description: '# Overview\n\n- Build something ambitious\n- Share what you learned',
      backgroundImageUrl: 'https://example.com/background.jpg',
      bannerImageUrl: 'https://example.com/banner.jpg',
      discordServerUrl: 'https://discord.gg/codex-builders',
      lumaEventUrl: 'https://lu.ma/codex-builders',
      lumaEventApiId: 'evt-123',
      blindReviewCount: 3,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 60,
      pitchScoreWeightPercent: 40,
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
      discordServerUrl: 'https://discord.gg/codex-builders',
      lumaEventUrl: 'https://lu.ma/codex-builders',
      lumaEventApiId: 'evt-123',
      maxTeamMembers: 5,
      participantsLimit: null,
      blindReviewCount: 3,
      pitchReviewEnabled: true,
      blindScoreWeightPercent: 60,
      pitchScoreWeightPercent: 40,
      inPersonEvent: false,
      requireLinkedinProfile: true,
      requireGithubProfile: true
    })

    expect(formState.agendaItems).toHaveLength(1)
    expect(formState.tracks).toEqual([])
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

  test('requires a description before saving criteria configuration', () => {
    expect(getCriteriaConfigurationValidationIssues([
      {
        id: 'criterion-1',
        name: 'Impact',
        description: '   ',
        weight: 30
      }
    ])).toEqual([
      {
        criterionId: 'criterion-1',
        field: 'description',
        message: 'Enter a description so judges know what to evaluate.',
        summaryMessage: '"Impact" needs a description. Add a short description so judges know what to evaluate.'
      }
    ])
  })

  test('uses positional labels when a criterion is missing its name', () => {
    expect(getCriteriaConfigurationValidationIssues([
      {
        id: 'criterion-1',
        name: '   ',
        description: 'Judges should assess novelty.',
        weight: 30
      }
    ])).toEqual([
      {
        criterionId: 'criterion-1',
        field: 'name',
        message: 'Enter a criterion name.',
        summaryMessage: 'Criterion 1 is missing a name. Enter a short criterion name before saving.'
      }
    ])
  })

  test('requires a whole-number non-negative criterion weight', () => {
    expect(getCriteriaConfigurationValidationIssues([
      {
        id: 'criterion-1',
        name: 'Execution',
        description: 'Judges should assess execution quality.',
        weight: -1
      },
      {
        id: 'criterion-2',
        name: 'Impact',
        description: 'Judges should assess user impact.',
        weight: 12.5
      }
    ])).toEqual([
      {
        criterionId: 'criterion-1',
        field: 'weight',
        message: 'Enter a whole-number weight of 0 or more.',
        summaryMessage: '"Execution" has an invalid weight. Use a whole number of 0 or more.'
      },
      {
        criterionId: 'criterion-2',
        field: 'weight',
        message: 'Enter a whole-number weight of 0 or more.',
        summaryMessage: '"Impact" has an invalid weight. Use a whole number of 0 or more.'
      }
    ])
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

  test('enables blind-review to shortlist transition only when pitch review is enabled', () => {
    const control = getCurrentLifecycleControl(
      createHackathon({
        state: 'blind_review',
        pitchReviewEnabled: true
      }),
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

  test('renames the submission-phase lifecycle action and removes judge-pool gating from stop submissions', () => {
    const control = getCurrentLifecycleControl(
      createHackathon({
        state: 'submission_open'
      }),
      {
        submittedSubmissionCount: 2,
        judgePoolCount: 0,
        lockedSubmissionCount: 0,
        activeAssignmentCount: 0,
        lockedLeaderboardEntryCount: 0,
        completedReviewCount: 0,
        prizeCount: 0,
        hasCurrentWinnerTerms: false
      },
      new Date('2026-03-25T12:00:00.000Z')
    )

    expect(control).toMatchObject({
      key: 'start_judging_preparation',
      label: 'Stop Submissions',
      isEnabled: true
    })
  })

  test('gates blind review on submitted work and distinct judge coverage during judging preparation', () => {
    const disabledControl = getCurrentLifecycleControl(
      createHackathon({
        state: 'judging_preparation',
        blindReviewCount: 2,
        pitchReviewEnabled: true
      }),
      {
        submittedSubmissionCount: 3,
        judgePoolCount: 1,
        lockedSubmissionCount: 0,
        activeAssignmentCount: 0,
        lockedLeaderboardEntryCount: 0,
        completedReviewCount: 0,
        prizeCount: 0,
        hasCurrentWinnerTerms: true
      }
    )

    expect(disabledControl).toMatchObject({
      key: 'start_blind_review',
      isEnabled: false,
      code: 'distinct_blind_review_judges_required'
    })

    const enabledControl = getCurrentLifecycleControl(
      createHackathon({
        state: 'judging_preparation',
        blindReviewCount: 2,
        pitchReviewEnabled: true
      }),
      {
        submittedSubmissionCount: 3,
        judgePoolCount: 2,
        lockedSubmissionCount: 0,
        activeAssignmentCount: 0,
        lockedLeaderboardEntryCount: 0,
        completedReviewCount: 0,
        prizeCount: 0,
        hasCurrentWinnerTerms: true
      }
    )

    expect(enabledControl).toMatchObject({
      key: 'start_blind_review',
      isEnabled: true
    })
  })

  test('routes pitch-only hackathons into the live pitch stage from judging preparation', () => {
    const control = getCurrentLifecycleControl(
      createHackathon({
        state: 'judging_preparation',
        blindReviewCount: 0,
        pitchReviewEnabled: true,
        blindScoreWeightPercent: 0,
        pitchScoreWeightPercent: 100
      }),
      {
        submittedSubmissionCount: 3,
        judgePoolCount: 2,
        lockedSubmissionCount: 0,
        activeAssignmentCount: 0,
        lockedLeaderboardEntryCount: 0,
        completedReviewCount: 0,
        prizeCount: 0,
        hasCurrentWinnerTerms: true
      }
    )

    expect(control).toMatchObject({
      key: 'start_pitch',
      isEnabled: true
    })
  })

  test('routes the live pitch stage into pitch review once admins are ready to assign judges', () => {
    const control = getCurrentLifecycleControl(
      createHackathon({
        state: 'pitch',
        blindReviewCount: 0,
        pitchReviewEnabled: true,
        blindScoreWeightPercent: 0,
        pitchScoreWeightPercent: 100,
        pitchPresentationSubmissionIds: ['submission-1', 'submission-2'],
        pitchPresentationsCompletedAt: '2026-03-26T12:20:00.000Z'
      }),
      {
        submittedSubmissionCount: 3,
        judgePoolCount: 2,
        lockedSubmissionCount: 3,
        activeAssignmentCount: 0,
        lockedLeaderboardEntryCount: 3,
        completedReviewCount: 0,
        prizeCount: 0,
        hasCurrentWinnerTerms: true
      }
    )

    expect(control).toMatchObject({
      key: 'start_pitch_review',
      isEnabled: true
    })
  })

  test('keeps pitch review disabled until the live presentation lineup is completed', () => {
    const control = getCurrentLifecycleControl(
      createHackathon({
        state: 'pitch',
        blindReviewCount: 0,
        pitchReviewEnabled: true,
        blindScoreWeightPercent: 0,
        pitchScoreWeightPercent: 100,
        pitchPresentationSubmissionIds: ['submission-1', 'submission-2'],
        activePitchPresentationSubmissionId: 'submission-1'
      }),
      {
        submittedSubmissionCount: 3,
        judgePoolCount: 2,
        lockedSubmissionCount: 3,
        activeAssignmentCount: 0,
        lockedLeaderboardEntryCount: 3,
        completedReviewCount: 0,
        prizeCount: 0,
        hasCurrentWinnerTerms: true
      }
    )

    expect(control).toMatchObject({
      key: 'start_pitch_review',
      isEnabled: false,
      code: 'pitch_presentations_incomplete',
      reason: 'Finish the live pitch presentation lineup from Operations before pitch review can start.'
    })
  })

  test('routes blind-only hackathons into final deliberation once blind review is complete', () => {
    const control = getCurrentLifecycleControl(
      createHackathon({
        state: 'blind_review',
        pitchReviewEnabled: false
      }),
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
      key: 'start_final_deliberation',
      isEnabled: true
    })
  })

  test('blocks winner announcement when prizes exist without current winner terms', () => {
    const control = getCurrentLifecycleControl(
      createHackathon({ state: 'final_deliberation' }),
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
    expect(formatApplicationAttendanceStatus(createApplication({
      checkedInAt: '2026-03-22T14:30:00.000Z'
    }))).toBe('Checked in')
    expect(formatApplicationAttendanceStatus(createApplication())).toBe('Not checked in')
    expect(getApplicationAttendanceStatusColor(createApplication({
      checkedInAt: '2026-03-22T14:30:00.000Z'
    }))).toBe('success')
    expect(getApplicationAttendanceStatusColor(createApplication())).toBe('neutral')
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
    expect(formatSubmissionStatus('none')).toBe('No record')
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

  test('lists failed Luma sync applications for the active review view', () => {
    const applications = [
      createApplication({
        id: 'application-approved-failed',
        status: 'approved',
        lumaSyncStatus: 'approve_failed'
      }),
      createApplication({
        id: 'application-approved-synced',
        status: 'approved',
        lumaSyncStatus: 'approve_synced'
      }),
      createApplication({
        id: 'application-rejected-failed',
        status: 'rejected',
        lumaSyncStatus: 'reject_failed'
      }),
      createApplication({
        id: 'application-withdrawn-failed',
        status: 'withdrawn',
        lumaSyncStatus: 'reject_failed'
      })
    ]

    expect(listFailedApplicationLumaSyncApplications(applications, 'applications')).toEqual([])
    expect(listFailedApplicationLumaSyncApplications(applications, 'approved').map(application => application.id)).toEqual([
      'application-approved-failed'
    ])
    expect(listFailedApplicationLumaSyncApplications(applications, 'rejected').map(application => application.id)).toEqual([
      'application-rejected-failed'
    ])
    expect(listFailedApplicationLumaSyncApplications(applications, 'withdrawn').map(application => application.id)).toEqual([
      'application-withdrawn-failed'
    ])
  })

  test('formats the failed Luma sync recap toggle label', () => {
    expect(formatFailedApplicationLumaSyncAlertToggleLabel(0, false)).toBe('')
    expect(formatFailedApplicationLumaSyncAlertToggleLabel(1, false)).toBe('Expand')
    expect(formatFailedApplicationLumaSyncAlertToggleLabel(3, false)).toBe('Expand')
    expect(formatFailedApplicationLumaSyncAlertToggleLabel(3, true)).toBe('Collapse')
  })

  test('detects approved participant attendance from checkedInAt', () => {
    expect(isApplicationCheckedIn(createApplication({
      checkedInAt: '2026-03-22T14:30:00.000Z'
    }))).toBe(true)

    expect(isApplicationCheckedIn(createApplication({
      checkedInAt: null
    }))).toBe(false)
  })

  test('summarizes checked-in attendance relative to approved participants', () => {
    expect(getApprovedParticipantAttendanceSummary([
      createApplication({
        id: 'application-approved-checked-in',
        status: 'approved',
        checkedInAt: '2026-03-22T14:30:00.000Z'
      }),
      createApplication({
        id: 'application-approved-not-checked-in',
        status: 'approved',
        checkedInAt: null
      }),
      createApplication({
        id: 'application-submitted',
        status: 'submitted',
        checkedInAt: '2026-03-22T15:00:00.000Z'
      })
    ])).toEqual({
      approvedCount: 2,
      checkedInCount: 1,
      value: '1 / 2'
    })
  })

  test('summarizes participant application counts across all visible statuses', () => {
    expect(getParticipantApplicationStatusSummary([
      createApplication({ status: 'submitted' }),
      createApplication({ status: 'approved' }),
      createApplication({ status: 'approved' }),
      createApplication({ status: 'rejected' }),
      createApplication({ status: 'withdrawn' })
    ])).toEqual({
      totalCount: 5,
      submittedCount: 1,
      approvedCount: 2,
      rejectedCount: 1,
      withdrawnCount: 1
    })
  })

  test('formats approved participants relative to total registrations', () => {
    expect(formatApprovedParticipantRegistrationSummary([
      createApplication({ status: 'submitted' }),
      createApplication({ status: 'approved' }),
      createApplication({ status: 'approved' }),
      createApplication({ status: 'rejected' })
    ])).toBe('2 / 4')
  })

  test('shows attendance summary only when Luma email is required and an event API ID is configured', () => {
    expect(shouldShowApprovedParticipantAttendanceSummary(createHackathon({
      requireLumaEmail: true,
      lumaEventApiId: 'evt-123'
    }))).toBe(true)

    expect(shouldShowApprovedParticipantAttendanceSummary(createHackathon({
      requireLumaEmail: false,
      lumaEventApiId: 'evt-123'
    }))).toBe(false)

    expect(shouldShowApprovedParticipantAttendanceSummary(createHackathon({
      requireLumaEmail: true,
      lumaEventApiId: '   '
    }))).toBe(false)

    expect(shouldShowApprovedParticipantAttendanceSummary(createHackathon({
      requireLumaEmail: true,
      lumaEventApiId: null
    }))).toBe(false)

    expect(shouldShowApprovedParticipantAttendanceSummary(null)).toBe(false)
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
    expect(getAdminJudgeAssignmentInterventionPolicy('blind_review', 'assigned')).toMatchObject({
      canReassign: true,
      canForceSkip: false,
      forceSkipReason: 'Only started assignments can be force-skipped.'
    })

    expect(getAdminJudgeAssignmentInterventionPolicy('blind_review', 'judge_started')).toMatchObject({
      canReassign: false,
      reassignReason: 'Only unstarted assignments can be reassigned.',
      canForceSkip: true
    })

    expect(getAdminJudgeAssignmentInterventionPolicy('judging_preparation', 'assigned')).toMatchObject({
      canReassign: false,
      reassignReason: 'Assignment reassignment is only available during blind review.',
      canForceSkip: false,
      forceSkipReason: 'Force-skip is available only once blind review has started.'
    })

    expect(getAdminJudgeAssignmentInterventionPolicy('pitch_review', 'assigned')).toMatchObject({
      canReassign: false,
      reassignReason: 'Assignment reassignment is only available during blind review.',
      canForceSkip: false,
      forceSkipReason: 'Force-skip is available only once blind review has started.'
    })
  })

  test('groups active judging assignments by judge and sorts unstarted work first within each judge', () => {
    const groups = buildAdminJudgeAssignmentOversightGroups([
      createJudgeAssignment({
        id: 'assignment-3',
        judgeUserId: 'judge-2',
        blindSubmission: {
          id: 'blind-submission-3',
          projectName: 'Gamma Project',
          summary: 'Summary',
          repositoryUrl: null,
          demoUrl: null,
          track: null,
          status: 'locked',
          submittedAt: '2026-03-24T13:00:00.000Z',
          lockedAt: '2026-03-24T13:10:00.000Z',
          applications: []
        }
      }),
      createJudgeAssignment({
        id: 'assignment-2',
        judgeUserId: 'judge-1',
        status: 'judge_started',
        blindSubmission: {
          id: 'blind-submission-2',
          projectName: 'Beta Project',
          summary: 'Summary',
          repositoryUrl: null,
          demoUrl: null,
          track: null,
          status: 'locked',
          submittedAt: '2026-03-24T13:00:00.000Z',
          lockedAt: '2026-03-24T13:10:00.000Z',
          applications: []
        }
      }),
      createJudgeAssignment()
    ], {
      judgeLabelsByUserId: {
        'judge-1': 'Ada Lovelace',
        'judge-2': 'Grace Hopper'
      }
    })

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({
      judgeUserId: 'judge-1',
      judgeLabel: 'Ada Lovelace',
      activeAssignmentCount: 2,
      assignedCount: 1,
      startedCount: 1
    })
    expect(groups[0]?.assignments.map(assignment => assignment.id)).toEqual([
      'assignment-1',
      'assignment-2'
    ])
    expect(groups[1]).toMatchObject({
      judgeUserId: 'judge-2',
      judgeLabel: 'Grace Hopper',
      activeAssignmentCount: 1,
      assignedCount: 1,
      startedCount: 0
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

  test('derives compact submission dashboard metrics from exact submission states', () => {
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

    expect(getAdminSubmissionDashboardMetrics(operationalTeams)).toEqual({
      totalTeams: 4,
      noRecordTeams: 1,
      draftTeams: 1,
      submittedTeams: 1,
      lockedTeams: 0,
      submittedOrLaterTeams: 1,
      withdrawnTeams: 1,
      disqualifiedTeams: 0,
      outTeams: 1
    })
  })

  test('filters active operational teams for submission dashboards and progress denominators', () => {
    const operationalTeams = buildAdminOperationalTeams(
      [
        createTeamSummary({
          id: 'team-active-submitted',
          name: 'Active Submitted Team',
          slug: 'active-submitted-team',
          createdByUserId: 'user-active-submitted',
          activeMemberCount: 3
        }),
        createTeamSummary({
          id: 'team-active-draft',
          name: 'Active Draft Team',
          slug: 'active-draft-team',
          createdByUserId: 'user-active-draft',
          activeMemberCount: 2
        }),
        createTeamSummary({
          id: 'team-dissolved-withdrawn',
          name: 'Dissolved Withdrawn Team',
          slug: 'dissolved-withdrawn-team',
          createdByUserId: 'user-dissolved',
          activeMemberCount: 0
        })
      ],
      {
        teamDetails: [
          createTeamDetail({
            id: 'team-active-submitted',
            name: 'Active Submitted Team',
            slug: 'active-submitted-team'
          }),
          createTeamDetail({
            id: 'team-active-draft',
            name: 'Active Draft Team',
            slug: 'active-draft-team'
          }),
          createTeamDetail({
            id: 'team-dissolved-withdrawn',
            name: 'Dissolved Withdrawn Team',
            slug: 'dissolved-withdrawn-team',
            activeMemberCount: 0,
            members: []
          })
        ],
        submissions: [
          createSubmission({
            id: 'submission-active-submitted',
            teamId: 'team-active-submitted',
            status: 'submitted'
          }),
          createSubmission({
            id: 'submission-active-draft',
            teamId: 'team-active-draft',
            status: 'draft'
          }),
          createSubmission({
            id: 'submission-dissolved-withdrawn',
            teamId: 'team-dissolved-withdrawn',
            status: 'withdrawn'
          })
        ]
      }
    )

    const activeOperationalTeams = filterActiveAdminOperationalTeams(operationalTeams)

    expect(countActiveAdminOperationalTeams(operationalTeams)).toBe(2)
    expect(activeOperationalTeams.map(team => team.team.id)).toEqual([
      'team-active-submitted',
      'team-active-draft'
    ])
    expect(getAdminSubmissionDashboardMetrics(activeOperationalTeams)).toEqual({
      totalTeams: 2,
      noRecordTeams: 0,
      draftTeams: 1,
      submittedTeams: 1,
      lockedTeams: 0,
      submittedOrLaterTeams: 1,
      withdrawnTeams: 0,
      disqualifiedTeams: 0,
      outTeams: 0
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
      filter: 'none'
    }).map(team => team.team.id)).toEqual(['team-none'])

    expect(filterAdminOperationalTeams(sortedTeams, {
      filter: 'draft'
    }).map(team => team.team.id)).toEqual(['team-draft'])

    expect(filterAdminOperationalTeams(sortedTeams, {
      filter: 'submitted'
    }).map(team => team.team.id)).toEqual(['team-ready'])

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

  test('groups withdrawn and disqualified rows behind the out filter', () => {
    const sortedTeams = sortAdminOperationalTeamsForSubmissionDashboard(
      buildAdminOperationalTeams(
        [
          createTeamSummary({
            id: 'team-withdrawn',
            name: 'Withdrawn Team',
            slug: 'withdrawn-team',
            createdByUserId: 'user-withdrawn'
          }),
          createTeamSummary({
            id: 'team-disqualified',
            name: 'Disqualified Team',
            slug: 'disqualified-team',
            createdByUserId: 'user-disqualified'
          })
        ],
        {
          teamDetails: [
            createTeamDetail({
              id: 'team-withdrawn',
              name: 'Withdrawn Team',
              slug: 'withdrawn-team',
              createdByUserId: 'user-withdrawn'
            }),
            createTeamDetail({
              id: 'team-disqualified',
              name: 'Disqualified Team',
              slug: 'disqualified-team',
              createdByUserId: 'user-disqualified'
            })
          ],
          submissions: [
            createSubmission({
              id: 'submission-withdrawn',
              teamId: 'team-withdrawn',
              status: 'withdrawn',
              projectName: 'Withdrawn Console'
            }),
            createSubmission({
              id: 'submission-disqualified',
              teamId: 'team-disqualified',
              status: 'disqualified',
              projectName: 'Disqualified Console'
            })
          ]
        }
      )
    )

    expect(filterAdminOperationalTeams(sortedTeams, {
      filter: 'out'
    }).map(team => team.team.id)).toEqual([
      'team-withdrawn',
      'team-disqualified'
    ])
  })

  test('limits admin interventions to the canonical lifecycle and submission states', () => {
    expect(getAdminSubmissionInterventionPolicy('submission_open', 'submitted')).toMatchObject({
      canAdminWithdraw: true,
      canDisqualify: false
    })

    expect(getAdminSubmissionInterventionPolicy('judging_preparation', 'submitted')).toMatchObject({
      canAdminWithdraw: true,
      canDisqualify: false
    })

    expect(getAdminSubmissionInterventionPolicy('blind_review', 'locked')).toMatchObject({
      canAdminWithdraw: false,
      canDisqualify: true
    })

    expect(getAdminSubmissionInterventionPolicy('registration_open', 'submitted')).toMatchObject({
      canAdminWithdraw: false,
      adminWithdrawReason: 'Admin withdrawal is available only until judging starts.'
    })
  })
})
