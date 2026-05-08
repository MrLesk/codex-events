import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { listOwnEventParticipation } from '#server/domains/events/participation'

export default defineApiHandler(async (h3Event) => {
  const participation = await listOwnEventParticipation(h3Event)

  return apiData(participation)
})
