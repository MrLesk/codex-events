import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { listOwnHackathonParticipation } from '#server/domains/hackathons/participation'

export default defineApiHandler(async (event) => {
  const participation = await listOwnHackathonParticipation(event)

  return apiData(participation)
})
