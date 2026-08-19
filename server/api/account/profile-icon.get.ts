import { and, eq, isNull } from 'drizzle-orm'
import { setHeader } from 'h3'
import { z } from 'zod'

import { requirePlatformActor } from '#server/auth/actor'
import { resolveEventAuthorization } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
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
  const database = getDatabase(h3Event)
  let targetProfileIconRevision = actor.platformUser.profileIconRevision
  let targetProfileIconObjectKey: string | null = null

  if (requestedUserId === actor.platformUser.id) {
    const targetUser = await database.query.users.findFirst({
      columns: {
        profileIconObjectKey: true,
        profileIconRevision: true
      },
      where: eq(users.id, actor.platformUser.id)
    })

    targetProfileIconRevision = targetUser?.profileIconRevision ?? 0
    targetProfileIconObjectKey = targetUser?.profileIconObjectKey ?? null
  }

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

    const { database: eventDatabase } = await requireEventWorkspaceAccess(h3Event, query.event)
    const authorization = await resolveEventAuthorization(h3Event, query.event)
    const hasEventApplication = authorization.canViewParticipantsAndTeams
      ? await eventDatabase.query.userApplications.findFirst({
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
      eventDatabase,
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

    const targetUser = await eventDatabase.query.users.findFirst({
      columns: {
        id: true,
        profileIconObjectKey: true,
        profileIconRevision: true
      },
      where: and(
        eq(users.id, requestedUserId),
        isNull(users.deletedAt)
      )
    })

    targetProfileIconRevision = targetUser?.profileIconRevision ?? 0
    targetProfileIconObjectKey = targetUser?.profileIconObjectKey ?? null
  }

  if (!targetProfileIconObjectKey || targetProfileIconRevision < 1) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  if (query.v && query.v !== String(targetProfileIconRevision)) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The requested profile icon version was not found.'
    })
  }

  const icon = await getProfileIconObject(h3Event, targetProfileIconObjectKey)

  if (!icon) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  setHeader(h3Event, 'cache-control', 'private, no-store')
  setHeader(h3Event, 'vary', 'Cookie')

  return new Response(icon.body, {
    headers: {
      'content-type': icon.httpMetadata?.contentType ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff'
    }
  })
})
