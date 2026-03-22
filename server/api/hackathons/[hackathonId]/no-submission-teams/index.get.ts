import { requirePlatformActor } from '../../../../auth/actor'
import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import { parseValidatedParams } from '../../../../utils/validation'
import { listNoSubmissionTeams } from '../../../../utils/submissions'
import { requireHackathonAdmin, routeIdParamsSchema } from '../../../../utils/hackathon-management'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  const data = await listNoSubmissionTeams(getDatabase(event), hackathon.id)

  return apiData(data)
})
