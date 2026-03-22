import { and, eq, inArray } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../auth/actor'
import { resolveHackathonAuthorization } from '../../../../../auth/authorization'
import { getDatabase } from '../../../../../database/client'
import { judgeAssignments } from '../../../../../database/schema'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiList } from '../../../../../utils/api-response'
import { assertGuard } from '../../../../../utils/lifecycle-guard'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '../../../../../utils/hackathon-management'
import { getBlindAssignmentDetail } from '../../../../../utils/judging'
import { parseValidatedParams } from '../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)

  await getVisibleHackathonOrThrow(event, hackathonId)
  const authorization = await resolveHackathonAuthorization(event, hackathonId)

  assertGuard(authorization.canReviewThroughAssignment, {
    statusCode: 403,
    code: 'judge_assignment_access_denied',
    message: 'This operation requires judge assignment access.',
    details: {
      hackathonId
    }
  })

  const assignments: Array<typeof judgeAssignments.$inferSelect> = await database.query.judgeAssignments.findMany({
    where: authorization.isHackathonAdmin
      ? and(
          eq(judgeAssignments.hackathonId, hackathonId),
          inArray(judgeAssignments.status, ['assigned', 'judge_started'])
        )
      : and(
          eq(judgeAssignments.hackathonId, hackathonId),
          eq(judgeAssignments.judgeUserId, actor.platformUser.id),
          inArray(judgeAssignments.status, ['assigned', 'judge_started'])
        )
  })

  const data = await Promise.all(assignments.map(assignment => getBlindAssignmentDetail(database, assignment)))

  return apiList(data, {
    total: data.length
  })
})
