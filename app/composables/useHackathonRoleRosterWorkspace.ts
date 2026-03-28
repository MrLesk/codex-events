import type {
  AdminApplicationRecord,
  ApiListResponse,
  HackathonRoleAssignment
} from '~/utils/admin-workspace'

import {
  buildAdminWorkspaceCacheKey,
  getAdminWorkspaceSubjectKey
} from '~/utils/admin-workspace'

export function useHackathonRoleRosterWorkspace(hackathonId: MaybeRefOrGetter<string>) {
  const { actor, refresh: refreshActor } = useSessionActor()
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

  const applications = useFetch<ApiListResponse<AdminApplicationRecord>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/applications`,
    {
      key: () => buildAdminWorkspaceCacheKey('hackathon-role-roster-applications', subjectKey.value, resolvedHackathonId.value),
      watch: [subjectKey, resolvedHackathonId]
    }
  )

  const canManageCurrentHackathon = computed(() => {
    if (actor.value.kind !== 'platform_user') {
      return false
    }

    if (actor.value.isPlatformAdmin) {
      return true
    }

    return actor.value.hackathonRoles.some(role =>
      role.hackathonId === resolvedHackathonId.value && role.role === 'hackathon_admin'
    )
  })

  async function refreshRoleRoster() {
    await Promise.all([
      refreshActor(),
      roleAssignments.refresh(),
      applications.refresh()
    ])
  }

  return {
    actor,
    roleAssignments,
    applications,
    canManageCurrentHackathon,
    refreshRoleRoster
  }
}
