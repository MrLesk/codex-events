import type {
  EventParticipationApiDataResponse,
  EventParticipationPayload
} from '~/domains/events/participation'

import { normalizeEventParticipationApiError } from '~/domains/events/participation'
import { useSessionActor } from '~/composables/useSessionActor'

export function useEventParticipationWorkspace() {
  const actor = useSessionActor().actor
  const authSubject = computed(() => actor.value.isAuthenticated
    ? actor.value.sessionUser.sub
    : 'anonymous')

  const participationRequest = useApiData<EventParticipationPayload>(
    () => `event-participation:${authSubject.value}`,
    async ({ apiFetch, signal }) => {
      if (actor.value.kind !== 'platform_user') {
        return {
          current: [],
          past: []
        }
      }

      const response = await apiFetch<EventParticipationApiDataResponse<EventParticipationPayload>>(
        '/api/events/participation',
        {
          signal
        }
      )

      return response.data
    },
    {
      default: () => ({
        current: [],
        past: []
      }),
      watch: [authSubject, actor],
      server: false
    }
  )

  return {
    currentEvents: computed(() => participationRequest.data.value.current),
    pastEvents: computed(() => participationRequest.data.value.past),
    status: computed(() => participationRequest.status.value),
    errorMessage: computed(() =>
      participationRequest.error.value
        ? normalizeEventParticipationApiError(participationRequest.error.value).message
        : ''
    ),
    refresh: participationRequest.refresh
  }
}
