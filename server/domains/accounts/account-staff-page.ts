import { and, desc, eq, getTableColumns, isNull } from 'drizzle-orm'

import type {
  AccountStaffEventState,
  AccountStaffPage,
  AccountStaffRole
} from '#shared/domains/account/account-staff-page'
import { eventRoleAssignments, events } from '#server/database/schema'
import type { AppDatabase } from '#server/database/client'
import { parseEventAgendaItems } from '#server/domains/events'
import { resolveEventCertificateDateIso } from '#shared/domains/events/certificates'
import { accountStaffPageSchema } from '#shared/domains/account/account-staff-page'
import {
  assertAccountPageAccess,
  defineAccountPageRoute,
  type AccountPageContext
} from './account-page-contract'

const pastStaffEventStates = new Set<AccountStaffEventState>([
  'winners_announced',
  'completed'
])

function getEventStartsAt(event: typeof events.$inferSelect) {
  return resolveEventCertificateDateIso(
    parseEventAgendaItems(event.agendaItemsJson),
    event.submissionOpensAt ?? event.registrationClosesAt
  )
}

function resolveStaffRole(role: typeof eventRoleAssignments.$inferSelect['role']): AccountStaffRole | null {
  return role === 'event_admin' || role === 'staff'
    ? role
    : null
}

export async function getAccountStaffPage(
  database: AppDatabase,
  userId: string
): Promise<AccountStaffPage> {
  const rows = await database
    .select({
      ...getTableColumns(events),
      staffRole: eventRoleAssignments.role,
      staffTrackId: eventRoleAssignments.staffTrackId
    })
    .from(events)
    .innerJoin(eventRoleAssignments, and(
      eq(eventRoleAssignments.eventId, events.id),
      eq(eventRoleAssignments.userId, userId),
      eq(eventRoleAssignments.isStaff, true)
    ))
    .where(isNull(events.hiddenAt))
    .orderBy(desc(events.createdAt))

  const items = rows.flatMap((row) => {
    const role = resolveStaffRole(row.staffRole)

    if (!role) {
      return []
    }

    return [{
      id: row.id,
      eventType: row.eventType,
      slug: row.slug,
      name: row.name,
      state: row.state,
      city: row.city,
      country: row.country,
      startsAt: getEventStartsAt(row),
      registrationOpensAt: row.registrationOpensAt,
      registrationClosesAt: row.registrationClosesAt,
      submissionClosesAt: row.submissionClosesAt,
      maxTeamMembers: row.maxTeamMembers,
      staff: {
        role,
        isStaff: true as const,
        staffTrackId: row.staffTrackId
      }
    }]
  })

  return {
    current: items.filter(item => !pastStaffEventStates.has(item.state)),
    past: items.filter(item => pastStaffEventStates.has(item.state))
  }
}

export const accountStaffPageRoute = defineAccountPageRoute({
  page: 'staff-workspace',
  schema: accountStaffPageSchema,
  authorize: assertAccountPageAccess,
  load: (context: AccountPageContext) => getAccountStaffPage(
    context.database,
    context.actor.platformUser.id
  )
})
