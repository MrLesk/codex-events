import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { evaluationCriteria } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  assertEvaluationCriterionDisplayOrderAvailable,
  criterionParamsSchema,
  getEvaluationCriterionOrThrow,
  requireHackathonAdmin,
  serializeEvaluationCriterion,
  updateEvaluationCriterionBodySchema
} from '../../../../utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, criterionId } = parseValidatedParams(event, criterionParamsSchema)
  const body = await parseValidatedBody(event, updateEvaluationCriterionBodySchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)
  const criterion = await getEvaluationCriterionOrThrow(database, hackathonId, criterionId)

  if (body.displayOrder !== undefined && body.displayOrder !== criterion.displayOrder) {
    await assertEvaluationCriterionDisplayOrderAvailable(database, hackathonId, body.displayOrder, criterionId)
  }

  await database
    .update(evaluationCriteria)
    .set(body)
    .where(eq(evaluationCriteria.id, criterionId))

  const updatedCriterion = await getEvaluationCriterionOrThrow(database, hackathonId, criterionId)

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'evaluation_criterion',
    entityId: criterionId,
    action: 'evaluation_criterion.updated',
    metadata: {
      hackathonId,
      fields: Object.keys(body)
    }
  })

  return apiData(serializeEvaluationCriterion(updatedCriterion))
})
