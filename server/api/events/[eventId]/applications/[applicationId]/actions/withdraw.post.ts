import { and, eq, isNull, ne } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { teamJoinRequests, teamMembers, teams, userApplications } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import { apiData } from '#server/http/api-response'
import {
  buildApplicationLumaSyncQueueMessage,
  enqueueApplicationLumaSyncMessage,
  getApplicationLumaSyncFailureStatus
} from '#server/domains/applications/luma-sync-queue'
import {
  applicationParamsSchema,
  assertApplicationWithdrawable,
  getAdminApplicationWithdrawalPlan,
  getUserApplicationWithTermsOrThrow,
  requireEventAdminApplicationContext,
  isEventLumaSyncEnabled,
  serializeUserApplication
} from '#server/domains/applications'
import { parseValidatedParams } from '#server/http/validation'

type UserApplicationLumaSyncStatus = typeof userApplications.$inferSelect['lumaSyncStatus']

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId, applicationId } = parseValidatedParams(h3Event, applicationParamsSchema)
  const { database, event } = await requireEventAdminApplicationContext(h3Event, eventId)
  const { application, applicationTermsDocument } = await getUserApplicationWithTermsOrThrow(
    database,
    eventId,
    applicationId
  )

  assertApplicationWithdrawable(application)

  const withdrawalPlan = await getAdminApplicationWithdrawalPlan(database, eventId, application)

  if (!withdrawalPlan.isAllowed) {
    throw new ApiError({
      statusCode: 409,
      code: 'user_application_admin_withdrawal_blocked',
      message: withdrawalPlan.reason ?? 'This participant cannot be withdrawn right now.',
      details: {
        eventId,
        applicationId: application.id,
        userId: application.userId,
        activeTeamId: withdrawalPlan.activeTeamId,
        teamAction: withdrawalPlan.teamAction
      }
    })
  }

  const withdrawnAt = new Date().toISOString()
  const shouldSyncLuma = isEventLumaSyncEnabled(event)
  let lumaSyncStatus: UserApplicationLumaSyncStatus = shouldSyncLuma ? 'not_synced' : null
  let updatedAt = withdrawnAt
  await database.batch([
    database
      .update(userApplications)
      .set({
        status: 'withdrawn',
        preApprovalStatus: null,
        lumaSyncStatus,
        withdrawnAt,
        updatedAt
      })
      .where(eq(userApplications.id, application.id)),
    ...(withdrawalPlan.teamAction === 'remove_member' && withdrawalPlan.targetMembership
      ? [
          database
            .update(teamMembers)
            .set({
              leftAt: withdrawnAt
            })
            .where(eq(teamMembers.id, withdrawalPlan.targetMembership.id))
        ]
      : []),
    ...(withdrawalPlan.teamAction === 'dissolve_team' && withdrawalPlan.activeTeam
      ? [
          ...(withdrawalPlan.targetMembership
            ? [
                database
                  .update(teamMembers)
                  .set({
                    leftAt: withdrawnAt
                  })
                  .where(and(
                    eq(teamMembers.teamId, withdrawalPlan.activeTeam.id),
                    isNull(teamMembers.leftAt),
                    ne(teamMembers.id, withdrawalPlan.targetMembership.id)
                  ))
              ]
            : []),
          ...(withdrawalPlan.targetMembership
            ? [
                database
                  .update(teamMembers)
                  .set({
                    leftAt: withdrawnAt
                  })
                  .where(eq(teamMembers.id, withdrawalPlan.targetMembership.id))
              ]
            : []),
          database
            .update(teams)
            .set({
              isOpenToJoinRequests: false,
              updatedAt: withdrawnAt
            })
            .where(eq(teams.id, withdrawalPlan.activeTeam.id)),
          database
            .update(teamJoinRequests)
            .set({
              status: 'rejected',
              reviewedAt: withdrawnAt,
              reviewedByUserId: actor.platformUser.id
            })
            .where(and(
              eq(teamJoinRequests.teamId, withdrawalPlan.activeTeam.id),
              eq(teamJoinRequests.status, 'pending')
            ))
        ]
      : [])
  ])

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'user_application',
    entityId: application.id,
    action: 'user_application.admin_withdrawn',
    metadata: {
      eventId,
      userId: application.userId,
      previousStatus: application.status,
      nextStatus: 'withdrawn',
      activeTeamId: withdrawalPlan.activeTeamId,
      teamAction: withdrawalPlan.teamAction
    }
  })

  for (const membership of withdrawalPlan.teamAction === 'dissolve_team'
    ? withdrawalPlan.activeMembers
    : withdrawalPlan.targetMembership
      ? [withdrawalPlan.targetMembership]
      : []) {
    await writeAuditLog(database, {
      actorUserId: actor.platformUser.id,
      entityType: 'team_member',
      entityId: membership.id,
      action: 'team_member.removed',
      metadata: {
        eventId,
        teamId: membership.teamId,
        userId: membership.userId,
        removedByUserId: actor.platformUser.id,
        triggeredByApplicationId: application.id,
        teamDissolved: withdrawalPlan.teamAction === 'dissolve_team'
      }
    })
  }

  if (shouldSyncLuma) {
    const lumaEnqueueResult = await enqueueApplicationLumaSyncMessage(
      h3Event,
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
        eventId,
        userId: application.userId,
        decision: 'rejected',
        enqueue: lumaEnqueueResult,
        trigger: 'admin_withdrawal'
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
  }, {
    applicationTermsDocument
  }))
})
