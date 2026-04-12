import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { evaluationCriteria, judgeCriterionScores } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { ApiError } from '../../../../utils/api-error'
import { apiData } from '../../../../utils/api-response'
import {
  criterionParamsSchema,
  getEvaluationCriterionOrThrow,
  requireHackathonAdmin,
  serializeEvaluationCriterion
} from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

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
