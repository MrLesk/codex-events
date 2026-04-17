import { and, asc, eq, inArray } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { hackathons, prizeEligibilitySnapshots, prizeRedemptions, prizes, users } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  buildHackathonOutcomeEmailQueueMessage,
  enqueueHackathonOutcomeEmailMessage
} from '../../../../utils/hackathon-outcome-email-queue'
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
  getTeamCompetitionOutcome,
  getWinnersView
} from '../../../../utils/shortlist'
import { parseValidatedParams } from '../../../../utils/validation'
import { assertGuard } from '../../../../utils/lifecycle-guard'

type PrizeEligibilitySnapshotRecord = typeof prizeEligibilitySnapshots.$inferSelect
type UserRecord = typeof users.$inferSelect

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

  if (winners.length > 0) {
    const winnerOutcomes = await Promise.all(
      winners.map(async winner => [
        winner.teamId,
        await getTeamCompetitionOutcome(database, hackathonId, winner.teamId)
      ] as const)
    )
    const winningTeamIds = [...new Set(winners.map(winner => winner.teamId))]
    const snapshotsResult = await database.query.prizeEligibilitySnapshots.findMany({
      where: and(
        eq(prizeEligibilitySnapshots.hackathonId, hackathonId),
        inArray(prizeEligibilitySnapshots.teamId, winningTeamIds)
      ),
      orderBy: [asc(prizeEligibilitySnapshots.createdAt)]
    })
    const snapshots = snapshotsResult as PrizeEligibilitySnapshotRecord[]
    const recipientUserIds = [...new Set(snapshots.map((snapshot: PrizeEligibilitySnapshotRecord) => snapshot.userId))]
    const winnerRecipientsResult = recipientUserIds.length === 0
      ? []
      : await database.query.users.findMany({
          where: inArray(users.id, recipientUserIds)
        })
    const winnersByTeamId = new Map(winners.map(winner => [winner.teamId, winner] as const))
    const winnerOutcomesByTeamId = new Map(winnerOutcomes)
    const winnerRecipients = winnerRecipientsResult as UserRecord[]
    const usersById = new Map(winnerRecipients.map((user: UserRecord) => [user.id, user] as const))
    const deliveredRecipientKeys = new Set<string>()

    for (const snapshot of snapshots) {
      const winner = winnersByTeamId.get(snapshot.teamId)

      if (!winner) {
        continue
      }

      const recipientKey = `${snapshot.teamId}:${snapshot.userId}`

      if (deliveredRecipientKeys.has(recipientKey)) {
        continue
      }

      deliveredRecipientKeys.add(recipientKey)

      const recipient = usersById.get(snapshot.userId)
      const winnerOutcome = winnerOutcomesByTeamId.get(winner.teamId)
      const enqueueResult = await enqueueHackathonOutcomeEmailMessage(
        event,
        buildHackathonOutcomeEmailQueueMessage({
          notificationType: 'winner',
          hackathonId,
          hackathonName: hackathon.name,
          hackathonSlug: hackathon.slug,
          teamId: winner.teamId,
          teamName: winner.teamName,
          recipientUserId: snapshot.userId,
          recipientEmail: recipient?.email ?? null,
          recipientDisplayName: recipient?.displayName ?? null,
          announcedAt,
          finalRank: winner.finalRank,
          rankedTeamCount: winnerOutcome?.rankedTeamCount ?? winner.finalRank,
          prizeNames: winner.prizes.map(prize => prize.name)
        })
      )

      await writeAuditLog(database, {
        actorUserId: actor.platformUser.id,
        entityType: 'hackathon',
        entityId: hackathonId,
        action: 'hackathon.winner_email_enqueued',
        metadata: {
          trigger: 'announce_winners',
          teamId: winner.teamId,
          userId: snapshot.userId,
          finalRank: winner.finalRank,
          enqueue: enqueueResult
        }
      })
    }
  }

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
