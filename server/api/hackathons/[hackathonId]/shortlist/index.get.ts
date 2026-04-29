import { requirePlatformActor } from '#server/auth/actor'
import { resolveHackathonAuthorization } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '#server/domains/hackathons'
import { assertGuard } from '#server/domains/hackathons/lifecycle-guard'
import {
  getShortlistView,
  assertShortlistViewAllowed
} from '#server/utils/shortlist'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const authorization = await resolveHackathonAuthorization(event, hackathonId)
  const canViewShortlist = authorization.isPlatformAdmin
    || authorization.isHackathonAdmin
    || authorization.canReviewThroughAssignment

  assertGuard(canViewShortlist, {
    statusCode: 403,
    code: 'shortlist_access_denied',
    message: 'This operation requires judge or hackathon admin access.',
    details: { hackathonId }
  })
  assertShortlistViewAllowed(hackathon)

  const shortlistView = await getShortlistView(database, hackathonId)

  return apiList(shortlistView.entries, {
    total: shortlistView.entries.length,
    hasSavedShortlistSelection: shortlistView.hasSavedShortlistSelection
  })
})
