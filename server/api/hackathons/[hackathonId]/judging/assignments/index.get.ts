import { and, eq, inArray } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { resolveHackathonAuthorization } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { judgeAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { assertGuard } from '#server/domains/hackathons/lifecycle-guard'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '#server/domains/hackathons'
import {
  getJudgeAssignmentDetails,
  listActiveJudgeAssignmentSummaries,
  listJudgeAssignmentsQuerySchema
} from '#server/utils/judging'
import { parseValidatedParams, parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const query = parseValidatedQuery(event, listJudgeAssignmentsQuerySchema)
  const database = getDatabase(event)

  await getVisibleHackathonOrThrow(event, hackathonId)
  const authorization = await resolveHackathonAuthorization(event, hackathonId)
  const canViewAssignments = authorization.isPlatformAdmin
    || authorization.isHackathonAdmin
    || authorization.canReviewThroughAssignment

  assertGuard(canViewAssignments, {
    statusCode: 403,
    code: 'judge_assignment_access_denied',
    message: 'This operation requires judge assignment access.',
    details: {
      hackathonId
    }
  })

  if (authorization.isPlatformAdmin || authorization.isHackathonAdmin) {
    const result = await listActiveJudgeAssignmentSummaries(database, hackathonId, query)

    return apiList(result.data, {
      page: query.page,
      pageSize: query.page_size,
      total: result.total
    })
  }

  const assignments: Array<typeof judgeAssignments.$inferSelect> = await database.query.judgeAssignments.findMany({
    where: and(
      eq(judgeAssignments.hackathonId, hackathonId),
      eq(judgeAssignments.judgeUserId, actor.platformUser.id),
      inArray(judgeAssignments.status, ['assigned', 'judge_started'])
    )
  })

  const data = await getJudgeAssignmentDetails(database, assignments)

  return apiList(data, {
    total: data.length
  })
})
