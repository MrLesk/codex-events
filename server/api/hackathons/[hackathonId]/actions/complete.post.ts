import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { hackathons } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import { enqueueWinnerOutcomeEmails } from '../../../../utils/hackathon-outcome-email-queue'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '../../../../utils/hackathon-management'
import {
  assertHackathonCompletionAllowed,
  getWinnersView
} from '../../../../utils/shortlist'
import { parseValidatedParams } from '../../../../utils/validation'

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
