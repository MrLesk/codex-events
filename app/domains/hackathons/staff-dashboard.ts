import type { SessionActor } from '~/domains/accounts/session-actor'

import { isHackathonRoleStaffEnabled } from '~/domains/hackathons/access'

interface StaffDashboardHackathonEntry {
  id: string
}

export function filterStaffAccessibleHackathons<T extends StaffDashboardHackathonEntry>(
  hackathons: T[],
  actor: SessionActor | null | undefined
) {
  if (actor?.kind !== 'platform_user') {
    return []
  }

  return hackathons.filter(hackathon =>
    actor.hackathonRoles.some(role =>
      role.hackathonId === hackathon.id
      && isHackathonRoleStaffEnabled(role)
    )
  )
}
