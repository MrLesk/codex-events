import { describe, expect, test, vi } from 'vitest'

import type { SessionActor } from '../../../../../app/domains/accounts/session-actor'
import type { EventRecord } from '../../../../../app/domains/events/records'
import type { EvaluationCriterion } from '../../../../../app/domains/judging/criteria-config'
import type {
  JudgeAssignmentApiDetail,
  BlindJudgeAssignmentDetail,
  PitchJudgeAssignmentDetail
} from '../../../../../app/domains/judging/workspace'

import {
  buildCompletionCriterionScoresPayload,
  buildJudgeWorkspaceCacheKey,
  buildPitchReviewCompletionPayload,
  buildSavedCriterionScoresPayload,
  canAutoStartBlindReviewFromScoreSelection,
  canAutoStartPitchReviewFromVoteInput,
  canCompleteJudgeAssignment,
  canMarkJudgeAssignmentIneligible,
  canSkipJudgeAssignment,
  canStartJudgeAssignment,
  createCriterionScoreDrafts,
  createPitchScoreDraft,
  filterAssignmentsForActor,
  filterExplicitJudgeEvents,
  filterReviewableEvents,
  formatJudgeTimestamp,
  getJudgeActionErrorMessage,
  getJudgeAssignmentActionDisabledReason,
  getJudgeAssignmentInboxCardCopy,
  getJudgeEventDashboardCopy,
  getJudgeSubmissionPanelDisplay,
  getJudgeWorkspaceSubjectKey,
  hasIncompleteCriterionScores,
  hasIncompletePitchScore,
  listAllVisibleEvents,
  normalizeJudgeAssignmentDetail,
  sortJudgeAssignments
} from '../../../../../app/domains/judging/workspace'

function createEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'event-1',
    name: 'Codex Judges',
    slug: 'codex-judges',
    description: 'Judge workspace fixture.',
    agendaItems: [],
    backgroundImageUrl: null,
    bannerImageUrl: null,
    discordServerUrl: null,
    city: 'Vienna',
    country: 'Austria',
    address: 'Operngasse 20',
    registrationOpensAt: '2026-03-20T10:00:00.000Z',
    registrationClosesAt: '2026-03-22T10:00:00.000Z',
    submissionOpensAt: '2026-03-22T10:00:00.000Z',
    submissionClosesAt: '2026-03-24T10:00:00.000Z',
    state: 'blind_review',
    maxTeamMembers: 5,
    blindReviewCount: 1,
    pitchReviewEnabled: false,
    blindScoreWeightPercent: 70,
    pitchScoreWeightPercent: 30,
    shortlistFinalistCount: 10,
    pitchPresentationSubmissionIds: [],
    activePitchPresentationSubmissionId: null,
    pitchPresentationsCompletedAt: null,
    inPersonEvent: false,
    applicationXProfileVisible: true,
    applicationLinkedinProfileVisible: true,
    applicationGithubProfileVisible: true,
    applicationChatgptEmailVisible: false,
    applicationOpenaiOrgIdVisible: false,
    applicationLumaEmailVisible: false,
    applicationWhyThisEventVisible: true,
    applicationProofOfExecutionVisible: true,
    applicationTeamIntentVisible: true,
    applicationAiKnowledgeVisible: false,
    requireXProfile: false,
    requireLinkedinProfile: false,
    requireGithubProfile: true,
    requireChatgptEmail: false,
    requireOpenaiOrgId: false,
    requireLumaEmail: false,
    requireWhyThisEvent: false,
    requireProofOfExecution: false,
    requireTeamIntent: false,
    requireAiKnowledge: false,
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
    hasAcceptedCurrentPlatformDocuments: true,
    sessionUser: {
      sub: 'auth0|judge',
      email: 'judge@example.com',
      name: 'Judge'
    },
    platformUser: {
      id: 'judge-1',
      email: 'judge@example.com',
      displayName: 'Judge One',
      firstName: 'Judge',
      familyName: 'One',
      isPlatformAdmin: false,
      isEventOrganizer: false
    },
    isPlatformAdmin: false,
    isEventOrganizer: false,
    eventRoles: [{
      eventId: 'event-1',
      role: 'judge',
      isInJudgePool: true,
      isStaff: false,
      createdAt: '2026-03-01T00:00:00.000Z'
    }],
    ...overrides
  }
}

function createBlindAssignment(
  overrides: Partial<BlindJudgeAssignmentDetail> = {}
): BlindJudgeAssignmentDetail {
  return {
    id: 'assignment-blind-1',
    eventId: 'event-1',
    submissionId: 'submission-1',
    judgeUserId: 'judge-1',
    reviewStage: 'blind_review',
    blindReviewSlot: 1,
    status: 'assigned',
    assignedAt: '2026-03-24T10:00:00.000Z',
    startedAt: null,
    completedAt: null,
    skippedAt: null,
    skippedByUserId: null,
    skipReason: null,
    ineligibilityStatus: 'eligible',
    ineligibilityReason: null,
    ineligibilityMarkedAt: null,
    ineligibilityMarkedByUserId: null,
    createdAt: '2026-03-24T10:00:00.000Z',
    blindSubmission: {
      id: 'submission-1',
      projectName: 'Blind Build',
      summary: 'Anonymous summary',
      repositoryUrl: 'https://example.com/repo',
      demoUrl: 'https://example.com/demo',
      track: null,
      status: 'locked',
      submittedAt: '2026-03-23T10:00:00.000Z',
      lockedAt: '2026-03-24T10:00:00.000Z',
      applications: [{
        id: 'application-1',
        status: 'approved',
        submittedAt: '2026-03-21T10:00:00.000Z',
        reviewedAt: '2026-03-21T12:00:00.000Z',
        applicationTermsDocumentId: 'terms-1'
      }]
    },
    criterionScores: [],
    ...overrides
  }
}

function createPitchAssignment(
  overrides: Partial<PitchJudgeAssignmentDetail> = {}
): PitchJudgeAssignmentDetail {
  return {
    id: 'assignment-pitch-1',
    eventId: 'event-1',
    submissionId: 'submission-1',
    judgeUserId: 'judge-1',
    reviewStage: 'pitch_review',
    status: 'assigned',
    pitchScore: null,
    pitchComment: null,
    assignedAt: '2026-03-26T12:10:00.000Z',
    startedAt: null,
    completedAt: null,
    skippedAt: null,
    skippedByUserId: null,
    skipReason: null,
    ineligibilityStatus: 'eligible',
    ineligibilityReason: null,
    ineligibilityMarkedAt: null,
    ineligibilityMarkedByUserId: null,
    createdAt: '2026-03-26T12:10:00.000Z',
    pitchSubmission: {
      id: 'submission-1',
      projectName: 'Project One',
      teamName: 'Alpha Team',
      summary: 'Pitch summary',
      repositoryUrl: 'https://example.com/repo',
      demoUrl: 'https://example.com/demo',
      track: null,
      status: 'locked',
      submittedAt: '2026-03-23T10:00:00.000Z',
      lockedAt: '2026-03-24T10:00:00.000Z'
    },
    ...overrides
  }
}

function createCriterion(overrides: Partial<EvaluationCriterion> = {}): EvaluationCriterion {
  return {
    id: 'criterion-1',
    eventId: 'event-1',
    name: 'Novelty',
    description: 'How original the project is.',
    weight: 5,
    displayOrder: 1,
    createdAt: '2026-03-01T00:00:00.000Z',
    ...overrides
  }
}

describe('judging-workspace filters', () => {
  test('normalizes blind and pitch assignments into stage-specific detail variants', () => {
    const normalizedBlindAssignment = normalizeJudgeAssignmentDetail({
      ...createBlindAssignment(),
      pitchScore: null,
      pitchComment: null
    } satisfies JudgeAssignmentApiDetail)
    const normalizedPitchAssignment = normalizeJudgeAssignmentDetail({
      ...createPitchAssignment(),
      blindReviewSlot: null
    } satisfies JudgeAssignmentApiDetail)

    expect(normalizedBlindAssignment).toMatchObject({
      reviewStage: 'blind_review',
      blindReviewSlot: 1,
      blindSubmission: expect.objectContaining({
        id: 'submission-1'
      })
    })
    expect(normalizedBlindAssignment).not.toHaveProperty('pitchScore')
    expect(normalizedBlindAssignment).not.toHaveProperty('pitchComment')

    expect(normalizedPitchAssignment).toMatchObject({
      reviewStage: 'pitch_review',
      pitchScore: null,
      pitchComment: null,
      pitchSubmission: expect.objectContaining({
        teamName: 'Alpha Team'
      })
    })
    expect(normalizedPitchAssignment).not.toHaveProperty('blindReviewSlot')
  })

  test('formats judge timestamps with the shared operational timestamp style', () => {
    const value = '2026-03-24T10:00:00.000Z'

    expect(formatJudgeTimestamp(value)).toBe(new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value)))

    expect(formatJudgeTimestamp(null)).toBe('Not recorded')
  })

  test('limits reviewable events to judge-enabled roles for non-platform admins', () => {
    const actor = createActor({
      eventRoles: [
        {
          eventId: 'event-1',
          role: 'judge',
          isInJudgePool: true,
          isStaff: false,
          createdAt: '2026-03-01T00:00:00.000Z'
        },
        {
          eventId: 'event-2',
          role: 'event_admin',
          isInJudgePool: true,
          isStaff: false,
          createdAt: '2026-03-01T00:00:00.000Z'
        }
      ]
    })
    const events = [
      createEvent({ id: 'event-1' }),
      createEvent({ id: 'event-2', slug: 'admin-event', name: 'Admin Event' }),
      createEvent({ id: 'event-3', slug: 'hidden-event', name: 'Hidden Event' })
    ]

    expect(filterReviewableEvents(events, actor).map(event => event.id)).toEqual([
      'event-1',
      'event-2'
    ])
  })

  test('includes judge-enabled admin assignments in the judging workspace', () => {
    const actor = createActor({
      eventRoles: [
        {
          eventId: 'event-1',
          role: 'judge',
          isInJudgePool: true,
          isStaff: false,
          createdAt: '2026-03-01T00:00:00.000Z'
        },
        {
          eventId: 'event-2',
          role: 'event_admin',
          isInJudgePool: true,
          isStaff: true,
          createdAt: '2026-03-01T00:00:00.000Z'
        }
      ]
    })
    const events = [
      createEvent({ id: 'event-1' }),
      createEvent({ id: 'event-2', slug: 'admin-event', name: 'Admin Event' })
    ]

    expect(filterExplicitJudgeEvents(events, actor).map(event => event.id)).toEqual([
      'event-1',
      'event-2'
    ])
  })

  test('filters assignment lists to the current actor even when other assignments are visible upstream', () => {
    const actor = createActor()
    const assignments = [
      createBlindAssignment({ id: 'assignment-1', judgeUserId: 'judge-1' }),
      createPitchAssignment({ id: 'assignment-2', judgeUserId: 'judge-2' })
    ]

    expect(filterAssignmentsForActor(assignments, actor).map(assignment => assignment.id)).toEqual(['assignment-1'])
  })

  test('loads every visible event page before the inbox filters reviewable roles', async () => {
    const fetchPage = vi.fn(async (page: number, pageSize: number) => {
      expect(pageSize).toBe(2)

      if (page === 1) {
        return {
          data: [
            createEvent({ id: 'event-1' }),
            createEvent({ id: 'event-2', slug: 'event-2', name: 'Event 2' })
          ],
          meta: {
            total: 3
          }
        }
      }

      return {
        data: [
          createEvent({ id: 'event-3', slug: 'event-3', name: 'Event 3' })
        ],
        meta: {
          total: 3
        }
      }
    })

    await expect(listAllVisibleEvents(fetchPage, 2)).resolves.toEqual([
      expect.objectContaining({ id: 'event-1' }),
      expect.objectContaining({ id: 'event-2' }),
      expect.objectContaining({ id: 'event-3' })
    ])
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1, 2)
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 2)
  })
})

describe('judging-workspace copy', () => {
  test('keeps blind inbox card copy anonymized', () => {
    const copy = getJudgeAssignmentInboxCardCopy(createBlindAssignment())

    expect(copy).toMatchObject({
      title: 'Blind Build',
      subtitle: null,
      summary: 'Anonymous summary',
      contextLabel: 'Blind context',
      contextValue: '1 anonymized application',
      reviewSignal: 'Ready to start',
      openLabel: 'Open blind review'
    })
    expect(JSON.stringify(copy)).not.toContain('Alpha Team')
  })

  test('reveals project and team identity in pitch inbox card copy', () => {
    const copy = getJudgeAssignmentInboxCardCopy(createPitchAssignment())

    expect(copy).toMatchObject({
      title: 'Project One',
      subtitle: 'Alpha Team',
      summary: 'Pitch summary',
      contextLabel: 'Team',
      contextValue: 'Alpha Team',
      reviewSignal: 'Ready to vote',
      openLabel: 'Open pitch review'
    })
  })

  test('normalizes blind submission panel display without revealing team identity', () => {
    const display = getJudgeSubmissionPanelDisplay(createBlindAssignment({
      blindSubmission: {
        ...createBlindAssignment().blindSubmission,
        projectName: null,
        summary: '',
        track: {
          id: 'track-1',
          name: 'Infrastructure',
          description: 'Tools for event teams.'
        }
      }
    }))

    expect(display).toEqual({
      overline: 'Blind review assignment',
      title: 'Untitled submission',
      bodyTestId: 'judge-blind-submission',
      summary: 'No project summary is available for this submission yet.',
      repositoryUrl: 'https://example.com/repo',
      demoUrl: 'https://example.com/demo',
      status: 'assigned',
      ineligibilityStatus: 'eligible',
      detailCards: [{
        label: 'Track',
        title: 'Infrastructure',
        markdownDescription: 'Tools for event teams.'
      }]
    })
    expect(JSON.stringify(display)).not.toContain('Alpha Team')
  })

  test('normalizes pitch submission panel display with team and track context', () => {
    const display = getJudgeSubmissionPanelDisplay(createPitchAssignment({
      status: 'judge_started',
      pitchSubmission: {
        ...createPitchAssignment().pitchSubmission,
        projectName: null,
        summary: '',
        track: {
          id: 'track-1',
          name: 'Infrastructure',
          description: 'Tools for event teams.'
        }
      }
    }))

    expect(display).toEqual({
      overline: 'Pitch review finalist',
      title: 'Untitled pitch finalist',
      bodyTestId: 'judge-pitch-submission',
      summary: 'No project summary is available for this finalist yet.',
      repositoryUrl: 'https://example.com/repo',
      demoUrl: 'https://example.com/demo',
      status: 'judge_started',
      ineligibilityStatus: 'eligible',
      detailCards: [
        {
          label: 'Team',
          title: 'Alpha Team',
          markdownDescription: null
        },
        {
          label: 'Track',
          title: 'Infrastructure',
          markdownDescription: 'Tools for event teams.'
        }
      ]
    })
  })

  test('describes active blind queues without using idle queue copy', () => {
    const copy = getJudgeEventDashboardCopy(createEvent(), {
      total: 2,
      inReview: 2,
      ready: 0,
      ineligible: 0,
      blind: 2,
      pitch: 0
    })

    expect(copy).toMatchObject({
      description: '2 blind assignments are active in your blind-review queue, including 2 currently in progress.',
      actionLabel: 'Open blind review',
      overline: '2 active blind assignments',
      queueMeta: 'All active blind reviews are in progress'
    })
  })

  test('uses finalist-facing dashboard copy when pitch review is the next judge stage', () => {
    const copy = getJudgeEventDashboardCopy(createEvent({
      state: 'shortlist',
      pitchReviewEnabled: true
    }))

    expect(copy).toMatchObject({
      description: 'You are assigned as a judge for this event. Finalist pitch votes will appear here when pitch review is active.',
      actionLabel: 'Open event',
      overline: 'Judge assigned',
      queueMeta: 'No active pitch queue yet'
    })
  })

  test('explains that judges are waiting for post-pitch review assignments during the live pitch stage', () => {
    const copy = getJudgeEventDashboardCopy(createEvent({
      state: 'pitch',
      blindReviewCount: 0,
      pitchReviewEnabled: true
    }))

    expect(copy).toMatchObject({
      description: 'Finalist teams are pitching live. Post-pitch review assignments will appear here after admins start pitch review.',
      actionLabel: 'Open event',
      overline: 'Judge assigned',
      queueMeta: 'No active pitch queue yet'
    })
  })
})

describe('judging-workspace actions', () => {
  test('matches canonical judge action guards by stage', () => {
    const blindAssigned = createBlindAssignment({ status: 'assigned' })
    const blindStarted = createBlindAssignment({
      status: 'judge_started',
      startedAt: '2026-03-24T10:10:00.000Z'
    })
    const blindCompleted = createBlindAssignment({
      status: 'judge_completed',
      completedAt: '2026-03-24T10:20:00.000Z'
    })
    const pitchCompleted = createPitchAssignment({
      status: 'judge_completed',
      completedAt: '2026-03-26T12:20:00.000Z',
      pitchScore: 5
    })

    expect(canStartJudgeAssignment(blindAssigned)).toBe(true)
    expect(canCompleteJudgeAssignment(blindAssigned)).toBe(false)
    expect(canSkipJudgeAssignment(blindAssigned)).toBe(true)
    expect(canMarkJudgeAssignmentIneligible(blindAssigned)).toBe(false)

    expect(canStartJudgeAssignment(blindStarted)).toBe(false)
    expect(canCompleteJudgeAssignment(blindStarted)).toBe(true)
    expect(canSkipJudgeAssignment(blindStarted)).toBe(true)
    expect(canMarkJudgeAssignmentIneligible(blindStarted)).toBe(true)

    expect(canCompleteJudgeAssignment(blindCompleted)).toBe(false)
    expect(canSkipJudgeAssignment(blindCompleted)).toBe(false)
    expect(canMarkJudgeAssignmentIneligible(blindCompleted)).toBe(true)
    expect(canMarkJudgeAssignmentIneligible({
      ...blindCompleted,
      ineligibilityStatus: 'ineligible'
    })).toBe(false)
    expect(canMarkJudgeAssignmentIneligible(pitchCompleted)).toBe(false)
  })

  test('disables blind review start and skip actions until blind review begins', () => {
    expect(getJudgeAssignmentActionDisabledReason(
      createBlindAssignment(),
      'judging_preparation'
    )).toBe('Start and skip actions are available only during blind review. Current state: Judging Preparation.')
    expect(getJudgeAssignmentActionDisabledReason(
      createBlindAssignment(),
      'blind_review'
    )).toBeNull()
    expect(getJudgeAssignmentActionDisabledReason(
      createPitchAssignment(),
      'judging_preparation'
    )).toBeNull()
  })

  test('allows the first blind-review score to auto-start only in blind review', () => {
    expect(canAutoStartBlindReviewFromScoreSelection(
      createBlindAssignment(),
      'blind_review'
    )).toBe(true)
    expect(canAutoStartBlindReviewFromScoreSelection(
      createBlindAssignment(),
      'judging_preparation'
    )).toBe(false)
    expect(canAutoStartBlindReviewFromScoreSelection(
      createBlindAssignment({ status: 'judge_started' }),
      'blind_review'
    )).toBe(false)
    expect(canAutoStartBlindReviewFromScoreSelection(
      createPitchAssignment(),
      'pitch_review'
    )).toBe(false)
  })

  test('allows the first pitch vote input to auto-start only during pitch review', () => {
    expect(canAutoStartPitchReviewFromVoteInput(
      createPitchAssignment(),
      'pitch_review'
    )).toBe(true)
    expect(canAutoStartPitchReviewFromVoteInput(
      createPitchAssignment(),
      'pitch'
    )).toBe(false)
    expect(canAutoStartPitchReviewFromVoteInput(
      createPitchAssignment({ status: 'judge_started' }),
      'pitch_review'
    )).toBe(false)
    expect(canAutoStartPitchReviewFromVoteInput(
      createBlindAssignment(),
      'pitch_review'
    )).toBe(false)
  })

  test('uses canonical API messages for judge action failures', () => {
    expect(getJudgeActionErrorMessage({
      response: {
        _data: {
          error: {
            code: 'event_state_invalid',
            message: 'This judging operation is not allowed in the current event state.'
          }
        }
      }
    })).toBe('This judging operation is not allowed in the current event state.')
    expect(getJudgeActionErrorMessage(null)).toBe('The judge action could not be completed.')
  })

  test('sorts in-progress reviews ahead of newly assigned work across stages', () => {
    const assignments = [
      createBlindAssignment({ id: 'assignment-2', status: 'assigned', assignedAt: '2026-03-24T11:00:00.000Z' }),
      createPitchAssignment({ id: 'assignment-1', status: 'judge_started', startedAt: '2026-03-24T10:30:00.000Z' }),
      createBlindAssignment({ id: 'assignment-3', status: 'assigned', assignedAt: '2026-03-24T09:00:00.000Z' })
    ]

    expect(sortJudgeAssignments(assignments).map(assignment => assignment.id)).toEqual([
      'assignment-1',
      'assignment-3',
      'assignment-2'
    ])
  })
})

describe('judging-workspace scoring drafts', () => {
  test('creates blind score drafts from criteria and existing saved scores', () => {
    const criteria = [
      createCriterion({ id: 'criterion-1', name: 'Novelty', weight: 5 }),
      createCriterion({ id: 'criterion-2', name: 'Execution', weight: 3, displayOrder: 2 })
    ]
    const assignment = createBlindAssignment({
      criterionScores: [{
        id: 'score-1',
        evaluationCriterionId: 'criterion-2',
        criterionName: 'Execution',
        criterionDescription: 'How well the team executed.',
        criterionWeight: 3,
        score: 5,
        comment: 'Strong finish',
        createdAt: '2026-03-24T10:20:00.000Z',
        updatedAt: '2026-03-24T10:20:00.000Z'
      }]
    })

    expect(createCriterionScoreDrafts(criteria, assignment)).toEqual([
      expect.objectContaining({
        evaluationCriterionId: 'criterion-1',
        score: '',
        comment: ''
      }),
      expect.objectContaining({
        evaluationCriterionId: 'criterion-2',
        score: '5',
        comment: 'Strong finish'
      })
    ])
  })

  test('ignores pitch assignments when building blind rubric drafts', () => {
    const criteria = [
      createCriterion({ id: 'criterion-1' })
    ]

    expect(createCriterionScoreDrafts(criteria, createPitchAssignment())).toEqual([
      expect.objectContaining({
        evaluationCriterionId: 'criterion-1',
        score: '',
        comment: ''
      })
    ])
  })

  test('detects incomplete blind scores on the shared 1-5 scale and builds the completion payload', () => {
    const drafts = [
      {
        evaluationCriterionId: 'criterion-1',
        criterionName: 'Novelty',
        criterionDescription: 'How original the project is.',
        criterionWeight: 5,
        score: '4',
        comment: 'Fresh idea'
      },
      {
        evaluationCriterionId: 'criterion-2',
        criterionName: 'Execution',
        criterionDescription: 'How well the project is executed.',
        criterionWeight: 3,
        score: '6',
        comment: ''
      }
    ]

    expect(hasIncompleteCriterionScores(drafts)).toBe(true)
    expect(hasIncompleteCriterionScores([
      {
        ...drafts[0]
      },
      {
        ...drafts[1],
        score: '5'
      }
    ])).toBe(false)
    expect(buildCompletionCriterionScoresPayload([
      {
        ...drafts[0]
      },
      {
        ...drafts[1],
        score: '5'
      }
    ])).toEqual([
      {
        evaluationCriterionId: 'criterion-1',
        score: 4,
        comment: 'Fresh idea'
      },
      {
        evaluationCriterionId: 'criterion-2',
        score: 5,
        comment: undefined
      }
    ])

    expect(buildSavedCriterionScoresPayload([
      {
        ...drafts[0]
      },
      {
        ...drafts[1],
        score: '5'
      },
      {
        evaluationCriterionId: 'criterion-3',
        criterionName: 'Presentation',
        criterionDescription: 'How clearly the project is presented.',
        criterionWeight: 2,
        score: '',
        comment: 'Still deciding'
      }
    ])).toEqual([
      {
        evaluationCriterionId: 'criterion-1',
        score: 4,
        comment: 'Fresh idea'
      },
      {
        evaluationCriterionId: 'criterion-2',
        score: 5,
        comment: undefined
      }
    ])
  })

  test('creates pitch drafts and pitch completion payloads on the shared 1-5 scale', () => {
    expect(createPitchScoreDraft(createPitchAssignment({
      pitchScore: 5,
      pitchComment: 'Strong pitch'
    }))).toEqual({
      score: '5',
      comment: 'Strong pitch'
    })

    expect(hasIncompletePitchScore({
      score: '6',
      comment: ''
    })).toBe(true)

    expect(hasIncompletePitchScore({
      score: '4',
      comment: 'Clear delivery'
    })).toBe(false)

    expect(buildPitchReviewCompletionPayload({
      score: '4',
      comment: '  Clear delivery  '
    })).toEqual({
      pitchScore: 4,
      pitchComment: 'Clear delivery'
    })
  })
})

describe('judging-workspace cache keys', () => {
  test('normalizes subjects and cache key parts', () => {
    expect(getJudgeWorkspaceSubjectKey('  auth0|judge  ')).toBe('auth0|judge')
    expect(getJudgeWorkspaceSubjectKey('')).toBe('anonymous')
    expect(buildJudgeWorkspaceCacheKey('judge-workspace', 'auth0|judge', 'event-1')).toBe(
      'judge-workspace:auth0|judge:event-1'
    )
  })
})
