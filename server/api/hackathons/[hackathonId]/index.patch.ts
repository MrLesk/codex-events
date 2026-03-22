import { requirePlatformActor } from '../../../auth/actor'
import { writeAuditLog } from '../../../database/audit-log'
import { getDatabase } from '../../../database/client'
import { hackathons } from '../../../database/schema'
import { defineApiHandler } from '../../../utils/api-handler'
import { apiData } from '../../../utils/api-response'
import {
  assertHackathonSlugAvailable,
  buildHackathonUpdatePayload,
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon,
  updateHackathonBodySchema
} from '../../../utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '../../../utils/validation'
import { eq } from 'drizzle-orm'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, updateHackathonBodySchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)

  if (body.slug && body.slug !== hackathon.slug) {
    await assertHackathonSlugAvailable(database, body.slug, hackathon.id)
  }

  const patch = buildHackathonUpdatePayload(hackathon, body)

  await database
    .update(hackathons)
    .set(patch)
    .where(eq(hackathons.id, hackathonId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.updated',
    metadata: {
      fields: Object.keys(body)
    }
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
