import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import { hackathonListQuerySchema, listVisibleHackathons, serializeHackathon } from '#server/utils/hackathon-management'
import { parseValidatedQuery } from '#server/utils/validation'

type HackathonRecord = Awaited<ReturnType<typeof listVisibleHackathons>>['items'][number]

export default defineApiHandler(async (event) => {
  const query = parseValidatedQuery(event, hackathonListQuerySchema)
  const result = await listVisibleHackathons(event, query)

  return apiList(
    result.items.map((hackathon: HackathonRecord) => serializeHackathon(hackathon)),
    {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    }
  )
})
