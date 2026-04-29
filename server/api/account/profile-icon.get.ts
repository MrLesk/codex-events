import { and, eq, isNull } from 'drizzle-orm'
import { setHeader } from 'h3'
import { z } from 'zod'

import { requirePlatformActor } from '#server/auth/actor'
import { resolveHackathonAuthorization } from '#server/auth/authorization'
import { users, userApplications } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import {
  isUserVisibleInPublishedHackathonRoster,
  requireHackathonWorkspaceAccess
} from '#server/domains/hackathons'
import { getProfileIconObject } from '#server/domains/accounts/profile-icons'
import { parseValidatedQuery } from '#server/http/validation'

const profileIconQuerySchema = z.object({
  user: z.string().trim().min(1).optional(),
  hackathon: z.string().trim().min(1).optional(),
  v: z.string().trim().min(1).optional()
})

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const query = parseValidatedQuery(event, profileIconQuerySchema)
  const requestedUserId = query.user ?? actor.platformUser.id
  let targetUserId = actor.platformUser.id
  let targetProfileIconUpdatedAt = actor.platformUser.profileIconUpdatedAt

  if (requestedUserId !== actor.platformUser.id) {
    if (!query.hackathon) {
      throw new ApiError({
        statusCode: 400,
        code: 'hackathon_id_required',
        message: 'A hackathon is required when requesting another user profile icon.',
        details: {
          userId: requestedUserId
        }
      })
    }

    const { database } = await requireHackathonWorkspaceAccess(event, query.hackathon)
    const authorization = await resolveHackathonAuthorization(event, query.hackathon)
    const hasHackathonApplication = authorization.canViewParticipantsAndTeams
      ? await database.query.userApplications.findFirst({
          columns: {
            id: true
          },
          where: and(
            eq(userApplications.hackathonId, query.hackathon),
            eq(userApplications.userId, requestedUserId)
          )
        })
      : null
    const isPublishedRosterMember = await isUserVisibleInPublishedHackathonRoster(
      database,
      query.hackathon,
      requestedUserId
    )

    if (!hasHackathonApplication && !isPublishedRosterMember) {
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

  const icon = await getProfileIconObject(event, targetUserId)

  if (!icon) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  setHeader(event, 'cache-control', 'private, max-age=31536000, immutable')
  setHeader(event, 'vary', 'Cookie')

  return new Response(await icon.arrayBuffer(), {
    headers: {
      'content-type': icon.httpMetadata?.contentType ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff'
    }
  })
})
