import { asc, eq } from 'drizzle-orm'

import { getDatabase } from '../../../../database/client'
import { evaluationCriteria } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiList } from '../../../../utils/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema, serializeEvaluationCriterion } from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

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
