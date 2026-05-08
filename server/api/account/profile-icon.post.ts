import { readMultipartFormData } from 'h3'

import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import {
  updatePlatformAccountProfileIconTimestamp
} from '#server/domains/accounts'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertValidProfileIconPart,
  putProfileIconObject
} from '#server/domains/accounts/profile-icons'
import { assertAuthenticatedUploadRateLimit } from '#server/utils/rate-limit'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  await assertAuthenticatedUploadRateLimit(h3Event, `authenticated-upload:${actor.platformUser.id}`)
  const multipart = await readMultipartFormData(h3Event)
  const filePart = multipart?.find(part => part.name === 'file')
  const validFile = assertValidProfileIconPart(filePart ?? {})

  await putProfileIconObject(h3Event, actor.platformUser.id, {
    contentType: validFile.contentType,
    data: validFile.data
  })

  const profileIconUpdatedAt = new Date().toISOString()
  const user = await updatePlatformAccountProfileIconTimestamp(
    getDatabase(h3Event),
    actor.platformUser.id,
    profileIconUpdatedAt
  )

  return apiData({
    user
  })
})
