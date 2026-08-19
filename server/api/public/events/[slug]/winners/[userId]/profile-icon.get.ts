import { and, eq, isNull } from 'drizzle-orm'
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
import { privatePublicEventCacheControl } from '#server/domains/events/public-cache'

const winnerProfileIconParamsSchema = routeSlugParamsSchema.extend({
  userId: z.string().trim().min(1)
})

const winnerProfileIconQuerySchema = z.object({
  v: z.string().trim().min(1).optional()
})

export default defineApiHandler(async (h3Event) => {
  const { slug, userId } = parseValidatedParams(h3Event, winnerProfileIconParamsSchema)
  const query = parseValidatedQuery(h3Event, winnerProfileIconQuerySchema)

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
      profileIconObjectKey: true,
      profileIconRevision: true
    },
    where: and(
      eq(users.id, userId),
      isNull(users.deletedAt)
    )
  })

  if (!targetUser?.profileIconObjectKey || targetUser.profileIconRevision < 1) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  if (query.v !== String(targetUser.profileIconRevision)) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The requested profile icon version was not found.'
    })
  }

  const icon = await getProfileIconObject(h3Event, targetUser.profileIconObjectKey)

  if (!icon) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  return new Response(icon.body, {
    headers: {
      'cache-control': privatePublicEventCacheControl,
      'content-type': icon.httpMetadata?.contentType ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff'
    }
  })
})
