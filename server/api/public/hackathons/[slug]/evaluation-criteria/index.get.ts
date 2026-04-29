import { asc, eq } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { evaluationCriteria } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema,
  serializePublicEvaluationCriterion
} from '#server/domains/hackathons'
import { parseValidatedParams } from '#server/http/validation'

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
