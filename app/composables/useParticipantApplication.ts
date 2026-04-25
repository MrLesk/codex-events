import type { PublicHackathon } from './useHackathonPresentation'
import type {
  ParticipantActor,
  ParticipantApiDataResponse,
  ParticipantApplicationRecord,
  ParticipantCurrentTermsResponse,
  ParticipantRegistrationTeamIntent,
  ParticipantSessionUser,
  VisibleHackathonRecord
} from '~/utils/participant-application'

import {
  buildAnonymousParticipantActor,
  buildAuthenticatedIdentityParticipantActor,
  listMissingRequiredProfileFields,
  normalizeParticipantApiError
} from '~/utils/participant-application'

async function getVisibleHackathonBySlug(
  slug: string,
  apiFetch: ReturnType<typeof useRequestFetch>,
  signal?: AbortSignal
) {
  const response = await apiFetch<ParticipantApiDataResponse<VisibleHackathonRecord>>(
    `/api/hackathons/slug/${encodeURIComponent(slug)}`,
    {
      signal
    }
  )

  return response.data
}

function toFallbackSessionUser(user: ReturnType<typeof useUser>['value']): ParticipantSessionUser {
  return {
    sub: user?.sub ?? '',
    email: user?.email ?? null,
    name: user?.name ?? null,
    nickname: user?.nickname ?? null,
    picture: user?.picture ?? null
  }
}

export function useParticipantApplication(
  hackathon: MaybeRefOrGetter<PublicHackathon>,
  slug: MaybeRefOrGetter<string>
) {
  const apiFetch = $fetch
  const user = useUser()
  const resolvedHackathon = computed(() => toValue(hackathon))
  const resolvedSlug = computed(() => toValue(slug))
  const authSubject = computed(() => user.value?.sub ?? 'anonymous')

  const actorRequest = useApiData<ParticipantActor | null>(
    () => `participant-application-actor:${authSubject.value}`,
    async ({ apiFetch, signal }) => {
      if (!user.value?.sub) {
        return null
      }

      const response = await apiFetch<ParticipantApiDataResponse<{ actor: ParticipantActor }>>('/api/session', {
        signal
      })
      return response.data.actor
    },
    {
      default: () => null,
      watch: [computed(() => user.value?.sub ?? null)],
      server: false
    }
  )

  const actor = computed<ParticipantActor | null>(() => {
    if (!user.value?.sub) {
      return buildAnonymousParticipantActor()
    }

    if (actorRequest.status.value === 'idle' || actorRequest.status.value === 'pending') {
      return null
    }

    if (actorRequest.error.value) {
      return null
    }

    return actorRequest.data.value ?? buildAuthenticatedIdentityParticipantActor(toFallbackSessionUser(user.value))
  })

  const actorErrorMessage = computed(() => {
    if (!actorRequest.error.value) {
      return ''
    }

    return normalizeParticipantApiError(actorRequest.error.value).message
  })

  const visibleHackathonRequest = useApiData<VisibleHackathonRecord | null>(
    () => `participant-application-visible-hackathon:${authSubject.value}:${resolvedSlug.value}`,
    async ({ apiFetch, signal }) => {
      if (actor.value?.kind !== 'platform_user') {
        return null
      }

      return await getVisibleHackathonBySlug(resolvedSlug.value, apiFetch, signal)
    },
    {
      default: () => null,
      watch: [actor, resolvedSlug],
      server: false
    }
  )

  const visibleHackathon = computed(() => visibleHackathonRequest.data.value)
  const visibleHackathonId = computed(() => visibleHackathon.value?.id ?? null)
  const visibleHackathonErrorMessage = computed(() => {
    if (!visibleHackathonRequest.error.value) {
      return ''
    }

    return normalizeParticipantApiError(visibleHackathonRequest.error.value).message
  })

  const ownApplicationRequest = useApiData<ParticipantApplicationRecord | null>(
    () => `participant-application-own:${authSubject.value}:${visibleHackathonId.value ?? 'none'}`,
    async ({ apiFetch, signal }) => {
      if (actor.value?.kind !== 'platform_user' || !visibleHackathonId.value) {
        return null
      }

      const response = await apiFetch<ParticipantApiDataResponse<ParticipantApplicationRecord | null>>(
        `/api/hackathons/${visibleHackathonId.value}/applications/me`,
        {
          signal
        }
      )

      return response.data
    },
    {
      default: () => null,
      watch: [actor, visibleHackathonId],
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
    () => `participant-application-terms:${authSubject.value}:${visibleHackathonId.value ?? 'none'}`,
    async ({ apiFetch, signal }) => {
      if (
        actor.value?.kind !== 'platform_user'
        || !visibleHackathonId.value
        || ownApplication.value
        || resolvedHackathon.value.state !== 'registration_open'
      ) {
        return null
      }

      const response = await apiFetch<ParticipantApiDataResponse<ParticipantCurrentTermsResponse>>(
        `/api/hackathons/${visibleHackathonId.value}/terms/current`,
        {
          signal
        }
      )

      return response.data
    },
    {
      default: () => null,
      watch: [actor, visibleHackathonId, ownApplication, computed(() => resolvedHackathon.value.state)],
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

    return listMissingRequiredProfileFields(resolvedHackathon.value, actor.value.platformUser)
  })

  const submissionError = ref('')
  const submissionSuccess = ref('')
  const isSubmitting = ref(false)

  async function submitApplication(options: {
    applicationTermsDocumentId: string
    registrationTeamIntent: ParticipantRegistrationTeamIntent
    registrationTeamMembers: Array<{
      fullName: string | null
      email: string | null
    }>
    inPersonAttendanceCommitment?: boolean
    whyThisHackathon?: string
    proofOfExecutionUrl?: string
  }) {
    if (!visibleHackathonId.value) {
      submissionError.value = 'The current hackathon application route could not be resolved.'
      submissionSuccess.value = ''
      return false
    }

    isSubmitting.value = true
    submissionError.value = ''
    submissionSuccess.value = ''

    try {
      await apiFetch(`/api/hackathons/${visibleHackathonId.value}/applications`, {
        method: 'POST',
        body: {
          applicationTermsDocumentId: options.applicationTermsDocumentId,
          registrationTeamIntent: options.registrationTeamIntent,
          registrationTeamMembers: options.registrationTeamMembers,
          ...(typeof options.inPersonAttendanceCommitment === 'boolean'
            ? { inPersonAttendanceCommitment: options.inPersonAttendanceCommitment }
            : {}),
          ...(typeof options.whyThisHackathon === 'string'
            ? { whyThisHackathon: options.whyThisHackathon }
            : {}),
          ...(typeof options.proofOfExecutionUrl === 'string'
            ? { proofOfExecutionUrl: options.proofOfExecutionUrl }
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
    actorStatus: computed(() => actorRequest.status.value),
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
    visibleHackathon,
    visibleHackathonErrorMessage,
    visibleHackathonId,
    visibleHackathonStatus: computed(() => visibleHackathonRequest.status.value)
  }
}
