import { describe, expect, test } from 'vitest'

import { accountEventPageRoutePaths } from '../../../../../server/domains/events/account-event-page-contract'
import { accountEventOperationsPageSchema } from '../../../../../shared/domains/events/account-event-operations-page'
import { accountEventSubmissionsPageSchema } from '../../../../../shared/domains/events/account-event-submissions-page'
import {
  accountEventJudgingPageSchema,
  accountJudgeAssignmentWorkspacePageSchema,
  accountJudgeInboxPageSchema
} from '../../../../../shared/domains/events/account-event-judging-page'

describe('account event operations, submissions, and judging contracts', () => {
  test('names each read model and keeps the payload page-shaped', () => {
    expect(Object.keys(accountEventOperationsPageSchema.shape)).toEqual([
      'event',
      'roles',
      'assignments',
      'judgingSummary',
      'leaderboard',
      'teams',
      'prizes',
      'applications',
      'submissionSummary',
      'submissionMonitor',
      'shortlist',
      'finalDeliberation',
      'winners',
      'prizeRedemptions'
    ])
    expect(Object.keys(accountEventSubmissionsPageSchema.shape)).toEqual([
      'event',
      'teams',
      'applications',
      'submissionSummary',
      'submissionMonitor',
      'noSubmissionTeams'
    ])
    expect(Object.keys(accountEventJudgingPageSchema.shape)).toEqual([
      'event',
      'assignments',
      'criteria',
      'summary'
    ])
    expect(Object.keys(accountJudgeInboxPageSchema.shape)).toEqual([
      'groups',
      'assignmentCount',
      'inProgressCount'
    ])
    expect(Object.keys(accountJudgeAssignmentWorkspacePageSchema.shape)).toEqual([
      'event',
      'assignment',
      'criteria'
    ])
  })

  test('uses the canonical account route names without a graph or include parameter', () => {
    expect(accountEventPageRoutePaths.operations).toBe('/api/account/events/:slug/operations')
    expect(accountEventPageRoutePaths.submissions).toBe('/api/account/events/:slug/submissions')
    expect(accountEventPageRoutePaths.judging).toBe('/api/account/events/:slug/judging')

    expect(accountEventOperationsPageSchema.shape).not.toHaveProperty('include')
    expect(accountEventOperationsPageSchema.shape).not.toHaveProperty('resourceMap')
  })
})
