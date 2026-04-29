import type {
  HackathonParticipationApiDataResponse,
  HackathonParticipationPayload
} from '~/domains/hackathons/participation'

import { normalizeHackathonParticipationApiError } from '~/domains/hackathons/participation'

export function useHackathonParticipationWorkspace() {
  const user = useUser()
  const authSubject = computed(() => user.value?.sub ?? 'anonymous')

  const participationRequest = useApiData<HackathonParticipationPayload>(
    () => `hackathon-participation:${authSubject.value}`,
    async ({ apiFetch, signal }) => {
      if (!user.value?.sub) {
        return {
          current: [],
          past: []
        }
      }

      const response = await apiFetch<HackathonParticipationApiDataResponse<HackathonParticipationPayload>>(
        '/api/hackathons/participation',
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
