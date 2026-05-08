import { asc, eq } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { evaluationCriteria } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  assertCompetitionEvent,
  getPublicEventBySlugOrThrow,
  routeSlugParamsSchema,
  serializePublicEvaluationCriterion
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
  const database = getDatabase(h3Event)
  const event = await getPublicEventBySlugOrThrow(database, slug)
  assertCompetitionEvent(event)

  const criteria = await database.query.evaluationCriteria.findMany({
    where: eq(evaluationCriteria.eventId, event.id),
    orderBy: [asc(evaluationCriteria.displayOrder)]
  })

  return apiList(
    criteria.map(serializePublicEvaluationCriterion),
    {
      total: criteria.length
    }
  )
})
