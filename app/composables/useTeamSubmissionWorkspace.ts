import type { PublicHackathon } from './useHackathonPresentation'
import type {
  TeamSubmissionFormInput,
  TeamSubmissionRecord
} from '~/utils/team-submission'

import { normalizeTeamSubmissionApiError } from '~/utils/team-submission'

type LoadStatus = 'idle' | 'pending' | 'success' | 'error'

type TeamSubmissionApiDataResponse<T> = {
  data: T
}

type TeamSubmissionWorkspaceTeam = {
  id: string
  isPersisted?: boolean
}

function toSectionErrorMessage(error: unknown, fallback: string) {
  const message = normalizeTeamSubmissionApiError(error).message
  return message && message.length > 0 ? message : fallback
}

export function useTeamSubmissionWorkspace(
  hackathon: MaybeRefOrGetter<Pick<PublicHackathon, 'state'>>,
  options: {
    visibleHackathonId: MaybeRefOrGetter<string | null | undefined>
    team: MaybeRefOrGetter<TeamSubmissionWorkspaceTeam | null | undefined>
    canViewSubmission: MaybeRefOrGetter<boolean>
    canManageSubmission: MaybeRefOrGetter<boolean>
    initialSubmission?: MaybeRefOrGetter<TeamSubmissionRecord | null | undefined>
    hasInitialSubmissionState?: MaybeRefOrGetter<boolean>
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
  const initialSubmission = computed(() => toValue(options.initialSubmission ?? null) ?? null)
  const hasInitialSubmissionState = computed(() => Boolean(toValue(options.hasInitialSubmissionState ?? false)))
  const initialSubmissionStateKey = computed(() => {
    if (!hasInitialSubmissionState.value || !resolvedHackathonId.value || !resolvedTeamId.value || !canViewSubmission.value) {
      return null
    }

    return `${resolvedHackathonId.value}:${resolvedTeamId.value}`
  })
  const appliedInitialSubmissionStateKey = ref<string | null>(null)

  const currentSubmission = ref<TeamSubmissionRecord | null>(initialSubmissionStateKey.value ? initialSubmission.value : null)
  const currentSubmissionStatus = ref<LoadStatus>(initialSubmissionStateKey.value ? 'success' : 'idle')
  const currentSubmissionErrorMessage = ref('')

  const pendingActionKey = ref<string | null>(null)
  const mutationError = ref('')

  function resetSubmissionState() {
    currentSubmission.value = null
    currentSubmissionStatus.value = 'idle'
    currentSubmissionErrorMessage.value = ''
    appliedInitialSubmissionStateKey.value = null
  }

  function applyInitialSubmissionState() {
    if (!initialSubmissionStateKey.value) {
      appliedInitialSubmissionStateKey.value = null
      return false
    }

    currentSubmission.value = initialSubmission.value
    currentSubmissionStatus.value = 'success'
    currentSubmissionErrorMessage.value = ''
    appliedInitialSubmissionStateKey.value = initialSubmissionStateKey.value
    return true
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

  watch([initialSubmissionStateKey, initialSubmission], () => {
    if (!initialSubmissionStateKey.value) {
      if (!hasInitialSubmissionState.value) {
        appliedInitialSubmissionStateKey.value = null
      }
      return
    }

    applyInitialSubmissionState()
  }, {
    immediate: true
  })

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

  async function updateCurrentSubmissionPublicVisibility(isPubliclyVisible: boolean) {
    if (!resolvedHackathonId.value || !resolvedTeamId.value || !currentSubmission.value) {
      mutationError.value = 'The team submission workspace is unavailable for public publishing updates.'
      return null
    }

    const submission = await runMutation(`update-submission-public-visibility:${currentSubmission.value.id}`, async () => {
      const response = await apiFetch<TeamSubmissionApiDataResponse<TeamSubmissionRecord>>(
        `/api/hackathons/${resolvedHackathonId.value}/teams/${resolvedTeamId.value}/submission/public-visibility`,
        {
          method: 'PATCH',
          body: {
            isPubliclyVisible
          }
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

    if (
      initialSubmissionStateKey.value
      && appliedInitialSubmissionStateKey.value === initialSubmissionStateKey.value
    ) {
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
    updateCurrentSubmissionPublicVisibility,
    submitCurrentSubmission,
    withdrawCurrentSubmission
  }
}
