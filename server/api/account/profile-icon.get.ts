import { and, eq, isNull } from 'drizzle-orm'
import { setHeader } from 'h3'
import { z } from 'zod'

import { requirePlatformActor } from '#server/auth/actor'
import { resolveEventAuthorization } from '#server/auth/authorization'
import { users, userApplications } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import {
  isUserVisibleInPublishedEventRoster,
  requireEventWorkspaceAccess
} from '#server/domains/events'
import { getProfileIconObject } from '#server/domains/accounts/profile-icons'
import { parseValidatedQuery } from '#server/http/validation'

const profileIconQuerySchema = z.object({
  user: z.string().trim().min(1).optional(),
  event: z.string().trim().min(1).optional(),
  v: z.string().trim().min(1).optional()
})

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const query = parseValidatedQuery(h3Event, profileIconQuerySchema)
  const requestedUserId = query.user ?? actor.platformUser.id
  let targetUserId = actor.platformUser.id
  let targetProfileIconUpdatedAt = actor.platformUser.profileIconUpdatedAt

  if (requestedUserId !== actor.platformUser.id) {
    if (!query.event) {
      throw new ApiError({
        statusCode: 400,
        code: 'event_id_required',
        message: 'An event is required when requesting another user profile icon.',
        details: {
          userId: requestedUserId
        }
      })
    }

    const { database } = await requireEventWorkspaceAccess(h3Event, query.event)
    const authorization = await resolveEventAuthorization(h3Event, query.event)
    const hasEventApplication = authorization.canViewParticipantsAndTeams
      ? await database.query.userApplications.findFirst({
          columns: {
            id: true
          },
          where: and(
            eq(userApplications.eventId, query.event),
            eq(userApplications.userId, requestedUserId)
          )
        })
      : null
    const isPublishedRosterMember = await isUserVisibleInPublishedEventRoster(
      database,
      query.event,
      requestedUserId
    )

    if (!hasEventApplication && !isPublishedRosterMember) {
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
        eq(users.id, requestedUserId),
        isNull(users.deletedAt)
      )
    })

    targetUserId = requestedUserId
    targetProfileIconUpdatedAt = targetUser?.profileIconUpdatedAt ?? null
  }

  if (!targetProfileIconUpdatedAt) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  const icon = await getProfileIconObject(h3Event, targetUserId)

  if (!icon) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  setHeader(h3Event, 'cache-control', 'private, max-age=31536000, immutable')
  setHeader(h3Event, 'vary', 'Cookie')

  return new Response(await icon.arrayBuffer(), {
    headers: {
      'content-type': icon.httpMetadata?.contentType ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff'
    }
  })
})
