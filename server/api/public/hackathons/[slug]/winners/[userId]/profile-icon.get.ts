import { and, eq, isNull } from 'drizzle-orm'
import { setHeader } from 'h3'
import { z } from 'zod'

import { getDatabase } from '#server/database/client'
import { prizeEligibilitySnapshots, prizeRedemptions, users } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { ApiError } from '#server/utils/api-error'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/utils/hackathon-management'
import { getProfileIconObject } from '#server/utils/profile-icons'
import { assertWinnersVisible } from '#server/utils/shortlist'
import {
  parseValidatedParams,
  parseValidatedQuery
} from '#server/utils/validation'

const winnerProfileIconParamsSchema = routeSlugParamsSchema.extend({
  userId: z.string().trim().min(1)
})

const winnerProfileIconQuerySchema = z.object({
  v: z.string().trim().min(1).optional()
})

export default defineApiHandler(async (event) => {
  const { slug, userId } = parseValidatedParams(event, winnerProfileIconParamsSchema)
  parseValidatedQuery(event, winnerProfileIconQuerySchema)

  const database = getDatabase(event)
  const hackathon = await getPublicHackathonBySlugOrThrow(database, slug)

  assertWinnersVisible(hackathon)

  const [winningRedemption] = await database
    .select({
      id: prizeRedemptions.id
    })
    .from(prizeRedemptions)
    .innerJoin(prizeEligibilitySnapshots, eq(prizeEligibilitySnapshots.teamId, prizeRedemptions.teamId))
    .where(and(
      eq(prizeEligibilitySnapshots.hackathonId, hackathon.id),
      eq(prizeEligibilitySnapshots.userId, userId)
    ))
    .limit(1)

  if (!winningRedemption) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  const targetUser = await database.query.users.findFirst({
    columns: {
      id: true,
      profileIconUpdatedAt: true
    },
    where: and(
      eq(users.id, userId),
      isNull(users.deletedAt)
    )
  })

  if (!targetUser?.profileIconUpdatedAt) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  const icon = await getProfileIconObject(event, userId)

  if (!icon) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')

  return new Response(await icon.arrayBuffer(), {
    headers: {
      'content-type': icon.httpMetadata?.contentType ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff'
    }
  })
})
