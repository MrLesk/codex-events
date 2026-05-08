import { asc, eq, getTableColumns } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { eventRoleAssignments, users } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  requireEventAdmin,
  routeIdParamsSchema,
  serializeEventRoleAssignment
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

type EventRoleAssignmentRecord = typeof eventRoleAssignments.$inferSelect
type UserRecord = typeof users.$inferSelect

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const database = getDatabase(h3Event)

  await requireEventAdmin(h3Event, eventId)

  const assignments = await database.query.eventRoleAssignments.findMany({
    where: eq(eventRoleAssignments.eventId, eventId),
    orderBy: [asc(eventRoleAssignments.createdAt)]
  })

  const relatedUsers = await database
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(eventRoleAssignments, eq(eventRoleAssignments.userId, users.id))
    .where(eq(eventRoleAssignments.eventId, eventId))
  const usersById = new Map<string, UserRecord>(
    relatedUsers.map((user: UserRecord) => [user.id, user])
  )

  return apiList(
    assignments.map((assignment: EventRoleAssignmentRecord) =>
      serializeEventRoleAssignment(assignment, usersById.get(assignment.userId) ?? null)
    ),
    {
      total: assignments.length
    }
  )
})
