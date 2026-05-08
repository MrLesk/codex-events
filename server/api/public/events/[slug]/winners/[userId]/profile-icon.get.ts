import { and, eq, isNull } from 'drizzle-orm'
import { setHeader } from 'h3'
import { z } from 'zod'

import { getDatabase } from '#server/database/client'
import { prizeEligibilitySnapshots, prizeRedemptions, users } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import {
  getPublicEventBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/domains/events'
import { getProfileIconObject } from '#server/domains/accounts/profile-icons'
import { assertWinnersVisible } from '#server/domains/outcomes'
import {
  parseValidatedParams,
  parseValidatedQuery
} from '#server/http/validation'

const winnerProfileIconParamsSchema = routeSlugParamsSchema.extend({
  userId: z.string().trim().min(1)
})

const winnerProfileIconQuerySchema = z.object({
  v: z.string().trim().min(1).optional()
})

export default defineApiHandler(async (h3Event) => {
  const { slug, userId } = parseValidatedParams(h3Event, winnerProfileIconParamsSchema)
  parseValidatedQuery(h3Event, winnerProfileIconQuerySchema)

  const database = getDatabase(h3Event)
  const event = await getPublicEventBySlugOrThrow(database, slug)

  assertWinnersVisible(event)

  const [winningRedemption] = await database
    .select({
      id: prizeRedemptions.id
    })
    .from(prizeRedemptions)
    .innerJoin(prizeEligibilitySnapshots, eq(prizeEligibilitySnapshots.teamId, prizeRedemptions.teamId))
    .where(and(
      eq(prizeEligibilitySnapshots.eventId, event.id),
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

  const icon = await getProfileIconObject(h3Event, userId)

  if (!icon) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  setHeader(h3Event, 'cache-control', 'public, max-age=31536000, immutable')

  return new Response(await icon.arrayBuffer(), {
    headers: {
      'content-type': icon.httpMetadata?.contentType ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff'
    }
  })
})
