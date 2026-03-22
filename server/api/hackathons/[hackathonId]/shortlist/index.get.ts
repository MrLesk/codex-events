import { requirePlatformActor } from '../../../../auth/actor'
import { resolveHackathonAuthorization } from '../../../../auth/authorization'
import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiList } from '../../../../utils/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '../../../../utils/hackathon-management'
import { assertGuard } from '../../../../utils/lifecycle-guard'
import {
  assertShortlistViewAllowed,
  listShortlistEntries
} from '../../../../utils/shortlist'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const authorization = await resolveHackathonAuthorization(event, hackathonId)

  assertGuard(authorization.canReviewThroughAssignment, {
    statusCode: 403,
    code: 'shortlist_access_denied',
    message: 'This operation requires judge or hackathon admin access.',
    details: { hackathonId }
  })
  assertShortlistViewAllowed(hackathon)

  const shortlistEntries = await listShortlistEntries(database, hackathonId)

  return apiList(shortlistEntries, {
    total: shortlistEntries.length
  })
})
