import { requirePlatformActor } from '../../../../auth/actor'
import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  getOwnUserApplication,
  serializeUserApplication
} from '../../../../utils/applications'
import {
  getHackathonTermsDocumentOrThrow,
  getVisibleHackathonOrThrow,
  routeIdParamsSchema
} from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

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
