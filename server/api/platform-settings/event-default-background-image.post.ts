import { readMultipartFormData } from 'h3'

import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import {
  assertValidEventImagePart,
  buildPublicPlatformDefaultEventBackgroundImageUrl,
  deletePlatformDefaultEventBackgroundImageObjectBestEffort,
  platformDefaultEventBackgroundImageObjectKey,
  putPlatformDefaultEventBackgroundImageObject
} from '#server/domains/events/images'
import {
  getPlatformSettings,
  serializePlatformSettings,
  setDefaultEventBackgroundImageUrl
} from '#server/domains/platform/settings'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { assertAuthenticatedUploadRateLimit } from '#server/utils/rate-limit'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  assertPlatformAdminAccess(actor)
  await assertAuthenticatedUploadRateLimit(h3Event, `authenticated-upload:${actor.platformUser.id}`)

  const multipart = await readMultipartFormData(h3Event)
  const filePart = multipart?.find(part => part.name === 'file')
  const validFile = assertValidEventImagePart(filePart ?? {})
  const objectKey = platformDefaultEventBackgroundImageObjectKey()
  const database = getDatabase(h3Event)
  const existingSettings = await getPlatformSettings(database)

  await putPlatformDefaultEventBackgroundImageObject(h3Event, objectKey, {
    contentType: validFile.contentType,
    data: validFile.data
  })

  const settings = await setDefaultEventBackgroundImageUrl(
    database,
    buildPublicPlatformDefaultEventBackgroundImageUrl(h3Event),
    objectKey,
    actor.platformUser.id,
    {
      revision: existingSettings?.defaultEventBackgroundImageRevision ?? 0,
      objectKey: existingSettings?.defaultEventBackgroundImageObjectKey ?? null
    }
  )

  if (existingSettings?.defaultEventBackgroundImageObjectKey) {
    await deletePlatformDefaultEventBackgroundImageObjectBestEffort(
      h3Event,
      existingSettings.defaultEventBackgroundImageObjectKey
    )
  }

  return apiData(serializePlatformSettings(settings))
})
