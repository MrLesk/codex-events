import { readMultipartFormData } from 'h3'

import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { hackathons } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  assertValidHackathonImagePart,
  buildPublicHackathonImageUrl,
  putHackathonImageObject
} from '../../../../utils/hackathon-images'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '../../../../utils/hackathon-management'
import { assertAuthenticatedUploadRateLimit } from '../../../../utils/rate-limit'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  await assertAuthenticatedUploadRateLimit(event, `authenticated-upload:${actor.platformUser.id}`)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  const multipart = await readMultipartFormData(event)
  const filePart = multipart?.find(part => part.name === 'file')
  const validFile = assertValidHackathonImagePart(filePart ?? {})

  await putHackathonImageObject(event, hackathon.id, 'banner', {
    contentType: validFile.contentType,
    data: validFile.data
  })

  const database = getDatabase(event)
  const updatedAt = new Date().toISOString()
  const bannerImageUrl = buildPublicHackathonImageUrl(event, hackathon.slug, 'banner')

  await database
    .update(hackathons)
    .set({
      bannerImageUrl,
      updatedAt
    })
    .where(eq(hackathons.id, hackathon.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathon.id,
    action: 'hackathon.updated',
    metadata: {
      fields: ['bannerImageUrl']
    }
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathon.id)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
