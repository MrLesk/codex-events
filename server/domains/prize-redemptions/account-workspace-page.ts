import { and, asc, eq, isNotNull, isNull, or } from 'drizzle-orm'

import type { AccountPrizeRedemptionsPage } from '#shared/domains/prize-redemptions/account-prize-redemptions-page'
import { accountPrizeRedemptionsPageSchema } from '#shared/domains/prize-redemptions/account-prize-redemptions-page'
import {
  eventTermsDocuments,
  events,
  prizeRedemptions,
  prizes,
  teamMembers
} from '#server/database/schema'
import type { AppDatabase } from '#server/database/client'
import { serializeEventTermsDocument, serializePrize } from '#server/domains/events'
import { serializePrizeRedemption } from '#server/domains/prize-redemptions'
import {
  assertAccountPageAccess,
  defineAccountPageRoute,
  type AccountPageContext
} from '#server/domains/accounts/account-page-contract'

export async function getAccountPrizeRedemptionsPage(
  database: AppDatabase,
  userId: string
): Promise<AccountPrizeRedemptionsPage> {
  const rows = await database
    .select({
      redemption: {
        id: prizeRedemptions.id,
        status: prizeRedemptions.status,
        userId: prizeRedemptions.userId,
        teamId: prizeRedemptions.teamId,
        legalName: prizeRedemptions.legalName,
        winnerTermsDocumentId: prizeRedemptions.winnerTermsDocumentId,
        winnerTermsAcceptedAt: prizeRedemptions.winnerTermsAcceptedAt,
        redeemedAt: prizeRedemptions.redeemedAt,
        createdAt: prizeRedemptions.createdAt,
        updatedAt: prizeRedemptions.updatedAt
      },
      prize: {
        id: prizes.id,
        eventId: prizes.eventId,
        name: prizes.name,
        description: prizes.description,
        rewardType: prizes.rewardType,
        rewardValue: prizes.rewardValue,
        rewardCurrency: prizes.rewardCurrency,
        awardScope: prizes.awardScope,
        rankStart: prizes.rankStart,
        rankEnd: prizes.rankEnd,
        displayOrder: prizes.displayOrder,
        createdAt: prizes.createdAt
      },
      event: {
        id: events.id,
        name: events.name,
        slug: events.slug,
        state: events.state,
        currentWinnerTermsDocumentId: events.currentWinnerTermsDocumentId
      },
      terms: {
        id: eventTermsDocuments.id,
        eventId: eventTermsDocuments.eventId,
        documentType: eventTermsDocuments.documentType,
        version: eventTermsDocuments.version,
        title: eventTermsDocuments.title,
        content: eventTermsDocuments.content,
        publishedAt: eventTermsDocuments.publishedAt,
        createdAt: eventTermsDocuments.createdAt
      }
    })
    .from(prizeRedemptions)
    .innerJoin(prizes, eq(prizes.id, prizeRedemptions.prizeId))
    .innerJoin(events, eq(events.id, prizes.eventId))
    .leftJoin(eventTermsDocuments, and(
      eq(eventTermsDocuments.id, events.currentWinnerTermsDocumentId),
      eq(eventTermsDocuments.eventId, events.id),
      eq(eventTermsDocuments.documentType, 'winner_terms')
    ))
    .leftJoin(teamMembers, and(
      eq(teamMembers.teamId, prizeRedemptions.teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.role, 'admin'),
      isNull(teamMembers.leftAt)
    ))
    .where(and(
      eq(prizeRedemptions.status, 'pending'),
      or(
        eq(prizeRedemptions.userId, userId),
        and(
          isNull(prizeRedemptions.userId),
          isNotNull(teamMembers.id)
        )
      )
    ))
    .orderBy(asc(prizeRedemptions.createdAt))

  return {
    redemptions: rows.flatMap((row) => {
      if (row.redemption.status !== 'pending') {
        return []
      }

      return [{
        ...serializePrizeRedemption(row.redemption, row.prize, row.event),
        status: 'pending' as const,
        prize: serializePrize(row.prize),
        currentWinnerTerms: row.terms
          ? {
              ...serializeEventTermsDocument(row.terms),
              documentType: 'winner_terms' as const
            }
          : null
      }]
    })
  }
}

export const accountPrizeRedemptionsPageRoute = defineAccountPageRoute({
  page: 'prize-redemptions-workspace',
  schema: accountPrizeRedemptionsPageSchema,
  authorize: assertAccountPageAccess,
  load: (context: AccountPageContext) => getAccountPrizeRedemptionsPage(
    context.database,
    context.actor.platformUser.id
  )
})
