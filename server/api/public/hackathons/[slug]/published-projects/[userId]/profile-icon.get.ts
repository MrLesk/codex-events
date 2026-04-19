import { and, eq, inArray, isNull } from 'drizzle-orm'
import { setHeader } from 'h3'
import { z } from 'zod'

import { getDatabase } from '../../../../../../database/client'
import { prizeEligibilitySnapshots, prizeRedemptions, submissions, users } from '../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../utils/api-handler'
import { ApiError } from '../../../../../../utils/api-error'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '../../../../../../utils/hackathon-management'
import { getProfileIconObject } from '../../../../../../utils/profile-icons'
import { assertCompletedOutcomeVisible } from '../../../../../../utils/shortlist'
import {
  parseValidatedParams,
  parseValidatedQuery
} from '../../../../../../utils/validation'

const publishedProjectProfileIconParamsSchema = routeSlugParamsSchema.extend({
  userId: z.string().trim().min(1)
})

const publishedProjectProfileIconQuerySchema = z.object({
  v: z.string().trim().min(1).optional()
})

export default defineApiHandler(async (event) => {
  const { slug, userId } = parseValidatedParams(event, publishedProjectProfileIconParamsSchema)
  parseValidatedQuery(event, publishedProjectProfileIconQuerySchema)

  const database = getDatabase(event)
  const hackathon = await getPublicHackathonBySlugOrThrow(database, slug)

  assertCompletedOutcomeVisible(hackathon)

  const snapshots = await database.query.prizeEligibilitySnapshots.findMany({
    columns: {
      teamId: true
    },
    where: and(
      eq(prizeEligibilitySnapshots.hackathonId, hackathon.id),
      eq(prizeEligibilitySnapshots.userId, userId)
    )
  })
  const snapshotTeamIds = [...new Set(
    (snapshots as Array<{ teamId: string }>).map(snapshot => snapshot.teamId)
  )]

  if (snapshotTeamIds.length === 0) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  const publishedSubmissions = await database.query.submissions.findMany({
    columns: {
      teamId: true
    },
    where: and(
      inArray(submissions.teamId, snapshotTeamIds),
      eq(submissions.status, 'locked'),
      eq(submissions.isPubliclyVisible, true)
    )
  })
  const publishedTeamIds = [...new Set(
    (publishedSubmissions as Array<{ teamId: string }>).map(submission => submission.teamId)
  )]

  if (publishedTeamIds.length === 0) {
    throw new ApiError({
      statusCode: 404,
      code: 'profile_icon_not_found',
      message: 'The platform user does not have an uploaded profile icon.'
    })
  }

  const winningRedemptions = await database.query.prizeRedemptions.findMany({
    columns: {
      teamId: true
    },
    where: inArray(prizeRedemptions.teamId, publishedTeamIds)
  })
  const winningTeamIds = new Set(
    (winningRedemptions as Array<{ teamId: string | null }>).flatMap(redemption => redemption.teamId ? [redemption.teamId] : [])
  )
  const nonWinningPublishedTeamIds = publishedTeamIds.filter(teamId => !winningTeamIds.has(teamId))

  if (nonWinningPublishedTeamIds.length === 0) {
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
