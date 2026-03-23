import { asc, eq } from 'drizzle-orm'

import { getDatabase } from '../../../../../database/client'
import { evaluationCriteria } from '../../../../../database/schema'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiList } from '../../../../../utils/api-response'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema,
  serializePublicEvaluationCriterion
} from '../../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getPublicHackathonBySlugOrThrow(database, slug)

  const criteria = await database.query.evaluationCriteria.findMany({
    where: eq(evaluationCriteria.hackathonId, hackathon.id),
    orderBy: [asc(evaluationCriteria.displayOrder)]
  })

  return apiList(
    criteria.map(serializePublicEvaluationCriterion),
    {
      total: criteria.length
    }
  )
})
