import { and, eq, getTableColumns, or } from 'drizzle-orm'

import type { AccountJudgeInboxPage } from '#shared/domains/events/account-event-judging-page'
import { eventRoleAssignments, events, judgeAssignments } from '#server/database/schema'
import { serializeEvent } from '#server/domains/events'
import { getJudgeAssignmentDetails } from '#server/domains/judging'
import { getEventDisplayImageOptions } from '#server/domains/platform/settings'
import { assertGuard } from '#server/domains/lifecycle-guard'
import {
  defineAccountPageRoute,
  type AccountPageContext
} from '#server/domains/accounts/account-page-contract'
import { accountJudgeInboxPageSchema } from '#shared/domains/events/account-event-judging-page'

const activeAssignmentWhere = or(
  eq(judgeAssignments.status, 'assigned'),
  eq(judgeAssignments.status, 'judge_started')
)

export interface AccountJudgeInboxAuthorization {
  roleEvents: Array<{
    event: typeof events.$inferSelect
  }>
}

export async function authorizeAccountJudgeInbox(
  context: AccountPageContext
): Promise<AccountJudgeInboxAuthorization> {
  const roleEvents = await context.database
    .select({ event: getTableColumns(events) })
    .from(eventRoleAssignments)
    .innerJoin(events, eq(events.id, eventRoleAssignments.eventId))
    .where(and(
      eq(eventRoleAssignments.userId, context.actor.platformUser.id),
      or(
        eq(eventRoleAssignments.role, 'judge'),
        and(
          eq(eventRoleAssignments.role, 'event_admin'),
          eq(eventRoleAssignments.isInJudgePool, true)
        )
      )
    ))

  assertGuard(roleEvents.length > 0 || context.actor.platformUser.isPlatformAdmin, {
    statusCode: 403,
    code: 'judge_dashboard_access_denied',
    message: 'This operation requires judge assignment access.'
  })

  return { roleEvents }
}

export async function loadAccountJudgeInboxPage(
  context: AccountPageContext,
  authorization: AccountJudgeInboxAuthorization
): Promise<AccountJudgeInboxPage> {
  const [activeAssignments, imageOptions] = await Promise.all([
    context.database.query.judgeAssignments.findMany({
      where: and(
        eq(judgeAssignments.judgeUserId, context.actor.platformUser.id),
        activeAssignmentWhere
      )
    }),
    getEventDisplayImageOptions(context.database)
  ])

  const eventById = new Map(authorization.roleEvents.map(row => [row.event.id, row.event]))
  const details = await getJudgeAssignmentDetails(context.database, activeAssignments)
  const detailsByEventId = new Map<string, typeof details>()

  for (const detail of details) {
    const eventDetails = detailsByEventId.get(detail.eventId) ?? []
    eventDetails.push(detail)
    detailsByEventId.set(detail.eventId, eventDetails)
  }

  const groups = [...eventById.entries()].map(([eventId, event]) => ({
    event: serializeEvent(event, undefined, undefined, imageOptions),
    assignments: detailsByEventId.get(eventId) ?? []
  }))

  return {
    groups,
    assignmentCount: details.length,
    inProgressCount: details.filter(assignment => assignment.status === 'judge_started').length
  }
}

export const accountJudgeInboxPageRoute = defineAccountPageRoute({
  page: 'judging',
  schema: accountJudgeInboxPageSchema,
  authorize: authorizeAccountJudgeInbox,
  load: loadAccountJudgeInboxPage
})
