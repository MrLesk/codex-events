import { readMultipartFormData } from 'h3'

import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import {
  updatePlatformAccountProfileIcon
} from '#server/domains/accounts'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertValidProfileIconPart,
  profileIconObjectKey,
  putProfileIconObject
} from '#server/domains/accounts/profile-icons'
import { assertAuthenticatedUploadRateLimit } from '#server/utils/rate-limit'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  await assertAuthenticatedUploadRateLimit(h3Event, `authenticated-upload:${actor.platformUser.id}`)
  const multipart = await readMultipartFormData(h3Event)
  const filePart = multipart?.find(part => part.name === 'file')
  const validFile = assertValidProfileIconPart(filePart ?? {})
  const objectKey = profileIconObjectKey(actor.platformUser.id)

  await putProfileIconObject(h3Event, objectKey, {
    contentType: validFile.contentType,
    data: validFile.data
  })

  const profileIconUpdatedAt = new Date().toISOString()
  const user = await updatePlatformAccountProfileIcon(
    getDatabase(h3Event),
    actor.platformUser.id,
    {
      profileIconUpdatedAt,
      profileIconObjectKey: objectKey
    }
  )

  return apiData({
    user
  })
})
