import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathons, prizeRedemptions, prizes } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  enqueueWinnerOutcomeEmails
} from '#server/utils/hackathon-outcome-email-queue'
import { chunkRowsForD1 } from '#server/utils/judging'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializePrize,
  serializeHackathon
} from '#server/utils/hackathon-management'
import {
  buildPrizeRedemptionRows,
  getCurrentWinnerTermsForHackathon
} from '#server/utils/prize-redemptions'
import {
  assertWinnersAnnouncementAllowed,
  assertFinalDeliberationReorderMatchesEntries,
  getFinalDeliberationView
} from '#server/utils/shortlist'
import { parseValidatedBody, parseValidatedParams } from '#server/utils/validation'
import { assertGuard } from '#server/utils/lifecycle-guard'

type WinnerPrizeSummary = ReturnType<typeof serializePrize>
type AnnouncedWinner = {
  teamId: string
  teamName: string
  finalRank: number
  prizes: WinnerPrizeSummary[]
}

const announceWinnersBodySchema = z.object({
  orderedSubmissionIds: z.array(z.string().trim().min(1)).min(1).optional()
}).default({})

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, announceWinnersBodySchema)
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

  const finalDeliberationView = await getFinalDeliberationView(database, hackathonId)
  const rankedEntries = finalDeliberationView.entries.filter(
    (entry): entry is typeof finalDeliberationView.entries[number] & { finalRank: number } =>
      entry.finalRank !== null
  )

  if (body.orderedSubmissionIds) {
    assertFinalDeliberationReorderMatchesEntries(
      body.orderedSubmissionIds,
      rankedEntries.map(entry => ({ submissionId: entry.submissionId }))
    )
  }

  const finalRankingSubmissionIds = body.orderedSubmissionIds
    ?? (finalDeliberationView.finalRankingSubmissionIds.length > 0
      ? finalDeliberationView.finalRankingSubmissionIds
      : rankedEntries.map(entry => entry.submissionId))
  const rankedEntriesBySubmissionId = new Map(
    rankedEntries.map(entry => [entry.submissionId, entry] as const)
  )
  const winners: AnnouncedWinner[] = finalRankingSubmissionIds
    .map(submissionId => rankedEntriesBySubmissionId.get(submissionId))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .map((entry, index) => {
      const finalRank = index + 1
      const awardedPrizes = prizeList
        .filter((prize: typeof prizeList[number]) => finalRank >= prize.rankStart && finalRank <= prize.rankEnd)
        .map(serializePrize)

      return {
        teamId: entry.teamId,
        teamName: entry.teamName,
        finalRank,
        prizes: awardedPrizes
      }
    })
    .filter(entry => entry.prizes.length > 0)

  const announcedAt = new Date().toISOString()
  const redemptionRows = await buildPrizeRedemptionRows(database, hackathonId, prizeList, announcedAt, winners)
  const redemptionRowChunks = chunkRowsForD1(redemptionRows, 7)

  await database.batch([
    database
      .update(hackathons)
      .set({
        state: 'winners_announced',
        finalRankingSubmissionIdsJson: JSON.stringify(finalRankingSubmissionIds),
        updatedAt: announcedAt
      })
      .where(eq(hackathons.id, hackathonId)),
    ...redemptionRowChunks.map(rows =>
      database.insert(prizeRedemptions).values(rows)
    )
  ])

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.announce_winners',
    metadata: {
      previousState: hackathon.state,
      nextState: 'winners_announced',
      finalRankingSubmissionIds,
      winnerCount: winners.length,
      createdPrizeRedemptionCount: redemptionRows.length
    }
  })

  await enqueueWinnerOutcomeEmails({
    event,
    database,
    hackathon: {
      id: hackathonId,
      name: hackathon.name,
      slug: hackathon.slug
    },
    winners,
    trigger: 'announce_winners',
    triggeredByUserId: actor.platformUser.id,
    announcedAt
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
