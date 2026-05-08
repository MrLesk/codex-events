import type {
  EventParticipationApiDataResponse,
  EventParticipationPayload
} from '~/domains/events/participation'

import { normalizeEventParticipationApiError } from '~/domains/events/participation'

export function useEventParticipationWorkspace() {
  const user = useUser()
  const authSubject = computed(() => user.value?.sub ?? 'anonymous')

  const participationRequest = useApiData<EventParticipationPayload>(
    () => `event-participation:${authSubject.value}`,
    async ({ apiFetch, signal }) => {
      if (!user.value?.sub) {
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
      watch: [computed(() => user.value?.sub ?? null)],
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
