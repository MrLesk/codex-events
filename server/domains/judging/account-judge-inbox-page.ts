import type { H3Event } from 'h3'

import { and, eq, getTableColumns, or } from 'drizzle-orm'

import type { AccountJudgeInboxPage } from '#shared/domains/events/account-event-judging-page'
import { assertRegularPlatformAccess, getRequestActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { eventRoleAssignments, events, judgeAssignments } from '#server/database/schema'
import { serializeEvent } from '#server/domains/events'
import { getJudgeAssignmentDetails } from '#server/domains/judging'
import { getEventDisplayImageOptions } from '#server/domains/platform/settings'
import { assertGuard } from '#server/domains/lifecycle-guard'

const activeAssignmentWhere = or(
  eq(judgeAssignments.status, 'assigned'),
  eq(judgeAssignments.status, 'judge_started')
)

export async function loadAccountJudgeInboxPage(
  h3Event: H3Event
): Promise<AccountJudgeInboxPage> {
  const actor = await getRequestActor(h3Event)
  assertRegularPlatformAccess(actor)
  const database = getDatabase(h3Event)

  const [roleEvents, activeAssignments, imageOptions] = await Promise.all([
    database
      .select({ event: getTableColumns(events) })
      .from(eventRoleAssignments)
      .innerJoin(events, eq(events.id, eventRoleAssignments.eventId))
      .where(and(
        eq(eventRoleAssignments.userId, actor.platformUser.id),
        or(
          eq(eventRoleAssignments.role, 'judge'),
          and(
            eq(eventRoleAssignments.role, 'event_admin'),
            eq(eventRoleAssignments.isInJudgePool, true)
          )
        )
      )),
    database.query.judgeAssignments.findMany({
      where: and(
        eq(judgeAssignments.judgeUserId, actor.platformUser.id),
        activeAssignmentWhere
      )
    }),
    getEventDisplayImageOptions(database)
  ])

  assertGuard(roleEvents.length > 0 || actor.platformUser.isPlatformAdmin, {
    statusCode: 403,
    code: 'judge_dashboard_access_denied',
    message: 'This operation requires judge assignment access.'
  })

  const eventById = new Map(roleEvents.map(row => [row.event.id, row.event]))
  const details = await getJudgeAssignmentDetails(database, activeAssignments)
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
  } as unknown as AccountJudgeInboxPage
}
