import { readMultipartFormData } from 'h3'

import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import {
  updatePlatformAccountProfileIconTimestamp
} from '#server/utils/account-management'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertValidProfileIconPart,
  putProfileIconObject
} from '#server/utils/profile-icons'
import { assertAuthenticatedUploadRateLimit } from '#server/utils/rate-limit'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  await assertAuthenticatedUploadRateLimit(event, `authenticated-upload:${actor.platformUser.id}`)
  const multipart = await readMultipartFormData(event)
  const filePart = multipart?.find(part => part.name === 'file')
  const validFile = assertValidProfileIconPart(filePart ?? {})

  await putProfileIconObject(event, actor.platformUser.id, {
    contentType: validFile.contentType,
    data: validFile.data
  })

  const profileIconUpdatedAt = new Date().toISOString()
  const user = await updatePlatformAccountProfileIconTimestamp(
    getDatabase(event),
    actor.platformUser.id,
    profileIconUpdatedAt
  )

  return apiData({
    user
  })
})
