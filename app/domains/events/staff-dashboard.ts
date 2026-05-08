import type { SessionActor } from '~/domains/accounts/session-actor'

import { isEventRoleStaffEnabled } from '~/domains/events/access'

interface StaffDashboardEventEntry {
  id: string
}

export function filterStaffAccessibleEvents<T extends StaffDashboardEventEntry>(
  events: T[],
  actor: SessionActor | null | undefined
) {
  if (actor?.kind !== 'platform_user') {
    return []
  }

  return events.filter(event =>
    actor.eventRoles.some(role =>
      role.eventId === event.id
      && isEventRoleStaffEnabled(role)
    )
  )
}
