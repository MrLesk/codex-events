import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { userApplications } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  buildApplicationLumaSyncQueueMessage,
  enqueueApplicationLumaSyncMessage,
  getApplicationLumaSyncFailureStatus
} from '#server/utils/application-luma-sync-queue'
import {
  assertApplicationWithdrawable,
  assertNoActiveTeamMembershipForApplicationWithdrawal,
  getOwnUserApplication,
  isHackathonLumaSyncEnabled,
  serializeUserApplication
} from '#server/utils/applications'
import {
  getVisibleHackathonOrThrow,
  routeIdParamsSchema
} from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/utils/validation'
import { ApiError } from '#server/utils/api-error'
import { getDatabase } from '#server/database/client'

type UserApplicationLumaSyncStatus = typeof userApplications.$inferSelect['lumaSyncStatus']

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)

  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)

  const application = await getOwnUserApplication(database, hackathonId, actor.platformUser.id)

  if (!application) {
    throw new ApiError({
      statusCode: 404,
      code: 'user_application_not_found',
      message: 'The requested user application was not found.',
      details: {
        hackathonId,
        userId: actor.platformUser.id
      }
    })
  }

  assertApplicationWithdrawable(application)
  await assertNoActiveTeamMembershipForApplicationWithdrawal(database, hackathonId, actor.platformUser.id)

  const withdrawnAt = new Date().toISOString()
  const shouldSyncLuma = isHackathonLumaSyncEnabled(hackathon)
  let lumaSyncStatus: UserApplicationLumaSyncStatus = shouldSyncLuma ? 'not_synced' : null
  let updatedAt = withdrawnAt

  await database
    .update(userApplications)
    .set({
      status: 'withdrawn',
      preApprovalStatus: null,
      lumaSyncStatus,
      withdrawnAt,
      updatedAt
    })
    .where(eq(userApplications.id, application.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'user_application',
    entityId: application.id,
    action: 'user_application.withdrawn',
    metadata: {
      hackathonId,
      previousStatus: application.status,
      nextStatus: 'withdrawn'
    }
  })

  if (shouldSyncLuma) {
    const lumaEnqueueResult = await enqueueApplicationLumaSyncMessage(
      event,
      buildApplicationLumaSyncQueueMessage({
        applicationId: application.id,
        decision: 'rejected'
      })
    )

    if (lumaEnqueueResult.status !== 'enqueued') {
      lumaSyncStatus = getApplicationLumaSyncFailureStatus('rejected')
      updatedAt = new Date().toISOString()

      await database
        .update(userApplications)
        .set({
          lumaSyncStatus,
          updatedAt
        })
        .where(eq(userApplications.id, application.id))
    }

    await writeAuditLog(database, {
      actorUserId: actor.platformUser.id,
      entityType: 'user_application',
      entityId: application.id,
      action: 'user_application.luma_sync_enqueued',
      metadata: {
        hackathonId,
        userId: application.userId,
        decision: 'rejected',
        enqueue: lumaEnqueueResult,
        trigger: 'participant_withdrawal'
      }
    })
  }

  return apiData(serializeUserApplication({
    ...application,
    status: 'withdrawn',
    preApprovalStatus: null,
    lumaSyncStatus,
    withdrawnAt,
    updatedAt
  }))
})
