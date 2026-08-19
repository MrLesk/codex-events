import { readMultipartFormData } from 'h3'

import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { users } from '#server/database/schema'
import {
  updatePlatformAccountProfileIcon
} from '#server/domains/accounts'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertValidProfileIconPart,
  deleteProfileIconObjectBestEffort,
  profileIconObjectKey,
  putProfileIconObject
} from '#server/domains/accounts/profile-icons'
import { assertGuard } from '#server/domains/lifecycle-guard'
import { assertAuthenticatedUploadRateLimit } from '#server/utils/rate-limit'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  await assertAuthenticatedUploadRateLimit(h3Event, `authenticated-upload:${actor.platformUser.id}`)
  const multipart = await readMultipartFormData(h3Event)
  const filePart = multipart?.find(part => part.name === 'file')
  const validFile = assertValidProfileIconPart(filePart ?? {})
  const objectKey = profileIconObjectKey(actor.platformUser.id)
  const database = getDatabase(h3Event)
  const currentUser = await database.query.users.findFirst({
    columns: {
      profileIconObjectKey: true,
      profileIconRevision: true
    },
    where: eq(users.id, actor.platformUser.id)
  })

  assertGuard(Boolean(currentUser), {
    statusCode: 404,
    code: 'platform_user_not_found',
    message: 'The requested platform user was not found.'
  })

  await putProfileIconObject(h3Event, objectKey, {
    contentType: validFile.contentType,
    data: validFile.data
  })

  const profileIconUpdatedAt = new Date().toISOString()
  const user = await updatePlatformAccountProfileIcon(
    database,
    actor.platformUser.id,
    {
      profileIconUpdatedAt,
      profileIconObjectKey: objectKey,
      expectedProfileIconRevision: currentUser!.profileIconRevision,
      expectedProfileIconObjectKey: currentUser!.profileIconObjectKey
    }
  )

  if (currentUser!.profileIconObjectKey) {
    await deleteProfileIconObjectBestEffort(h3Event, currentUser!.profileIconObjectKey)
  }

  return apiData({
    user
  })
})
