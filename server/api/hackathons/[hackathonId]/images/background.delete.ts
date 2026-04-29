import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathons } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { deleteHackathonImageObject } from '#server/utils/hackathon-images'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  const database = getDatabase(event)

  await deleteHackathonImageObject(event, hackathon.id, 'background')

  await database
    .update(hackathons)
    .set({
      backgroundImageUrl: null,
      updatedAt: new Date().toISOString()
    })
    .where(eq(hackathons.id, hackathon.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathon.id,
    action: 'hackathon.updated',
    metadata: {
      fields: ['backgroundImageUrl']
    }
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathon.id)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
