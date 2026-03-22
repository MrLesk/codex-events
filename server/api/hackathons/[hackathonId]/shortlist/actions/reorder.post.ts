import { requirePlatformActor } from '../../../../../auth/actor'
import { writeAuditLog } from '../../../../../database/audit-log'
import { getDatabase } from '../../../../../database/client'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiData } from '../../../../../utils/api-response'
import {
  requireHackathonAdmin,
  routeIdParamsSchema
} from '../../../../../utils/hackathon-management'
import {
  assertShortlistReorderAllowed,
  assertShortlistReorderMatchesEntries,
  listShortlistEntries,
  reorderShortlistBodySchema
} from '../../../../../utils/shortlist'
import { parseValidatedBody, parseValidatedParams } from '../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, reorderShortlistBodySchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)

  assertShortlistReorderAllowed(hackathon)

  const shortlistEntries = await listShortlistEntries(database, hackathonId)
  assertShortlistReorderMatchesEntries(body.orderedSubmissionIds, shortlistEntries)

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.shortlist_reordered',
    metadata: {
      hackathonId,
      orderedSubmissionIds: body.orderedSubmissionIds
    }
  })

  return apiData(await listShortlistEntries(database, hackathonId))
})
