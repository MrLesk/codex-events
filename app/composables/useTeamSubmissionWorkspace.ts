import type { PublicEvent } from '~/domains/events/presentation'
import type {
  TeamSubmissionFormInput,
  TeamSubmissionRecord
} from '~/domains/submissions/team-submission'

import { normalizeTeamSubmissionApiError } from '~/domains/submissions/team-submission'
import { isAbortError, throwIfAborted } from '~/lib/request-cancellation'
import { useAbortableRequest } from '~/composables/useAbortableRequest'
import { useApiClient } from '~/composables/useApiClient'

type LoadStatus = 'idle' | 'pending' | 'success' | 'error'

type TeamSubmissionApiDataResponse<T> = {
  data: T
}

type TeamSubmissionWorkspaceTeam = {
  id: string
  isPersisted?: boolean
}

export function useTeamSubmissionWorkspace(
  event: MaybeRefOrGetter<Pick<PublicEvent, 'state'>>,
  options: {
    visibleEventId: MaybeRefOrGetter<string | null | undefined>
    team: MaybeRefOrGetter<TeamSubmissionWorkspaceTeam | null | undefined>
    canViewSubmission: MaybeRefOrGetter<boolean>
    canManageSubmission: MaybeRefOrGetter<boolean>
    initialSubmission?: MaybeRefOrGetter<TeamSubmissionRecord | null | undefined>
    hasInitialSubmissionState?: MaybeRefOrGetter<boolean>
  }
) {
  const apiFetch = useApiClient()
  const requests = useAbortableRequest()
  const resolvedEvent = computed(() => toValue(event))
  const resolvedEventId = computed(() => {
    const eventId = toValue(options.visibleEventId)
    return typeof eventId === 'string' && eventId.trim().length > 0 ? eventId : null
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
    if (!hasInitialSubmissionState.value || !resolvedEventId.value || !resolvedTeamId.value || !canViewSubmission.value) {
      return null
    }

    return `${resolvedEventId.value}:${resolvedTeamId.value}`
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

  watch([initialSubmissionStateKey, initialSubmission], () => {
    if (!initialSubmissionStateKey.value) {
      appliedInitialSubmissionStateKey.value = null
      resetSubmissionState()
      return
    }

    applyInitialSubmissionState()
  }, {
    immediate: true
  })

  async function fetchCurrentSubmission(teamId: string, signal: AbortSignal) {
    if (!resolvedEventId.value) {
      throw new Error('The current event submission route could not be resolved.')
    }

    const response = await apiFetch<TeamSubmissionApiDataResponse<TeamSubmissionRecord | null>>(
      `/api/events/${resolvedEventId.value}/teams/${teamId}/submission`,
      { signal }
    )

    throwIfAborted(signal)

    return response.data
  }

  async function loadCurrentSubmission() {
    if (!resolvedEventId.value || !resolvedTeamId.value || !canViewSubmission.value) {
      resetSubmissionState()
      return
    }

    currentSubmissionStatus.value = 'pending'
    currentSubmissionErrorMessage.value = ''
    const signal = requests.createSignal('current-submission')

    try {
      currentSubmission.value = await fetchCurrentSubmission(resolvedTeamId.value, signal)
      throwIfAborted(signal)
      currentSubmissionStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error, signal)) {
        return
      }

      currentSubmission.value = null
      currentSubmissionStatus.value = 'error'
      currentSubmissionErrorMessage.value = normalizeTeamSubmissionApiError(error).message
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
    if (!resolvedEventId.value || !resolvedTeamId.value) {
      mutationError.value = 'The team submission route could not be resolved.'
      return null
    }

    const submission = await runMutation(`create-submission:${resolvedTeamId.value}`, async () => {
      const response = await apiFetch<TeamSubmissionApiDataResponse<TeamSubmissionRecord>>(
        `/api/events/${resolvedEventId.value}/teams/${resolvedTeamId.value}/submission`,
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
    if (!resolvedEventId.value || !resolvedTeamId.value || !currentSubmission.value) {
      mutationError.value = 'The team submission workspace is unavailable for edits.'
      return null
    }

    const submission = await runMutation(`update-submission:${currentSubmission.value.id}`, async () => {
      const response = await apiFetch<TeamSubmissionApiDataResponse<TeamSubmissionRecord>>(
        `/api/events/${resolvedEventId.value}/teams/${resolvedTeamId.value}/submission`,
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
    if (!resolvedEventId.value || !resolvedTeamId.value || !currentSubmission.value) {
      mutationError.value = 'The team submission workspace is unavailable for submission.'
      return null
    }

    const submission = await runMutation(`submit-submission:${currentSubmission.value.id}`, async () => {
      const response = await apiFetch<TeamSubmissionApiDataResponse<TeamSubmissionRecord>>(
        `/api/events/${resolvedEventId.value}/teams/${resolvedTeamId.value}/submission/actions/submit`,
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
    if (!resolvedEventId.value || !resolvedTeamId.value || !currentSubmission.value) {
      mutationError.value = 'The team submission workspace is unavailable for withdrawal.'
      return null
    }

    const submission = await runMutation(`withdraw-submission:${currentSubmission.value.id}`, async () => {
      const response = await apiFetch<TeamSubmissionApiDataResponse<TeamSubmissionRecord>>(
        `/api/events/${resolvedEventId.value}/teams/${resolvedTeamId.value}/submission/actions/withdraw`,
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

  watch([
    resolvedEventId,
    resolvedTeamId,
    canViewSubmission,
    initialSubmissionStateKey,
    hasInitialSubmissionState
  ], async () => {
    if (!resolvedEventId.value || !resolvedTeamId.value || !canViewSubmission.value) {
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

  async function updateCurrentSubmissionPublicVisibility(isPubliclyVisible: boolean) {
    if (!resolvedEventId.value || !resolvedTeamId.value || !currentSubmission.value) {
      mutationError.value = 'The team submission workspace is unavailable for public publishing updates.'
      return null
    }

    const submission = await runMutation(`update-submission-public-visibility:${currentSubmission.value.id}`, async () => {
      const response = await apiFetch<TeamSubmissionApiDataResponse<TeamSubmissionRecord>>(
        `/api/events/${resolvedEventId.value}/teams/${resolvedTeamId.value}/submission/public-visibility`,
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

  return {
    canManageSubmission,
    currentSubmission,
    currentSubmissionErrorMessage,
    currentSubmissionStatus,
    loadCurrentSubmission,
    mutationError,
    pendingActionKey,
    resolvedEvent,
    resolvedEventId,
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
