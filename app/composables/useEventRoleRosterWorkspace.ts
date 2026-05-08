import type { ApiListResponse } from '~/lib/api'
import type { EventRoleAssignment } from '~/domains/events/access'

import { buildApiCacheKey, getApiSubjectKey } from '~/lib/api'

export function useEventRoleRosterWorkspace(eventId: MaybeRefOrGetter<string>) {
  const authenticatedUser = useUser()
  const resolvedEventId = computed(() => toValue(eventId))
  const subjectKey = computed(() => getApiSubjectKey(authenticatedUser.value?.sub))

  const roleAssignments = useFetch<ApiListResponse<EventRoleAssignment>>(
    () => `/api/events/${resolvedEventId.value}/roles`,
    {
      key: () => buildApiCacheKey('event-role-roster-roles', subjectKey.value, resolvedEventId.value),
      watch: [subjectKey, resolvedEventId]
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
