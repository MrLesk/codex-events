import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { hackathons, prizeRedemptions, prizes } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '../../../../utils/hackathon-management'
import {
  buildPrizeRedemptionRows,
  getCurrentWinnerTermsForHackathon
} from '../../../../utils/prize-redemptions'
import {
  assertWinnersAnnouncementAllowed,
  getWinnersView
} from '../../../../utils/shortlist'
import { parseValidatedParams } from '../../../../utils/validation'
import { assertGuard } from '../../../../utils/lifecycle-guard'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)

  assertWinnersAnnouncementAllowed(hackathon)

  const prizeList = await database.query.prizes.findMany({
    where: eq(prizes.hackathonId, hackathonId)
  })
  const currentWinnerTerms = await getCurrentWinnerTermsForHackathon(database, hackathon)

  if (prizeList.length > 0) {
    assertGuard(Boolean(currentWinnerTerms), {
      code: 'winner_terms_required',
      message: 'Winner announcement requires current winner terms when prize redemption is enabled.',
      details: { hackathonId }
    })
  }

  const announcedAt = new Date().toISOString()
  const redemptionRows = await buildPrizeRedemptionRows(database, hackathonId, prizeList, announcedAt)

  await database.batch([
    database
      .update(hackathons)
      .set({
        state: 'winners_announced',
        updatedAt: announcedAt
      })
      .where(eq(hackathons.id, hackathonId)),
    ...(redemptionRows.length > 0
      ? [database.insert(prizeRedemptions).values(redemptionRows)]
      : [])
  ])

  const winners = await getWinnersView(database, hackathonId)

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.announce_winners',
    metadata: {
      previousState: hackathon.state,
      nextState: 'winners_announced',
      winnerCount: winners.length,
      createdPrizeRedemptionCount: redemptionRows.length
    }
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
