import { and, count, eq, isNull } from 'drizzle-orm'

import { assertEventParticipantVisibilityAccess } from '#server/auth/authorization'
import type {
  AccountEventParticipantsPage,
  AccountEventParticipantsPageResponse
} from '#shared/domains/events/account-event-participants-page'
import {
  accountEventParticipantsPageResponseSchema
} from '#shared/domains/events/account-event-participants-page'
import { listEventApplications } from '#server/domains/applications'
import { eventRoleAssignments, userApplicationStatuses, userApplications, users } from '#server/database/schema'
import { listEventTracks } from '#server/domains/events'
import {
  assertAccountEventOperationsAccess,
  loadAccountEventOperationsPage
} from './account-event-operations-page'
import { defineAccountEventPageRoute } from './account-event-page-contract'

const firstParticipantPageSize = 100

async function getParticipantApplicationCounts(
  database: Parameters<typeof listEventApplications>[0],
  eventId: string
) {
  const rows = await database
    .select({
      status: userApplications.status,
      total: count()
    })
    .from(userApplications)
    .innerJoin(users, eq(users.id, userApplications.userId))
    .leftJoin(eventRoleAssignments, and(
      eq(eventRoleAssignments.eventId, eventId),
      eq(eventRoleAssignments.userId, userApplications.userId),
      eq(eventRoleAssignments.isStaff, true)
    ))
    .where(and(
      eq(userApplications.eventId, eventId),
      isNull(users.deletedAt),
      isNull(eventRoleAssignments.id)
    ))
    .groupBy(userApplications.status)

  return Object.fromEntries(
    userApplicationStatuses.map(status => [
      status,
      rows.find(row => row.status === status)?.total ?? 0
    ])
  ) as AccountEventParticipantsPage['statusCounts']
}

export const accountEventParticipantsPageRoute = defineAccountEventPageRoute({
  page: 'participants',
  schema: accountEventParticipantsPageResponseSchema,
  authorize: async (context) => {
    assertEventParticipantVisibilityAccess(context.authorization)
  },
  load: async (context): Promise<AccountEventParticipantsPageResponse> => {
    if (context.authorization.isEventAdmin) {
      assertAccountEventOperationsAccess(context)
      return await loadAccountEventOperationsPage(context)
    }

    const [applicationResult, tracks, statusCounts] = await Promise.all([
      listEventApplications(context.database, context.event.id, {
        page: 1,
        page_size: firstParticipantPageSize
      }),
      listEventTracks(context.database, context.event.id),
      getParticipantApplicationCounts(context.database, context.event.id)
    ])

    return {
      event: {
        state: context.event.state,
        applicationAiKnowledgeVisible: context.event.applicationAiKnowledgeVisible,
        applicationLumaEmailVisible: context.event.applicationLumaEmailVisible,
        requireLumaEmail: context.event.requireLumaEmail,
        lumaEventApiId: context.event.lumaEventApiId,
        lumaWebhookStatus: context.event.lumaWebhookStatus,
        simplifiedClaimingEnabled: context.event.simplifiedClaimingEnabled,
        participantsLimit: context.event.participantsLimit,
        autoApproveApplications: context.event.autoApproveApplications,
        tracks: tracks.map(track => ({
          id: track.id,
          name: track.name,
          shortDescription: track.shortDescription,
          displayOrder: track.displayOrder
        }))
      },
      applications: applicationResult.data.filter(application => !application.isEventStaff),
      pagination: {
        page: 1,
        pageSize: firstParticipantPageSize,
        total: Object.values(statusCounts).reduce((total, count) => total + count, 0)
      },
      statusCounts
    }
  }
})
