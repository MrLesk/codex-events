import type { PublicHackathon } from './useHackathonPresentation'
import type {
  TeamSubmissionFormInput,
  TeamSubmissionRecord
} from '~/utils/team-submission'
import type { TeamDetailRecord } from '~/utils/team-workspace'

import { normalizeTeamSubmissionApiError } from '~/utils/team-submission'

type LoadStatus = 'idle' | 'pending' | 'success' | 'error'

type TeamSubmissionApiDataResponse<T> = {
  data: T
}

function toSectionErrorMessage(error: unknown, fallback: string) {
  const message = normalizeTeamSubmissionApiError(error).message
  return message && message.length > 0 ? message : fallback
}

export function useTeamSubmissionWorkspace(
  hackathon: MaybeRefOrGetter<Pick<PublicHackathon, 'state'>>,
  options: {
    visibleHackathonId: MaybeRefOrGetter<string | null | undefined>
    team: MaybeRefOrGetter<TeamDetailRecord | null | undefined>
    canViewSubmission: MaybeRefOrGetter<boolean>
    canManageSubmission: MaybeRefOrGetter<boolean>
  }
) {
  const apiFetch = $fetch
  const resolvedHackathon = computed(() => toValue(hackathon))
  const resolvedHackathonId = computed(() => {
    const hackathonId = toValue(options.visibleHackathonId)
    return typeof hackathonId === 'string' && hackathonId.trim().length > 0 ? hackathonId : null
  })
  const resolvedTeam = computed(() => toValue(options.team) ?? null)
  const resolvedTeamId = computed(() => {
    if (!resolvedTeam.value || resolvedTeam.value.isPersisted === false) {
      return null
    }

    return resolvedTeam.value.id
  })
  const canViewSubmission = computed(() => Boolean(toValue(options.canViewSubmission)))
  const canManageSubmission = computed(() => Boolean(toValue(options.canManageSubmission)))

  const currentSubmission = ref<TeamSubmissionRecord | null>(null)
  const currentSubmissionStatus = ref<LoadStatus>('idle')
  const currentSubmissionErrorMessage = ref('')

  const pendingActionKey = ref<string | null>(null)
  const mutationError = ref('')

  function resetSubmissionState() {
    currentSubmission.value = null
    currentSubmissionStatus.value = 'idle'
    currentSubmissionErrorMessage.value = ''
  }

  async function fetchCurrentSubmission(teamId: string) {
    if (!resolvedHackathonId.value) {
      throw new Error('The current hackathon submission route could not be resolved.')
    }

    const response = await apiFetch<TeamSubmissionApiDataResponse<TeamSubmissionRecord | null>>(
      `/api/hackathons/${resolvedHackathonId.value}/teams/${teamId}/submission`
    )

    return response.data
  }

  async function loadCurrentSubmission() {
    if (!resolvedHackathonId.value || !resolvedTeamId.value || !canViewSubmission.value) {
      resetSubmissionState()
      return
    }

    currentSubmissionStatus.value = 'pending'
    currentSubmissionErrorMessage.value = ''

    try {
      currentSubmission.value = await fetchCurrentSubmission(resolvedTeamId.value)
      currentSubmissionStatus.value = 'success'
    } catch (error) {
      currentSubmission.value = null
      currentSubmissionStatus.value = 'error'
      currentSubmissionErrorMessage.value = toSectionErrorMessage(
        error,
        'The current team submission could not be loaded right now.'
      )
    }
  }

  async function runMutation<T>(
    actionKey: string,
    action: () => Promise<T>
  ) {
    pendingActionKey.value = actionKey
    mutationError.value = ''

    try {
      return await action()
    } catch (error) {
      mutationError.value = normalizeTeamSubmissionApiError(error).message
      return null
    } finally {
      pendingActionKey.value = null
    }
  }

  async function createSubmissionDraft(input: TeamSubmissionFormInput) {
    if (!resolvedHackathonId.value || !resolvedTeamId.value) {
      mutationError.value = 'The team submission route could not be resolved.'
      return null
    }

    const submission = await runMutation(`create-submission:${resolvedTeamId.value}`, async () => {
      const response = await apiFetch<TeamSubmissionApiDataResponse<TeamSubmissionRecord>>(
        `/api/hackathons/${resolvedHackathonId.value}/teams/${resolvedTeamId.value}/submission`,
        {
          method: 'POST',
          body: input
        }
      )

      currentSubmission.value = response.data
      currentSubmissionStatus.value = 'success'
      return response.data
    })

    return submission
  }

  async function updateCurrentSubmission(input: TeamSubmissionFormInput) {
    if (!resolvedHackathonId.value || !resolvedTeamId.value || !currentSubmission.value) {
      mutationError.value = 'The team submission workspace is unavailable for edits.'
      return null
    }

    const submission = await runMutation(`update-submission:${currentSubmission.value.id}`, async () => {
      const response = await apiFetch<TeamSubmissionApiDataResponse<TeamSubmissionRecord>>(
        `/api/hackathons/${resolvedHackathonId.value}/teams/${resolvedTeamId.value}/submission`,
        {
          method: 'PATCH',
          body: input
        }
      )

      currentSubmission.value = response.data
      currentSubmissionStatus.value = 'success'
      return response.data
    })

    return submission
  }

  async function submitCurrentSubmission() {
    if (!resolvedHackathonId.value || !resolvedTeamId.value || !currentSubmission.value) {
      mutationError.value = 'The team submission workspace is unavailable for submission.'
      return null
    }

    const submission = await runMutation(`submit-submission:${currentSubmission.value.id}`, async () => {
      const response = await apiFetch<TeamSubmissionApiDataResponse<TeamSubmissionRecord>>(
        `/api/hackathons/${resolvedHackathonId.value}/teams/${resolvedTeamId.value}/submission/actions/submit`,
        {
          method: 'POST'
        }
      )

      currentSubmission.value = response.data
      currentSubmissionStatus.value = 'success'
      return response.data
    })

    return submission
  }

  async function withdrawCurrentSubmission() {
    if (!resolvedHackathonId.value || !resolvedTeamId.value || !currentSubmission.value) {
      mutationError.value = 'The team submission workspace is unavailable for withdrawal.'
      return null
    }

    const submission = await runMutation(`withdraw-submission:${currentSubmission.value.id}`, async () => {
      const response = await apiFetch<TeamSubmissionApiDataResponse<TeamSubmissionRecord>>(
        `/api/hackathons/${resolvedHackathonId.value}/teams/${resolvedTeamId.value}/submission/actions/withdraw`,
        {
          method: 'POST'
        }
      )

      currentSubmission.value = response.data
      currentSubmissionStatus.value = 'success'
      return response.data
    })

    return submission
  }

  watch([resolvedHackathonId, resolvedTeamId, canViewSubmission], async ([hackathonId, teamId, canView]) => {
    if (!hackathonId || !teamId || !canView) {
      resetSubmissionState()
      return
    }

    await loadCurrentSubmission()
  }, {
    immediate: true
  })

  return {
    canManageSubmission,
    currentSubmission,
    currentSubmissionErrorMessage,
    currentSubmissionStatus,
    loadCurrentSubmission,
    mutationError,
    pendingActionKey,
    resolvedHackathon,
    resolvedHackathonId,
    resolvedTeam,
    resolvedTeamId,
    canViewSubmission,
    createSubmissionDraft,
    updateCurrentSubmission,
    submitCurrentSubmission,
    withdrawCurrentSubmission
  }
}
