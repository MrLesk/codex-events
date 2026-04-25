import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import { listOwnHackathonParticipation } from '#server/utils/hackathon-participation'

export default defineApiHandler(async (event) => {
  const participation = await listOwnHackathonParticipation(event)

  return apiData(participation)
})
