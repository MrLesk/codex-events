import { readMultipartFormData } from 'h3'

import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import {
  assertValidEventImagePart,
  buildPublicPlatformDefaultEventBackgroundImageUrl,
  putPlatformDefaultEventBackgroundImageObject
} from '#server/domains/events/images'
import {
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

  await putPlatformDefaultEventBackgroundImageObject(h3Event, {
    contentType: validFile.contentType,
    data: validFile.data
  })

  const settings = await setDefaultEventBackgroundImageUrl(
    getDatabase(h3Event),
    buildPublicPlatformDefaultEventBackgroundImageUrl(h3Event),
    actor.platformUser.id
  )

  return apiData(serializePlatformSettings(settings))
})
