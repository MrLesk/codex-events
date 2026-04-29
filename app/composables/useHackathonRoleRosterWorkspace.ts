import type { ApiListResponse } from '~/lib/api'
import type { HackathonRoleAssignment } from '~/utils/admin-workspace'

import { buildApiCacheKey, getApiSubjectKey } from '~/lib/api'

export function useHackathonRoleRosterWorkspace(hackathonId: MaybeRefOrGetter<string>) {
  const authenticatedUser = useUser()
  const resolvedHackathonId = computed(() => toValue(hackathonId))
  const subjectKey = computed(() => getApiSubjectKey(authenticatedUser.value?.sub))

  const roleAssignments = useFetch<ApiListResponse<HackathonRoleAssignment>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/roles`,
    {
      key: () => buildApiCacheKey('hackathon-role-roster-roles', subjectKey.value, resolvedHackathonId.value),
      watch: [subjectKey, resolvedHackathonId]
    }
  )

  async function refreshRoleRoster() {
    await roleAssignments.refresh()
  }

  return {
    roleAssignments,
    refreshRoleRoster
  }
}
