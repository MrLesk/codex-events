import type { ApiListResponse } from '~/lib/api'
import type { EventRoleAssignment } from '~/domains/events/access'

import { buildApiCacheKey, getApiSubjectKey } from '~/lib/api'
import { useApiFetch } from '~/composables/useApiClient'
import { useSessionActor } from '~/composables/useSessionActor'

export function useEventRoleRosterWorkspace(eventId: MaybeRefOrGetter<string>) {
  const actor = useSessionActor().actor
  const resolvedEventId = computed(() => toValue(eventId))
  const subjectKey = computed(() => getApiSubjectKey(
    actor.value.isAuthenticated ? actor.value.sessionUser.sub : null
  ))

  const roleAssignments = useApiFetch<ApiListResponse<EventRoleAssignment>>(
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
