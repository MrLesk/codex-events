import { and, asc, eq, getTableColumns, isNull } from 'drizzle-orm'

import { listPublishedEventRosterMembers, serializeEventRoleAssignment } from '#server/domains/events'
import { assertEventParticipantVisibilityAccess } from '#server/auth/authorization'
import { eventRoleAssignments, users } from '#server/database/schema'
import type { AccountEventRostersPage } from '#shared/domains/events/account-event-rosters-page'
import { accountEventRostersPageSchema } from '#shared/domains/events/account-event-rosters-page'
import { defineAccountEventPageRoute } from './account-event-page-contract'

export const accountEventRostersPageRoute = defineAccountEventPageRoute({
  page: 'rosters',
  schema: accountEventRostersPageSchema,
  authorize: async (context) => {
    assertEventParticipantVisibilityAccess(context.authorization)
  },
  load: async (context): Promise<AccountEventRostersPage> => {
    const [publishedJudges, publishedStaff] = await Promise.all([
      context.event.eventType === 'hackathon'
        ? listPublishedEventRosterMembers(context.database, context.event.id, 'judge')
        : Promise.resolve([]),
      listPublishedEventRosterMembers(context.database, context.event.id, 'staff')
    ])
    let roleAssignments: AccountEventRostersPage['roleAssignments'] = []

    if (context.authorization.isEventAdmin) {
      const assignments = await context.database.query.eventRoleAssignments.findMany({
        where: eq(eventRoleAssignments.eventId, context.event.id),
        orderBy: [asc(eventRoleAssignments.createdAt)]
      })
      const relatedUsers = await context.database
        .select(getTableColumns(users))
        .from(users)
        .innerJoin(eventRoleAssignments, eq(eventRoleAssignments.userId, users.id))
        .where(and(
          eq(eventRoleAssignments.eventId, context.event.id),
          isNull(users.deletedAt)
        ))
      const usersById = new Map(relatedUsers.map(user => [user.id, user] as const))
      roleAssignments = assignments.map(assignment =>
        serializeEventRoleAssignment(assignment, usersById.get(assignment.userId) ?? null)
      )
    }

    return {
      publishedJudges,
      publishedStaff,
      roleAssignments,
      canManageRoles: context.authorization.isEventAdmin
    }
  }
})
