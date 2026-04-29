import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathons } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertHackathonTrackReplacementAllowed,
  assertHackathonSlugAvailable,
  buildHackathonUpdatePayload,
  listHackathonTracks,
  replaceHackathonTracks,
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon,
  updateHackathonBodySchema
} from '#server/domains/hackathons'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
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

  if (body.tracks) {
    await assertHackathonTrackReplacementAllowed(database, hackathonId, body.tracks)
  }

  const patch = buildHackathonUpdatePayload(hackathon, body)

  await database
    .update(hackathons)
    .set(patch)
    .where(eq(hackathons.id, hackathonId))

  if (body.tracks) {
    await replaceHackathonTracks(database, hackathonId, body.tracks)
  }

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
  const updatedTracks = await listHackathonTracks(database, hackathonId)

  return apiData(serializeHackathon(updatedHackathon!, undefined, updatedTracks))
})
