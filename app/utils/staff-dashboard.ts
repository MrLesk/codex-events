import type { ResolvedSessionActor } from '~/composables/useSessionActor'
import type { UserHackathonEntry } from '~/composables/useUserHackathons'

import { isHackathonRoleStaffEnabled } from './admin-workspace'

export function filterStaffAccessibleHackathons(
  hackathons: UserHackathonEntry[],
  actor: ResolvedSessionActor | null | undefined
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
