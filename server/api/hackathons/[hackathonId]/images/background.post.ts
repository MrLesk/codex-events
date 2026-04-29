import { readMultipartFormData } from 'h3'

import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { hackathons } from '#server/database/schema'
import { writeAuditLog } from '#server/database/audit-log'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertValidHackathonImagePart,
  buildPublicHackathonImageUrl,
  putHackathonImageObject
} from '#server/utils/hackathon-images'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '#server/domains/hackathons'
import { assertAuthenticatedUploadRateLimit } from '#server/utils/rate-limit'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  await assertAuthenticatedUploadRateLimit(event, `authenticated-upload:${actor.platformUser.id}`)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  const multipart = await readMultipartFormData(event)
  const filePart = multipart?.find(part => part.name === 'file')
  const validFile = assertValidHackathonImagePart(filePart ?? {})

  await putHackathonImageObject(event, hackathon.id, 'background', {
    contentType: validFile.contentType,
    data: validFile.data
  })

  const database = getDatabase(event)
  const updatedAt = new Date().toISOString()
  const backgroundImageUrl = buildPublicHackathonImageUrl(event, hackathon.slug, 'background')

  await database
    .update(hackathons)
    .set({
      backgroundImageUrl,
      updatedAt
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
