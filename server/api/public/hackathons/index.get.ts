import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { hackathonListQuerySchema, listPublicHackathons, serializePublicHackathon } from '#server/domains/hackathons'
import { parseValidatedQuery } from '#server/http/validation'

type HackathonRecord = Awaited<ReturnType<typeof listPublicHackathons>>['items'][number]

export default defineApiHandler(async (event) => {
  const query = parseValidatedQuery(event, hackathonListQuerySchema)
  const result = await listPublicHackathons(getDatabase(event), query)

  return apiList(
    result.items.map((hackathon: HackathonRecord) => serializePublicHackathon(hackathon)),
    {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    }
  )
})
