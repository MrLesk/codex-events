import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathons } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { enqueueWinnerOutcomeEmails } from '#server/utils/hackathon-outcome-email-queue'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '#server/utils/hackathon-management'
import {
  assertHackathonCompletionAllowed,
  getWinnersView,
  refreshCompletedOutcomeCache
} from '#server/utils/shortlist'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)

  assertHackathonCompletionAllowed(hackathon)

  const completedAt = new Date().toISOString()
  const winners = await getWinnersView(database, hackathonId)

  await database
    .update(hackathons)
    .set({
      state: 'completed',
      updatedAt: completedAt
    })
    .where(eq(hackathons.id, hackathonId))

  await refreshCompletedOutcomeCache(database, hackathonId)

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.completed',
    metadata: {
      previousState: hackathon.state,
      nextState: 'completed'
    }
  })

  await enqueueWinnerOutcomeEmails({
    event,
    database,
    hackathon: {
      id: hackathon.id,
      name: hackathon.name,
      slug: hackathon.slug
    },
    winners,
    trigger: 'complete',
    triggeredByUserId: actor.platformUser.id,
    announcedAt: completedAt
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
