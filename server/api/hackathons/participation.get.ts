import { defineApiHandler } from '../../utils/api-handler'
import { apiData } from '../../utils/api-response'
import { listOwnHackathonParticipation } from '../../utils/hackathon-participation'

export default defineApiHandler(async (event) => {
  const participation = await listOwnHackathonParticipation(event)

  return apiData(participation)
})
