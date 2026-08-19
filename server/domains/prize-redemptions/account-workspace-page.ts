import { and, asc, eq, exists, getTableColumns, isNull, or } from 'drizzle-orm'

import type { AccountPrizeRedemptionsPage } from '#shared/domains/prize-redemptions/account-prize-redemptions-page'
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

export async function getAccountPrizeRedemptionsPage(
  database: AppDatabase,
  userId: string
): Promise<AccountPrizeRedemptionsPage> {
  const rows = await database
    .select({
      redemption: getTableColumns(prizeRedemptions),
      prize: getTableColumns(prizes),
      event: getTableColumns(events),
      terms: getTableColumns(eventTermsDocuments)
    })
    .from(prizeRedemptions)
    .innerJoin(prizes, eq(prizes.id, prizeRedemptions.prizeId))
    .innerJoin(events, eq(events.id, prizes.eventId))
    .leftJoin(eventTermsDocuments, and(
      eq(eventTermsDocuments.id, events.currentWinnerTermsDocumentId),
      eq(eventTermsDocuments.eventId, events.id),
      eq(eventTermsDocuments.documentType, 'winner_terms')
    ))
    .where(and(
      eq(prizeRedemptions.status, 'pending'),
      or(
        eq(prizeRedemptions.userId, userId),
        and(
          isNull(prizeRedemptions.userId),
          exists(
            database
              .select({ id: teamMembers.id })
              .from(teamMembers)
              .where(and(
                eq(teamMembers.teamId, prizeRedemptions.teamId),
                eq(teamMembers.userId, userId),
                eq(teamMembers.role, 'admin'),
                isNull(teamMembers.leftAt)
              ))
          )
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
