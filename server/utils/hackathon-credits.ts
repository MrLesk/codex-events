import type { H3Event } from 'h3'
import type { users as usersTable } from '#server/database/schema'

import { and, asc, eq, getTableColumns } from 'drizzle-orm'
import { z } from 'zod'

import { resolveHackathonAuthorization } from '#server/auth/authorization'
import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { hackathonCreditCodes, hackathonCreditOffers, userApplications } from '#server/database/schema'
import { ApiError } from '#server/http/api-error'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from './hackathon-management'
import { assertGuard } from './lifecycle-guard'

type HackathonCreditOfferRecord = typeof hackathonCreditOffers.$inferSelect
type HackathonCreditCodeRecord = typeof hackathonCreditCodes.$inferSelect
type UserRecord = typeof usersTable.$inferSelect

export const creditParamsSchema = routeIdParamsSchema.extend({
  creditId: z.string().trim().min(1)
})

export const createHackathonCreditOfferBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  displayOrder: z.coerce.number().int().min(0).optional()
})

export const updateHackathonCreditOfferBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  displayOrder: z.coerce.number().int().min(0).optional()
}).refine(
  input => Object.keys(input).length > 0,
  'At least one credit-offer field must be provided.'
)

export function serializeHackathonCreditOffer(offer: HackathonCreditOfferRecord) {
  return {
    id: offer.id,
    hackathonId: offer.hackathonId,
    name: offer.name,
    description: offer.description,
    displayOrder: offer.displayOrder,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt
  }
}

export function serializeParticipantHackathonCreditOffer(
  offer: HackathonCreditOfferRecord,
  codes: HackathonCreditCodeRecord[],
  actorUserId: string | null
) {
  const assignedCode = actorUserId
    ? codes.find(code => code.claimedByUserId === actorUserId) ?? null
    : null
  const availableCount = codes.filter(code => code.claimedByUserId === null).length

  return {
    ...serializeHackathonCreditOffer(offer),
    availableCount,
    totalCount: codes.length,
    claimedCode: assignedCode
      ? {
          id: assignedCode.id,
          value: assignedCode.value,
          claimedAt: assignedCode.claimedAt
        }
      : null
  }
}

export function serializeAdminHackathonCreditOffer(
  offer: HackathonCreditOfferRecord,
  codes: HackathonCreditCodeRecord[],
  usersById: Map<string, UserRecord>
) {
  const availableCount = codes.filter(code => code.claimedByUserId === null).length

  return {
    ...serializeHackathonCreditOffer(offer),
    availableCount,
    claimedCount: codes.length - availableCount,
    totalCount: codes.length,
    codes: codes.map((code) => {
      const claimingUser = code.claimedByUserId ? usersById.get(code.claimedByUserId) ?? null : null

      return {
        id: code.id,
        value: code.value,
        claimedAt: code.claimedAt,
        createdAt: code.createdAt,
        claimedByUser: claimingUser
          ? {
              id: claimingUser.id,
              email: claimingUser.email,
              displayName: claimingUser.displayName
            }
          : null
      }
    })
  }
}

export async function getHackathonCreditOfferOrThrow(
  database: ReturnType<typeof getDatabase>,
  hackathonId: string,
  creditId: string
) {
  const offer = await database.query.hackathonCreditOffers.findFirst({
    where: and(
      eq(hackathonCreditOffers.id, creditId),
      eq(hackathonCreditOffers.hackathonId, hackathonId)
    )
  })

  if (!offer) {
    throw new ApiError({
      statusCode: 404,
      code: 'hackathon_credit_offer_not_found',
      message: 'The requested hackathon credit offer was not found.',
      details: {
        hackathonId,
        creditId
      }
    })
  }

  return offer
}

export async function listHackathonCreditOffers(
  database: ReturnType<typeof getDatabase>,
  hackathonId: string
) {
  return await database.query.hackathonCreditOffers.findMany({
    where: eq(hackathonCreditOffers.hackathonId, hackathonId),
    orderBy: [asc(hackathonCreditOffers.displayOrder), asc(hackathonCreditOffers.createdAt)]
  })
}

export async function listHackathonCreditCodesForHackathon(
  database: ReturnType<typeof getDatabase>,
  hackathonId: string
) {
  return await database
    .select(getTableColumns(hackathonCreditCodes))
    .from(hackathonCreditCodes)
    .innerJoin(hackathonCreditOffers, eq(hackathonCreditOffers.id, hackathonCreditCodes.creditOfferId))
    .where(eq(hackathonCreditOffers.hackathonId, hackathonId))
    .orderBy(asc(hackathonCreditCodes.createdAt), asc(hackathonCreditCodes.id))
}

async function getApprovedUserApplication(
  database: ReturnType<typeof getDatabase>,
  hackathonId: string,
  userId: string
) {
  return await database.query.userApplications.findFirst({
    where: and(
      eq(userApplications.hackathonId, hackathonId),
      eq(userApplications.userId, userId),
      eq(userApplications.status, 'approved')
    )
  })
}

export async function requireHackathonCreditsViewAccess(event: H3Event, hackathonId: string) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const authorization = await resolveHackathonAuthorization(event, hackathonId)
  const approvedApplication = await getApprovedUserApplication(database, hackathonId, actor.platformUser.id)

  if (!authorization.isHackathonAdmin && !approvedApplication) {
    throw new ApiError({
      statusCode: 403,
      code: 'hackathon_credit_access_denied',
      message: 'This operation requires approved participant access or hackathon admin access.',
      details: {
        hackathonId,
        userId: actor.platformUser.id
      }
    })
  }

  return {
    actor,
    database,
    hackathon,
    authorization,
    approvedApplication
  }
}

export async function requireHackathonCreditClaimAccess(event: H3Event, hackathonId: string, creditId: string) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const offer = await getHackathonCreditOfferOrThrow(database, hackathonId, creditId)
  const approvedApplication = await getApprovedUserApplication(database, hackathonId, actor.platformUser.id)

  if (!approvedApplication) {
    throw new ApiError({
      statusCode: 403,
      code: 'hackathon_credit_claim_denied',
      message: 'Only approved participants can claim hackathon credits.',
      details: {
        hackathonId,
        creditId,
        userId: actor.platformUser.id
      }
    })
  }

  return {
    actor,
    database,
    hackathon,
    offer,
    approvedApplication
  }
}

export function parseSingleColumnCreditCsv(content: string) {
  const rows = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(row => row.trim())
    .filter(row => row.length > 0)
    .map((row) => {
      if ((row.startsWith('"') && row.endsWith('"')) || (row.startsWith('\'') && row.endsWith('\''))) {
        return row.slice(1, -1).trim()
      }

      return row
    })
    .filter(row => row.length > 0)

  assertGuard(rows.length > 0, {
    statusCode: 400,
    code: 'hackathon_credit_import_empty',
    message: 'The uploaded CSV did not contain any credit values.'
  })

  return rows
}

export function isHackathonCreditClaimConflict(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return error.message.includes('UNIQUE constraint failed')
    || error.message.includes('unique constraint failed')
}
