import { and, asc, eq, or } from 'drizzle-orm'

import type {
  AccountEventJudgingPage,
  AccountJudgeAssignmentWorkspacePage
} from '#shared/domains/events/account-event-judging-page'
import {
  assertCompetitionEvent,
  getCurrentEventTerms,
  listEventTracks,
  serializeEvent,
  serializeEvaluationCriterion
} from '#server/domains/events'
import { assertJudgeAssignmentAccess } from '#server/auth/authorization'
import { evaluationCriteria, judgeAssignments } from '#server/database/schema'
import { assertGuard } from '#server/domains/lifecycle-guard'
import { getEventDisplayImageOptions } from '#server/domains/platform/settings'
import {
  getJudgeAssignmentDetail,
  getJudgeAssignmentDetails,
  getJudgingAssignmentSummary,
  listActiveJudgeAssignmentSummaries
} from '#server/domains/judging'
import type { AccountEventPageContext } from './account-event-page-context'
import {
  defineAccountEventPageRoute,
  defineAccountJudgeAssignmentPageRoute,
  type AccountJudgeAssignmentPageContext
} from './account-event-page-contract'
import {
  accountEventJudgingPageSchema,
  accountJudgeAssignmentWorkspacePageSchema
} from '#shared/domains/events/account-event-judging-page'

const activeAssignmentWhere = or(
  eq(judgeAssignments.status, 'assigned'),
  eq(judgeAssignments.status, 'judge_started')
)

export function assertAccountEventJudgingAccess(context: AccountEventPageContext) {
  assertCompetitionEvent(context.event)
  assertGuard(
    context.authorization.isPlatformAdmin
    || context.authorization.isEventAdmin
    || context.authorization.canReviewThroughAssignment,
    {
      statusCode: 403,
      code: 'judge_assignment_access_denied',
      message: 'This operation requires judge assignment access.',
      details: { eventId: context.event.id }
    }
  )
}

export const accountEventJudgingPageRoute = defineAccountEventPageRoute({
  page: 'judging',
  schema: accountEventJudgingPageSchema,
  authorize: assertAccountEventJudgingAccess,
  load: loadAccountEventJudgingPage
})

async function loadEventCriteria(context: AccountEventPageContext) {
  const criteria = await context.database.query.evaluationCriteria.findMany({
    where: eq(evaluationCriteria.eventId, context.event.id),
    orderBy: [asc(evaluationCriteria.displayOrder)]
  })

  return criteria.map(serializeEvaluationCriterion)
}

export async function loadAccountEventJudgingPage(
  context: AccountEventPageContext
): Promise<AccountEventJudgingPage> {
  const [tracks, currentTerms, imageOptions, summary, criteria] = await Promise.all([
    listEventTracks(context.database, context.event.id),
    getCurrentEventTerms(context.database, context.event),
    getEventDisplayImageOptions(context.database),
    getJudgingAssignmentSummary(context.database, context.event),
    context.authorization.canReviewThroughAssignment
      ? loadEventCriteria(context)
      : Promise.resolve([])
  ])

  const assignments = context.authorization.canReviewThroughAssignment
    ? await getJudgeAssignmentDetails(
        context.database,
        await context.database.query.judgeAssignments.findMany({
          where: and(
            eq(judgeAssignments.eventId, context.event.id),
            eq(judgeAssignments.judgeUserId, context.actor.platformUser.id),
            activeAssignmentWhere
          )
        })
      )
    : (await listActiveJudgeAssignmentSummaries(
        context.database,
        context.event.id,
        { page: 1, page_size: 100 }
      )).data

  return {
    event: serializeEvent(context.event, currentTerms, tracks, imageOptions),
    assignments,
    criteria,
    summary
  }
}

export function assertAccountJudgeAssignmentPageAccess(
  context: AccountJudgeAssignmentPageContext
) {
  assertCompetitionEvent(context.event)
  assertGuard(context.assignmentAuthorization.eventId === context.event.id, {
    statusCode: 404,
    code: 'judge_assignment_not_found',
    message: 'The requested judge assignment was not found for this event.',
    details: {
      assignmentId: context.assignmentAuthorization.assignmentId,
      eventId: context.event.id
    }
  })
  assertJudgeAssignmentAccess(context.assignmentAuthorization)
}

export async function loadAccountJudgeAssignmentWorkspacePage(
  context: AccountJudgeAssignmentPageContext,
  assignmentId: string
): Promise<AccountJudgeAssignmentWorkspacePage> {
  assertCompetitionEvent(context.event)
  const assignment = context.assignmentAuthorization.assignment

  assertGuard(assignment.id === assignmentId && assignment.eventId === context.event.id, {
    statusCode: 404,
    code: 'judge_assignment_not_found',
    message: 'The requested judge assignment was not found for this event.',
    details: { assignmentId, eventId: context.event.id }
  })
  const [tracks, currentTerms, imageOptions, criteria] = await Promise.all([
    listEventTracks(context.database, context.event.id),
    getCurrentEventTerms(context.database, context.event),
    getEventDisplayImageOptions(context.database),
    assignment.reviewStage === 'blind_review'
      ? loadEventCriteria(context)
      : Promise.resolve([])
  ])

  return {
    event: serializeEvent(context.event, currentTerms, tracks, imageOptions),
    assignment: await getJudgeAssignmentDetail(context.database, assignment),
    criteria
  }
}

export const accountJudgeAssignmentWorkspacePageRoute = defineAccountJudgeAssignmentPageRoute({
  schema: accountJudgeAssignmentWorkspacePageSchema,
  authorize: assertAccountJudgeAssignmentPageAccess,
  load: loadAccountJudgeAssignmentWorkspacePage
})
