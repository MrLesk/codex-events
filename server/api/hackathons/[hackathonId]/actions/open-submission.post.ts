import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathons } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  assertOpenSubmissionAllowed,
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)

  assertOpenSubmissionAllowed(hackathon)

  const updatedAt = new Date().toISOString()

  await database
    .update(hackathons)
    .set({
      state: 'submission_open',
      updatedAt
    })
    .where(eq(hackathons.id, hackathonId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.open_submission',
    metadata: {
      previousState: hackathon.state,
      nextState: 'submission_open'
    }
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
