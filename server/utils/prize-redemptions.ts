import type { H3Event } from 'h3'

import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { requirePlatformActor } from '../auth/actor'
import { resolveTeamAuthorization } from '../auth/authorization'
import { getDatabase, type AppDatabase } from '../database/client'
import {
  prizeEligibilitySnapshots,
  prizeRedemptions,
  prizes,
  teamMembers,
  type hackathons
} from '../database/schema'
import { getCurrentHackathonTerms, getHackathonOrThrow, serializePrize } from './hackathon-management'
import { ApiError } from './api-error'
import { assertAllowedState, assertGuard } from './lifecycle-guard'
import { getWinnersView } from './shortlist'

type HackathonRecord = typeof hackathons.$inferSelect
type PrizeRecord = typeof prizes.$inferSelect
type PrizeRedemptionRecord = typeof prizeRedemptions.$inferSelect
type TeamMemberRecord = typeof teamMembers.$inferSelect

export const prizeRedemptionParamsSchema = z.object({
  redemptionId: z.string().trim().min(1)
})

export const redeemPrizeRedemptionBodySchema = z.object({
  legalName: z.string().trim().min(1),
  winnerTermsDocumentId: z.string().trim().min(1)
})

export function serializePrizeRedemption(
  redemption: PrizeRedemptionRecord,
  prize: PrizeRecord,
  hackathon: HackathonRecord
) {
  return {
    id: redemption.id,
    status: redemption.status,
    userId: redemption.userId,
    teamId: redemption.teamId,
    legalName: redemption.legalName,
    winnerTermsDocumentId: redemption.winnerTermsDocumentId,
    winnerTermsAcceptedAt: redemption.winnerTermsAcceptedAt,
    redeemedAt: redemption.redeemedAt,
    createdAt: redemption.createdAt,
    updatedAt: redemption.updatedAt,
    prize: serializePrize(prize),
    hackathon: {
      id: hackathon.id,
      name: hackathon.name,
      slug: hackathon.slug,
      state: hackathon.state,
      currentWinnerTermsDocumentId: hackathon.currentWinnerTermsDocumentId
    }
  }
}

export async function getPrizeRedemptionContextOrThrow(database: AppDatabase, redemptionId: string) {
  const redemption = await database.query.prizeRedemptions.findFirst({
    where: eq(prizeRedemptions.id, redemptionId)
  })

  if (!redemption) {
    throw new ApiError({
      statusCode: 404,
      code: 'prize_redemption_not_found',
      message: 'The requested prize redemption was not found.',
      details: { redemptionId }
    })
  }

  const prize = await database.query.prizes.findFirst({
    where: eq(prizes.id, redemption.prizeId)
  })

  if (!prize) {
    throw new ApiError({
      statusCode: 404,
      code: 'prize_not_found',
      message: 'The requested prize was not found.',
      details: {
        redemptionId,
        prizeId: redemption.prizeId
      }
    })
  }

  const hackathon = await getHackathonOrThrow(database, prize.hackathonId)

  return {
    redemption,
    prize,
    hackathon
  }
}

export async function listHackathonPrizeRedemptions(database: AppDatabase, hackathonId: string) {
  const prizeList = await database.query.prizes.findMany({
    where: eq(prizes.hackathonId, hackathonId),
    orderBy: [asc(prizes.displayOrder), asc(prizes.rankStart), asc(prizes.rankEnd), asc(prizes.createdAt)]
  })

  if (prizeList.length === 0) {
    return []
  }

  const redemptionRows = await database.query.prizeRedemptions.findMany({
    where: inArray(prizeRedemptions.prizeId, prizeList.map(prize => prize.id)),
    orderBy: [asc(prizeRedemptions.createdAt)]
  })
  const prizesById = new Map(prizeList.map(prize => [prize.id, prize]))
  const hackathon = await getHackathonOrThrow(database, hackathonId)

  return redemptionRows.map(redemption => serializePrizeRedemption(
    redemption,
    prizesById.get(redemption.prizeId)!,
    hackathon
  ))
}

export async function listOwnPendingPrizeRedemptions(event: H3Event) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const teamAdminMemberships = await database.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.userId, actor.platformUser.id),
      eq(teamMembers.role, 'admin'),
      isNull(teamMembers.leftAt)
    )
  })
  const teamAdminTeamIds = new Set(teamAdminMemberships.map((membership: TeamMemberRecord) => membership.teamId))
  const redemptions = await database.query.prizeRedemptions.findMany({
    where: eq(prizeRedemptions.status, 'pending'),
    orderBy: [asc(prizeRedemptions.createdAt)]
  })

  const visibleRedemptions = redemptions.filter((redemption: PrizeRedemptionRecord) =>
    redemption.userId === actor.platformUser.id
    || (redemption.userId === null && redemption.teamId !== null && teamAdminTeamIds.has(redemption.teamId))
  )

  if (visibleRedemptions.length === 0) {
    return []
  }

  const prizeList = await database.query.prizes.findMany({
    where: inArray(prizes.id, visibleRedemptions.map((redemption: PrizeRedemptionRecord) => redemption.prizeId))
  })
  const hackathonsById = new Map<string, HackathonRecord>()

  for (const prize of prizeList as PrizeRecord[]) {
    if (!hackathonsById.has(prize.hackathonId)) {
      hackathonsById.set(prize.hackathonId, await getHackathonOrThrow(database, prize.hackathonId))
    }
  }

  const prizesById = new Map<string, PrizeRecord>(
    prizeList.map((prize: PrizeRecord) => [prize.id, prize] as const)
  )

  return visibleRedemptions.map((redemption: PrizeRedemptionRecord) => serializePrizeRedemption(
    redemption,
    prizesById.get(redemption.prizeId)!,
    hackathonsById.get(prizesById.get(redemption.prizeId)!.hackathonId)!
  ))
}

export async function requirePrizeRedemptionRecipientContext(event: H3Event, redemptionId: string) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const context = await getPrizeRedemptionContextOrThrow(database, redemptionId)

  if (context.redemption.userId) {
    assertGuard(context.redemption.userId === actor.platformUser.id, {
      statusCode: 403,
      code: 'prize_redemption_access_denied',
      message: 'This prize redemption is not assigned to the current user.',
      details: { redemptionId }
    })
  } else if (context.redemption.teamId) {
    const teamAuthorization = await resolveTeamAuthorization(event, context.redemption.teamId)
    assertGuard(teamAuthorization.isTeamAdmin, {
      statusCode: 403,
      code: 'prize_redemption_access_denied',
      message: 'This team-scoped prize redemption requires active team-admin access.',
      details: { redemptionId }
    })
  } else {
    throw new ApiError({
      statusCode: 500,
      code: 'prize_redemption_recipient_missing',
      message: 'The prize redemption does not have a valid recipient configuration.',
      details: { redemptionId }
    })
  }

  return {
    actor,
    database,
    ...context
  }
}

export function assertPrizeRedemptionRedeemable(
  hackathon: HackathonRecord,
  redemption: PrizeRedemptionRecord,
  currentWinnerTermsDocumentId: string | null,
  body: z.infer<typeof redeemPrizeRedemptionBodySchema>
) {
  assertAllowedState(hackathon.state, ['winners_announced', 'completed'], {
    code: 'hackathon_state_invalid',
    message: 'Prize redemption is only available after winners are announced.',
    details: { hackathonId: hackathon.id }
  })

  assertGuard(redemption.status === 'pending', {
    code: 'prize_redemption_state_invalid',
    message: 'Only pending prize redemptions can be redeemed.',
    details: { redemptionId: redemption.id }
  })

  assertGuard(Boolean(currentWinnerTermsDocumentId), {
    code: 'winner_terms_required',
    message: 'Prize redemption requires a current winner terms document.',
    details: { hackathonId: hackathon.id }
  })

  assertGuard(body.winnerTermsDocumentId === currentWinnerTermsDocumentId, {
    statusCode: 400,
    code: 'winner_terms_version_mismatch',
    message: 'Prize redemption must accept the current winner terms version.',
    details: {
      hackathonId: hackathon.id,
      winnerTermsDocumentId: body.winnerTermsDocumentId,
      currentWinnerTermsDocumentId
    }
  })
}

export async function buildPrizeRedemptionRows(
  database: AppDatabase,
  hackathonId: string,
  prizeList: PrizeRecord[],
  announcedAt: string
) {
  const winners = await getWinnersView(database, hackathonId)

  if (winners.length === 0 || prizeList.length === 0) {
    return []
  }

  const winningTeamIds = [...new Set(winners.map(entry => entry.teamId))]
  const snapshots = winningTeamIds.length === 0
    ? []
    : await database.query.prizeEligibilitySnapshots.findMany({
        where: and(
          eq(prizeEligibilitySnapshots.hackathonId, hackathonId),
          inArray(prizeEligibilitySnapshots.teamId, winningTeamIds)
        ),
        orderBy: [asc(prizeEligibilitySnapshots.createdAt)]
      })
  const snapshotsByTeamId = new Map<string, Array<typeof snapshots[number]>>()

  for (const snapshot of snapshots) {
    const rows = snapshotsByTeamId.get(snapshot.teamId) ?? []
    rows.push(snapshot)
    snapshotsByTeamId.set(snapshot.teamId, rows)
  }

  const prizeListById = new Map(prizeList.map(prize => [prize.id, prize]))
  const rows: Array<typeof prizeRedemptions.$inferInsert> = []

  for (const winner of winners) {
    for (const prize of winner.prizes.map(prizeSummary => prizeListById.get(prizeSummary.id)).filter(Boolean) as PrizeRecord[]) {
      if (prize.awardScope === 'team') {
        rows.push({
          id: crypto.randomUUID(),
          prizeId: prize.id,
          userId: null,
          teamId: winner.teamId,
          status: 'pending',
          createdAt: announcedAt,
          updatedAt: announcedAt
        })
        continue
      }

      const teamSnapshots = snapshotsByTeamId.get(winner.teamId) ?? []

      assertGuard(teamSnapshots.length > 0, {
        code: 'prize_eligibility_snapshot_missing',
        message: 'Member-scoped prize redemption requires frozen prize-eligibility members.',
        details: {
          hackathonId,
          teamId: winner.teamId,
          prizeId: prize.id
        }
      })

      for (const snapshot of teamSnapshots) {
        rows.push({
          id: crypto.randomUUID(),
          prizeId: prize.id,
          userId: snapshot.userId,
          teamId: snapshot.teamId,
          status: 'pending',
          createdAt: announcedAt,
          updatedAt: announcedAt
        })
      }
    }
  }

  return rows
}

export async function getCurrentWinnerTermsForHackathon(database: AppDatabase, hackathon: HackathonRecord) {
  const currentTerms = await getCurrentHackathonTerms(database, hackathon)
  return currentTerms.winnerTerms
}
