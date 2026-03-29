import { asc, eq, inArray } from 'drizzle-orm'

import { getDatabase } from '../../../../database/client'
import { hackathonRoleAssignments, users } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiList } from '../../../../utils/api-response'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathonRoleAssignment
} from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

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

  const relatedUsers = assignments.length > 0
    ? await database.query.users.findMany({
        where: inArray(users.id, assignments.map((assignment: HackathonRoleAssignmentRecord) => assignment.userId))
      })
    : []
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
