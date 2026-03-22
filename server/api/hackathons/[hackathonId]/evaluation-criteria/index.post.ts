import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { evaluationCriteria } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  assertEvaluationCriterionDisplayOrderAvailable,
  createEvaluationCriterionBodySchema,
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeEvaluationCriterion
} from '../../../../utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, createEvaluationCriterionBodySchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)
  await assertEvaluationCriterionDisplayOrderAvailable(database, hackathonId, body.displayOrder)

  const criterionId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await database.insert(evaluationCriteria).values({
    id: criterionId,
    hackathonId,
    name: body.name,
    description: body.description,
    weight: body.weight,
    displayOrder: body.displayOrder,
    createdAt
  })

  const criterion = await database.query.evaluationCriteria.findFirst({
    where: eq(evaluationCriteria.id, criterionId)
  })

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'evaluation_criterion',
    entityId: criterionId,
    action: 'evaluation_criterion.created',
    metadata: {
      hackathonId,
      displayOrder: body.displayOrder
    }
  })

  return apiData(serializeEvaluationCriterion(criterion!))
})
