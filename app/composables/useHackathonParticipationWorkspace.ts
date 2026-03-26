import type {
  HackathonParticipationApiDataResponse,
  HackathonParticipationPayload
} from '~/utils/hackathon-participation'

import { normalizeHackathonParticipationApiError } from '~/utils/hackathon-participation'

export function useHackathonParticipationWorkspace() {
  const apiFetch = $fetch
  const user = useUser()
  const authSubject = computed(() => user.value?.sub ?? 'anonymous')

  const participationRequest = useAsyncData<HackathonParticipationPayload>(
    () => `hackathon-participation:${authSubject.value}`,
    async () => {
      if (!user.value?.sub) {
        return {
          current: [],
          past: []
        }
      }

      const response = await apiFetch<HackathonParticipationApiDataResponse<HackathonParticipationPayload>>(
        '/api/hackathons/participation'
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
    currentHackathons: computed(() => participationRequest.data.value.current),
    pastHackathons: computed(() => participationRequest.data.value.past),
    status: computed(() => participationRequest.status.value),
    errorMessage: computed(() =>
      participationRequest.error.value
        ? normalizeHackathonParticipationApiError(participationRequest.error.value).message
        : ''
    ),
    refresh: participationRequest.refresh
  }
}
