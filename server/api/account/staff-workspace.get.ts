import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { getAccountStaffPage } from '#server/domains/accounts/account-staff-page'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)

  return apiData(await getAccountStaffPage(
    getDatabase(event),
    actor.platformUser.id
  ))
})
