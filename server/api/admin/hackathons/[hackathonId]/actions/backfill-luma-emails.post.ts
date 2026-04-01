import { and, eq, isNotNull, isNull } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../auth/actor'
import { assertPlatformAdminAccess } from '../../../../../auth/authorization'
import { writeAuditLog } from '../../../../../database/audit-log'
import { getDatabase } from '../../../../../database/client'
import {
  hackathons,
  userApplications,
  users
} from '../../../../../database/schema'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiData } from '../../../../../utils/api-response'
import {
  resolveApplicationLumaSyncRuntimeConfig,
  resolveLumaEmailFromUsername
} from '../../../../../utils/application-luma-sync-queue'
import { isHackathonLumaSyncEnabled } from '../../../../../utils/applications'
import { ApiError } from '../../../../../utils/api-error'
import { routeIdParamsSchema } from '../../../../../utils/hackathon-management'
import { assertGuard } from '../../../../../utils/lifecycle-guard'
import { parseValidatedParams } from '../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  assertPlatformAdminAccess(actor)

  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)

  const hackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  if (!hackathon) {
    throw new ApiError({
      statusCode: 404,
      code: 'hackathon_not_found',
      message: 'The requested hackathon was not found.',
      details: { hackathonId }
    })
  }

  assertGuard(isHackathonLumaSyncEnabled(hackathon), {
    statusCode: 400,
    code: 'hackathon_luma_sync_not_enabled',
    message: 'This hackathon does not have Luma sync enabled.',
    details: { hackathonId }
  })

  const runtimeConfig = resolveApplicationLumaSyncRuntimeConfig(useRuntimeConfig(event))

  assertGuard(Boolean(runtimeConfig.luma?.apiKey?.trim()), {
    statusCode: 500,
    code: 'luma_api_key_missing',
    message: 'The Luma API key is not configured for this environment.'
  })

  const candidateRows = await database
    .select({
      userId: users.id,
      userEmail: users.email,
      displayName: users.displayName,
      lumaUsername: users.lumaUsername
    })
    .from(userApplications)
    .innerJoin(users, eq(users.id, userApplications.userId))
    .where(and(
      eq(userApplications.hackathonId, hackathonId),
      isNull(users.deletedAt),
      isNull(users.lumaEmail),
      isNotNull(users.lumaUsername)
    ))

  const results: Array<{
    userId: string
    userEmail: string
    displayName: string
    lumaUsername: string | null
    status: 'updated' | 'failed'
    lumaEmail?: string
    reason?: string
  }> = []

  let updatedCount = 0
  let failedCount = 0

  for (const row of candidateRows) {
    const lumaUsername = row.lumaUsername?.trim() ?? ''

    try {
      const { guestEmail } = await resolveLumaEmailFromUsername({
        lumaEventUrl: hackathon.lumaEventUrl!.trim(),
        lumaUsername
      }, {
        runtimeConfig
      })

      await database
        .update(users)
        .set({
          lumaEmail: guestEmail,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, row.userId))

      updatedCount += 1
      results.push({
        userId: row.userId,
        userEmail: row.userEmail,
        displayName: row.displayName,
        lumaUsername: row.lumaUsername,
        status: 'updated',
        lumaEmail: guestEmail
      })
    } catch (error) {
      failedCount += 1
      results.push({
        userId: row.userId,
        userEmail: row.userEmail,
        displayName: row.displayName,
        lumaUsername: row.lumaUsername,
        status: 'failed',
        reason: error instanceof Error ? error.message : 'Unexpected Luma backfill error'
      })
    }
  }

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.luma_email_backfill_completed',
    metadata: {
      candidateCount: candidateRows.length,
      updatedCount,
      failedCount
    }
  })

  return apiData({
    hackathonId,
    candidateCount: candidateRows.length,
    updatedCount,
    failedCount,
    results
  })
})
