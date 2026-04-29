import { eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import { prizeRedemptions } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertPrizeRedemptionRedeemable,
  getCurrentWinnerTermsForHackathon,
  prizeRedemptionParamsSchema,
  redeemPrizeRedemptionBodySchema,
  requirePrizeRedemptionRecipientContext,
  serializePrizeRedemption
} from '#server/utils/prize-redemptions'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { redemptionId } = parseValidatedParams(event, prizeRedemptionParamsSchema)
  const body = await parseValidatedBody(event, redeemPrizeRedemptionBodySchema)
  const {
    actor,
    database,
    redemption,
    prize,
    hackathon
  } = await requirePrizeRedemptionRecipientContext(event, redemptionId)
  const currentWinnerTerms = await getCurrentWinnerTermsForHackathon(database, hackathon)

  assertPrizeRedemptionRedeemable(hackathon, redemption, currentWinnerTerms?.id ?? null, body)

  const redeemedAt = new Date().toISOString()

  await database
    .update(prizeRedemptions)
    .set({
      userId: redemption.userId ?? actor.platformUser.id,
      legalName: body.legalName,
      winnerTermsDocumentId: body.winnerTermsDocumentId,
      winnerTermsAcceptedAt: redeemedAt,
      redeemedAt,
      status: 'redeemed',
      updatedAt: redeemedAt
    })
    .where(eq(prizeRedemptions.id, redemption.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'prize_redemption',
    entityId: redemption.id,
    action: 'prize_redemption.redeemed',
    metadata: {
      hackathonId: hackathon.id,
      prizeId: prize.id,
      teamId: redemption.teamId,
      winnerTermsDocumentId: body.winnerTermsDocumentId
    }
  })

  return apiData(serializePrizeRedemption({
    ...redemption,
    userId: redemption.userId ?? actor.platformUser.id,
    legalName: body.legalName,
    winnerTermsDocumentId: body.winnerTermsDocumentId,
    winnerTermsAcceptedAt: redeemedAt,
    redeemedAt,
    status: 'redeemed',
    updatedAt: redeemedAt
  }, prize, hackathon))
})
