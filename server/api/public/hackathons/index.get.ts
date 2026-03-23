import { getDatabase } from '../../../database/client'
import { defineApiHandler } from '../../../utils/api-handler'
import { apiList } from '../../../utils/api-response'
import { hackathonListQuerySchema, listPublicHackathons, serializePublicHackathon } from '../../../utils/hackathon-management'
import { parseValidatedQuery } from '../../../utils/validation'

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
