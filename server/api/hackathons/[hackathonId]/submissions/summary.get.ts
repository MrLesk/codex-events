import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { requireHackathonAdmin, routeIdParamsSchema } from '#server/domains/hackathons'
import { getHackathonSubmissionSummary } from '#server/domains/submissions'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)

  return apiData(await getHackathonSubmissionSummary(getDatabase(event), hackathon.id))
})
