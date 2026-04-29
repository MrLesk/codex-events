import type { H3Event } from 'h3'

import { and, asc, desc, eq, getTableColumns, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { requirePlatformActor } from '#server/auth/actor'
import { resolveTeamAuthorization } from '#server/auth/authorization'
import { getDatabase, type AppDatabase } from '#server/database/client'
import {
  prizeEligibilitySnapshots,
  prizeRedemptions,
  prizes,
  teamMembers,
  teams,
  users,
  type hackathons
} from '#server/database/schema'
import {
  getCurrentHackathonTerms,
  getHackathonOrThrow,
  serializePrize,
  serializePublishedHackathonRosterMember
} from '#server/domains/hackathons'
import { ApiError } from '#server/http/api-error'
import { assertAllowedState, assertGuard } from '#server/domains/hackathons/lifecycle-guard'
import { getWinnersView } from './shortlist'

type HackathonRecord = typeof hackathons.$inferSelect
type PrizeRecord = typeof prizes.$inferSelect
type PrizeRedemptionRecord = typeof prizeRedemptions.$inferSelect

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
    orderBy: [asc(prizes.displayOrder), asc(prizes.rankEnd), desc(prizes.rankStart), asc(prizes.createdAt)]
  })

  if (prizeList.length === 0) {
    return []
  }

  const redemptionRows = await database
    .select(getTableColumns(prizeRedemptions))
    .from(prizeRedemptions)
    .innerJoin(prizes, eq(prizes.id, prizeRedemptions.prizeId))
    .where(eq(prizes.hackathonId, hackathonId))
    .orderBy(asc(prizeRedemptions.createdAt))
  const prizesById = new Map(prizeList.map(prize => [prize.id, prize]))
  const hackathon = await getHackathonOrThrow(database, hackathonId)

  return redemptionRows.map(redemption => serializePrizeRedemption(
    redemption,
    prizesById.get(redemption.prizeId)!,
    hackathon
  ))
}

export async function listOperationalPrizeRedemptionTeamMembersByTeamId(
  database: AppDatabase,
  hackathonId: string,
  teamIds: string[]
) {
  if (teamIds.length === 0) {
    return new Map<string, Array<{
      id: string
      fullName: string
      bio: string | null
      xProfileUrl: string | null
      linkedinProfileUrl: string | null
      githubProfileUrl: string | null
      chatgptEmail: string | null
      openaiOrgId: string | null
      profileIconUrl: string | null
    }>>()
  }

  const requestedTeamIds = new Set(teamIds)
  const memberships = (await database
    .select(getTableColumns(teamMembers))
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(
      eq(teams.hackathonId, hackathonId),
      isNull(teamMembers.leftAt)
    ))
    .orderBy(asc(teamMembers.teamId), asc(teamMembers.joinedAt)))
    .filter(membership => requestedTeamIds.has(membership.teamId))
  const relatedUsers = await database
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(teamMembers, eq(teamMembers.userId, users.id))
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(
      eq(teams.hackathonId, hackathonId),
      isNull(teamMembers.leftAt),
      isNull(users.deletedAt)
    ))
  const usersById = new Map(relatedUsers.map(user => [user.id, user] as const))
  const teamMembersByTeamId = new Map<string, Array<{
    id: string
    fullName: string
    bio: string | null
    xProfileUrl: string | null
    linkedinProfileUrl: string | null
    githubProfileUrl: string | null
    chatgptEmail: string | null
    openaiOrgId: string | null
    profileIconUrl: string | null
  }>>()

  for (const membership of memberships) {
    const user = usersById.get(membership.userId)

    if (!user) {
      continue
    }

    const teamRosterMembers = teamMembersByTeamId.get(membership.teamId) ?? []
    const member = serializePublishedHackathonRosterMember(user)

    teamRosterMembers.push({
      id: member.id,
      fullName: member.fullName,
      bio: member.bio,
      xProfileUrl: member.xProfileUrl,
      linkedinProfileUrl: member.linkedinProfileUrl,
      githubProfileUrl: member.githubProfileUrl,
      chatgptEmail: user.chatgptEmail,
      openaiOrgId: user.openaiOrgId,
      profileIconUrl: null
    })
    teamMembersByTeamId.set(membership.teamId, teamRosterMembers)
  }

  return teamMembersByTeamId
}

export async function listOwnPendingPrizeRedemptions(event: H3Event) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const [directRedemptions, teamScopedRedemptions] = await Promise.all([
    database.query.prizeRedemptions.findMany({
      where: and(
        eq(prizeRedemptions.status, 'pending'),
        eq(prizeRedemptions.userId, actor.platformUser.id)
      ),
      orderBy: [asc(prizeRedemptions.createdAt)]
    }),
    database
      .select(getTableColumns(prizeRedemptions))
      .from(prizeRedemptions)
      .innerJoin(teamMembers, eq(teamMembers.teamId, prizeRedemptions.teamId))
      .where(and(
        eq(prizeRedemptions.status, 'pending'),
        isNull(prizeRedemptions.userId),
        eq(teamMembers.userId, actor.platformUser.id),
        eq(teamMembers.role, 'admin'),
        isNull(teamMembers.leftAt)
      ))
      .orderBy(asc(prizeRedemptions.createdAt))
  ])
  const redemptions = [...directRedemptions, ...teamScopedRedemptions]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))

  if (redemptions.length === 0) {
    return []
  }

  const prizeList: PrizeRecord[] = []
  const hackathonsById = new Map<string, HackathonRecord>()

  for (const redemption of redemptions) {
    const prize = await database.query.prizes.findFirst({
      where: eq(prizes.id, redemption.prizeId)
    })

    if (!prize) {
      throw new ApiError({
        statusCode: 404,
        code: 'prize_not_found',
        message: 'The prize attached to a pending redemption was not found.',
        details: {
          redemptionId: redemption.id,
          prizeId: redemption.prizeId
        }
      })
    }

    prizeList.push(prize)

    if (!hackathonsById.has(prize.hackathonId)) {
      hackathonsById.set(prize.hackathonId, await getHackathonOrThrow(database, prize.hackathonId))
    }
  }

  const prizesById = new Map<string, PrizeRecord>(
    prizeList.map((prize: PrizeRecord) => [prize.id, prize] as const)
  )

  return redemptions.map((redemption: PrizeRedemptionRecord) => serializePrizeRedemption(
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
  announcedAt: string,
  winners: Array<{
    teamId: string
    prizes: Array<{ id: string }>
  }> | null = null
) {
  const resolvedWinners = winners ?? await getWinnersView(database, hackathonId)

  if (resolvedWinners.length === 0 || prizeList.length === 0) {
    return []
  }

  const winningTeamIds = [...new Set(resolvedWinners.map(entry => entry.teamId))]
  const snapshots = winningTeamIds.length === 0
    ? []
    : (await database.query.prizeEligibilitySnapshots.findMany({
        where: eq(prizeEligibilitySnapshots.hackathonId, hackathonId),
        orderBy: [asc(prizeEligibilitySnapshots.createdAt)]
      })).filter(snapshot => winningTeamIds.includes(snapshot.teamId))
  const snapshotsByTeamId = new Map<string, Array<typeof snapshots[number]>>()

  for (const snapshot of snapshots) {
    const rows = snapshotsByTeamId.get(snapshot.teamId) ?? []
    rows.push(snapshot)
    snapshotsByTeamId.set(snapshot.teamId, rows)
  }

  const prizeListById = new Map(prizeList.map(prize => [prize.id, prize]))
  const rows: Array<typeof prizeRedemptions.$inferInsert> = []

  for (const winner of resolvedWinners) {
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
