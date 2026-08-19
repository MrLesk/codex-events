import type { PublicEvent } from '~/domains/events/presentation'
import type {
  ParticipantActor,
  ParticipantApiDataResponse,
  ParticipantApplicationRecord,
  ParticipantCurrentTermsResponse,
  ParticipantAiKnowledgeLevelInput,
  ParticipantRegistrationTeamIntent,
  VisibleEventRecord
} from '~/domains/applications/participant-application'

import {
  listMissingRequiredProfileFields,
  normalizeParticipantApiError
} from '~/domains/applications/participant-application'
import { useApiClient } from '~/composables/useApiClient'
import { useSessionActor } from '~/composables/useSessionActor'

async function getVisibleEventBySlug(
  slug: string,
  apiFetch: ReturnType<typeof useApiClient>,
  signal?: AbortSignal
) {
  const response = await apiFetch<ParticipantApiDataResponse<VisibleEventRecord>>(
    `/api/events/slug/${encodeURIComponent(slug)}`,
    {
      signal
    }
  )

  return response.data
}

export function useParticipantApplication(
  event: MaybeRefOrGetter<PublicEvent>,
  slug: MaybeRefOrGetter<string>
) {
  const apiFetch = useApiClient()
  const sessionActor = useSessionActor()
  const resolvedEvent = computed(() => toValue(event))
  const resolvedSlug = computed(() => toValue(slug))
  const authSubject = computed(() => sessionActor.actor.value.isAuthenticated
    ? sessionActor.actor.value.sessionUser.sub
    : 'anonymous')

  const actor = computed<ParticipantActor>(() => sessionActor.actor.value)

  const actorErrorMessage = computed(() => {
    if (!sessionActor.error.value) {
      return ''
    }

    return normalizeParticipantApiError(sessionActor.error.value).message
  })

  const visibleEventRequest = useApiData<VisibleEventRecord | null>(
    () => `participant-application-visible-event:${authSubject.value}:${resolvedSlug.value}`,
    async ({ apiFetch, signal }) => {
      if (actor.value?.kind !== 'platform_user') {
        return null
      }

      return await getVisibleEventBySlug(resolvedSlug.value, apiFetch, signal)
    },
    {
      default: () => null,
      watch: [actor, resolvedSlug],
      server: false
    }
  )

  const visibleEvent = computed(() => visibleEventRequest.data.value)
  const visibleEventId = computed(() => visibleEvent.value?.id ?? null)
  const visibleEventErrorMessage = computed(() => {
    if (!visibleEventRequest.error.value) {
      return ''
    }

    return normalizeParticipantApiError(visibleEventRequest.error.value).message
  })

  const ownApplicationRequest = useApiData<ParticipantApplicationRecord | null>(
    () => `participant-application-own:${authSubject.value}:${visibleEventId.value ?? 'none'}`,
    async ({ apiFetch, signal }) => {
      if (actor.value?.kind !== 'platform_user' || !visibleEventId.value) {
        return null
      }

      const response = await apiFetch<ParticipantApiDataResponse<ParticipantApplicationRecord | null>>(
        `/api/events/${visibleEventId.value}/applications/me`,
        {
          signal
        }
      )

      return response.data
    },
    {
      default: () => null,
      watch: [actor, visibleEventId],
      server: false
    }
  )

  const ownApplication = computed(() => ownApplicationRequest.data.value)
  const ownApplicationErrorMessage = computed(() => {
    if (!ownApplicationRequest.error.value) {
      return ''
    }

    return normalizeParticipantApiError(ownApplicationRequest.error.value).message
  })

  const currentTermsRequest = useApiData<ParticipantCurrentTermsResponse | null>(
    () => `participant-application-terms:${authSubject.value}:${visibleEventId.value ?? 'none'}`,
    async ({ apiFetch, signal }) => {
      if (
        actor.value?.kind !== 'platform_user'
        || !visibleEventId.value
        || ownApplication.value
        || resolvedEvent.value.state !== 'registration_open'
      ) {
        return null
      }

      const response = await apiFetch<ParticipantApiDataResponse<ParticipantCurrentTermsResponse>>(
        `/api/events/${visibleEventId.value}/terms/current`,
        {
          signal
        }
      )

      return response.data
    },
    {
      default: () => null,
      watch: [actor, visibleEventId, ownApplication, computed(() => resolvedEvent.value.state)],
      server: false
    }
  )

  const currentApplicationTerms = computed(() => currentTermsRequest.data.value?.application_terms ?? null)
  const currentTermsErrorMessage = computed(() => {
    if (!currentTermsRequest.error.value) {
      return ''
    }

    return normalizeParticipantApiError(currentTermsRequest.error.value).message
  })

  const missingProfileFields = computed(() => {
    if (actor.value?.kind !== 'platform_user') {
      return []
    }

    return listMissingRequiredProfileFields(resolvedEvent.value, actor.value.platformUser)
  })

  const submissionError = ref('')
  const submissionSuccess = ref('')
  const isSubmitting = ref(false)

  async function submitApplication(options: {
    applicationTermsDocumentId?: string | null
    registrationTeamIntent: ParticipantRegistrationTeamIntent
    registrationTeamMembers: Array<{
      fullName: string | null
      email: string | null
    }>
    inPersonAttendanceCommitment?: boolean
    whyThisEvent?: string
    proofOfExecutionUrl?: string
    aiKnowledgeLevel?: ParticipantAiKnowledgeLevelInput
  }) {
    if (!visibleEventId.value) {
      submissionError.value = 'The current event application route could not be resolved.'
      submissionSuccess.value = ''
      return false
    }

    isSubmitting.value = true
    submissionError.value = ''
    submissionSuccess.value = ''

    try {
      await apiFetch(`/api/events/${visibleEventId.value}/applications`, {
        method: 'POST',
        body: {
          ...(options.applicationTermsDocumentId
            ? { applicationTermsDocumentId: options.applicationTermsDocumentId }
            : {}),
          ...(resolvedEvent.value.applicationTeamIntentVisible
            ? {
                registrationTeamIntent: options.registrationTeamIntent,
                registrationTeamMembers: options.registrationTeamMembers
              }
            : {}),
          ...(typeof options.inPersonAttendanceCommitment === 'boolean'
            ? { inPersonAttendanceCommitment: options.inPersonAttendanceCommitment }
            : {}),
          ...(resolvedEvent.value.applicationWhyThisEventVisible && typeof options.whyThisEvent === 'string'
            ? { whyThisEvent: options.whyThisEvent }
            : {}),
          ...(resolvedEvent.value.applicationProofOfExecutionVisible && typeof options.proofOfExecutionUrl === 'string'
            ? { proofOfExecutionUrl: options.proofOfExecutionUrl }
            : {}),
          ...(resolvedEvent.value.applicationAiKnowledgeVisible && typeof options.aiKnowledgeLevel === 'string'
            ? { aiKnowledgeLevel: options.aiKnowledgeLevel }
            : {})
        }
      })

      await ownApplicationRequest.refresh()
      submissionSuccess.value = 'Application submitted.'
      return true
    } catch (error) {
      submissionError.value = normalizeParticipantApiError(error).message
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    actor,
    actorErrorMessage,
    actorStatus: sessionActor.status,
    currentApplicationTerms,
    currentTermsErrorMessage,
    currentTermsStatus: computed(() => currentTermsRequest.status.value),
    missingProfileFields,
    ownApplication,
    ownApplicationErrorMessage,
    ownApplicationStatus: computed(() => ownApplicationRequest.status.value),
    submissionError,
    submissionSuccess,
    isSubmitting,
    submitApplication,
    visibleEvent,
    visibleEventErrorMessage,
    visibleEventId,
    visibleEventStatus: computed(() => visibleEventRequest.status.value)
  }
}
