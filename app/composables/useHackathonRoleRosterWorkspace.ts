import type {
  ApiListResponse,
  HackathonRoleAssignment
} from '~/utils/admin-workspace'

import {
  buildAdminWorkspaceCacheKey,
  getAdminWorkspaceSubjectKey
} from '~/utils/admin-workspace'

export function useHackathonRoleRosterWorkspace(hackathonId: MaybeRefOrGetter<string>) {
  const authenticatedUser = useUser()
  const resolvedHackathonId = computed(() => toValue(hackathonId))
  const subjectKey = computed(() => getAdminWorkspaceSubjectKey(authenticatedUser.value?.sub))

  const roleAssignments = useFetch<ApiListResponse<HackathonRoleAssignment>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/roles`,
    {
      key: () => buildAdminWorkspaceCacheKey('hackathon-role-roster-roles', subjectKey.value, resolvedHackathonId.value),
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
