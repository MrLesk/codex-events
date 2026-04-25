import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  getOwnUserApplication,
  serializeUserApplication
} from '#server/utils/applications'
import {
  getHackathonTermsDocumentOrThrow,
  getVisibleHackathonOrThrow,
  routeIdParamsSchema
} from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)

  await getVisibleHackathonOrThrow(event, hackathonId)

  const application = await getOwnUserApplication(database, hackathonId, actor.platformUser.id)

  if (!application) {
    return apiData(null)
  }

  const applicationTermsDocument = await getHackathonTermsDocumentOrThrow(
    database,
    hackathonId,
    application.applicationTermsDocumentId
  )

  return apiData(serializeUserApplication(application, {
    applicationTermsDocument
  }))
})
