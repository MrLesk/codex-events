import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { evaluationCriteria, judgeCriterionScores } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import { apiData } from '#server/http/api-response'
import {
  criterionParamsSchema,
  getEvaluationCriterionOrThrow,
  requireHackathonAdmin,
  serializeEvaluationCriterion
} from '#server/domains/hackathons'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, criterionId } = parseValidatedParams(event, criterionParamsSchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)
  const criterion = await getEvaluationCriterionOrThrow(database, hackathonId, criterionId)

  const existingScore = await database.query.judgeCriterionScores.findFirst({
    where: eq(judgeCriterionScores.evaluationCriterionId, criterionId)
  })

  if (existingScore) {
    throw new ApiError({
      statusCode: 409,
      code: 'evaluation_criterion_has_scores',
      message: 'This evaluation criterion cannot be deleted because judge scores already reference it.',
      details: {
        hackathonId,
        criterionId
      }
    })
  }

  await database
    .delete(evaluationCriteria)
    .where(eq(evaluationCriteria.id, criterionId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'evaluation_criterion',
    entityId: criterionId,
    action: 'evaluation_criterion.deleted',
    metadata: {
      hackathonId
    }
  })

  return apiData(serializeEvaluationCriterion(criterion))
})
