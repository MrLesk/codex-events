import type { EventRoleAssignment } from '~/domains/events/access'

type RoleAssignmentListResponse = {
  data: EventRoleAssignment[]
  meta: { total: number }
}

export function useEventRoleRosterWorkspace(
  eventId: MaybeRefOrGetter<string>,
  options?: {
    initialAssignments?: MaybeRefOrGetter<EventRoleAssignment[] | null | undefined>
    refreshPage?: () => Promise<unknown> | unknown
  }
) {
  const resolvedEventId = computed(() => toValue(eventId).trim())
  const initialAssignments = computed(() => toValue(options?.initialAssignments ?? null) ?? null)
  const data = ref<RoleAssignmentListResponse | null>(null)
  const error = ref<Error | null>(null)
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')

  watch([resolvedEventId, initialAssignments], ([, assignments]) => {
    if (!assignments) {
      data.value = null
      status.value = 'idle'
      error.value = null
      return
    }

    data.value = {
      data: assignments,
      meta: { total: assignments.length }
    }
    status.value = 'success'
    error.value = null
  }, { immediate: true })

  async function refreshRoleRoster() {
    await options?.refreshPage?.()
  }

  return {
    roleAssignments: {
      data,
      error,
      status
    },
    refreshRoleRoster
  }
}
