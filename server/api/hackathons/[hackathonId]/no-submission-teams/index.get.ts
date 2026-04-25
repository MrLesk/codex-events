import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import { requireHackathonAdmin, routeIdParamsSchema } from '#server/utils/hackathon-management'
import { listNoSubmissionTeams } from '#server/utils/submissions'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  const data = await listNoSubmissionTeams(getDatabase(event), hackathon.id)

  return apiData(data)
})
