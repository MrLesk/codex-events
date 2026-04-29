import { asc, eq } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { evaluationCriteria } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema, serializeEvaluationCriterion } from '#server/domains/hackathons'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)

  await getVisibleHackathonOrThrow(event, hackathonId)

  const criteria = await database.query.evaluationCriteria.findMany({
    where: eq(evaluationCriteria.hackathonId, hackathonId),
    orderBy: [asc(evaluationCriteria.displayOrder)]
  })

  return apiList(
    criteria.map(serializeEvaluationCriterion),
    {
      total: criteria.length
    }
  )
})
