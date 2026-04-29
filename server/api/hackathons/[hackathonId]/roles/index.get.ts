import { asc, eq, getTableColumns } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { hackathonRoleAssignments, users } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathonRoleAssignment
} from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/http/validation'

type HackathonRoleAssignmentRecord = typeof hackathonRoleAssignments.$inferSelect
type UserRecord = typeof users.$inferSelect

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)

  const assignments = await database.query.hackathonRoleAssignments.findMany({
    where: eq(hackathonRoleAssignments.hackathonId, hackathonId),
    orderBy: [asc(hackathonRoleAssignments.createdAt)]
  })

  const relatedUsers = await database
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(hackathonRoleAssignments, eq(hackathonRoleAssignments.userId, users.id))
    .where(eq(hackathonRoleAssignments.hackathonId, hackathonId))
  const usersById = new Map<string, UserRecord>(
    relatedUsers.map((user: UserRecord) => [user.id, user])
  )

  return apiList(
    assignments.map((assignment: HackathonRoleAssignmentRecord) =>
      serializeHackathonRoleAssignment(assignment, usersById.get(assignment.userId) ?? null)
    ),
    {
      total: assignments.length
    }
  )
})
