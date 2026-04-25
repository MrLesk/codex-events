import { and, eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import { getD1Binding } from '#server/database/client'
import { hackathonCreditCodes } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { ApiError } from '#server/utils/api-error'
import { apiData } from '#server/utils/api-response'
import {
  creditParamsSchema,
  isHackathonCreditClaimConflict,
  requireHackathonCreditClaimAccess,
  serializeParticipantHackathonCreditOffer
} from '#server/utils/hackathon-credits'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, creditId } = parseValidatedParams(event, creditParamsSchema)
  const {
    actor,
    database,
    offer
  } = await requireHackathonCreditClaimAccess(event, hackathonId, creditId)

  async function readOfferCodes() {
    return await database.query.hackathonCreditCodes.findMany({
      where: eq(hackathonCreditCodes.creditOfferId, creditId)
    })
  }

  const existingClaim = await database.query.hackathonCreditCodes.findFirst({
    where: and(
      eq(hackathonCreditCodes.creditOfferId, creditId),
      eq(hackathonCreditCodes.claimedByUserId, actor.platformUser.id)
    )
  })

  if (existingClaim) {
    return apiData(serializeParticipantHackathonCreditOffer(
      offer,
      await readOfferCodes(),
      actor.platformUser.id
    ))
  }

  const claimedAt = new Date().toISOString()

  try {
    const updateResult = await getD1Binding(event).prepare(`
      update hackathon_credit_codes
      set claimed_by_user_id = ?, claimed_at = ?
      where id = (
        select id
        from hackathon_credit_codes
        where credit_offer_id = ?
          and claimed_by_user_id is null
        order by created_at asc, id asc
        limit 1
      )
        and claimed_by_user_id is null
    `).bind(
      actor.platformUser.id,
      claimedAt,
      creditId
    ).run()

    if ((updateResult.meta.changes ?? 0) === 0) {
      const currentClaim = await database.query.hackathonCreditCodes.findFirst({
        where: and(
          eq(hackathonCreditCodes.creditOfferId, creditId),
          eq(hackathonCreditCodes.claimedByUserId, actor.platformUser.id)
        )
      })

      if (currentClaim) {
        return apiData(serializeParticipantHackathonCreditOffer(
          offer,
          await readOfferCodes(),
          actor.platformUser.id
        ))
      }

      throw new ApiError({
        statusCode: 409,
        code: 'hackathon_credit_sold_out',
        message: 'No credits remain for this offer.',
        details: {
          hackathonId,
          creditId
        }
      })
    }
  } catch (error) {
    if (!isHackathonCreditClaimConflict(error)) {
      throw error
    }

    const currentClaim = await database.query.hackathonCreditCodes.findFirst({
      where: and(
        eq(hackathonCreditCodes.creditOfferId, creditId),
        eq(hackathonCreditCodes.claimedByUserId, actor.platformUser.id)
      )
    })

    if (currentClaim) {
      return apiData(serializeParticipantHackathonCreditOffer(
        offer,
        await readOfferCodes(),
        actor.platformUser.id
      ))
    }

    throw error
  }

  const claimedCode = await database.query.hackathonCreditCodes.findFirst({
    where: and(
      eq(hackathonCreditCodes.creditOfferId, creditId),
      eq(hackathonCreditCodes.claimedByUserId, actor.platformUser.id)
    )
  })

  if (!claimedCode) {
    throw new ApiError({
      statusCode: 500,
      code: 'hackathon_credit_claim_missing',
      message: 'The claimed credit could not be resolved after assignment.',
      details: {
        hackathonId,
        creditId,
        userId: actor.platformUser.id
      }
    })
  }

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon_credit_code',
    entityId: claimedCode.id,
    action: 'hackathon_credit_code.claimed',
    metadata: {
      hackathonId,
      creditId,
      claimedByUserId: actor.platformUser.id
    },
    createdAt: claimedAt
  })

  return apiData(serializeParticipantHackathonCreditOffer(
    offer,
    await readOfferCodes(),
    actor.platformUser.id
  ))
})
