import { readMultipartFormData } from 'h3'

import { requirePlatformActor } from '../../auth/actor'
import { getDatabase } from '../../database/client'
import {
  updatePlatformAccountProfileIconTimestamp
} from '../../utils/account-management'
import { defineApiHandler } from '../../utils/api-handler'
import { apiData } from '../../utils/api-response'
import {
  assertValidProfileIconPart,
  putProfileIconObject
} from '../../utils/profile-icons'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
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
