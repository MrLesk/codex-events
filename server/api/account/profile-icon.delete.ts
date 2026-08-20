import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { eq } from 'drizzle-orm'
import { users } from '#server/database/schema'
import {
  updatePlatformAccountProfileIcon
} from '#server/domains/accounts'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { assertGuard } from '#server/domains/lifecycle-guard'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
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

  const user = await updatePlatformAccountProfileIcon(
    database,
    actor.platformUser.id,
    {
      profileIconUpdatedAt: null,
      profileIconObjectKey: null,
      expectedProfileIconRevision: currentUser!.profileIconRevision,
      expectedProfileIconObjectKey: currentUser!.profileIconObjectKey
    }
  )

  return apiData({
    user
  })
})
