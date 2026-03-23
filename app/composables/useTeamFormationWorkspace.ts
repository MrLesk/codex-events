import type { PublicHackathon } from './useHackathonPresentation'
import type {
  ParticipantApplicationRecord,
  VisibleHackathonRecord
} from '~/utils/participant-application'
import type {
  TeamDetailRecord,
  TeamJoinRequestRecord,
  TeamSummaryRecord,
  TeamWorkspaceActor,
  TeamWorkspaceApiDataResponse,
  TeamWorkspaceApiListResponse
} from '~/utils/team-workspace'

import {
  createTeamWorkspaceFallbackActor,
  getOwnTeamMembership,
  normalizeTeamWorkspaceApiError
} from '~/utils/team-workspace'

type LoadStatus = 'idle' | 'pending' | 'success' | 'error'

const visibleTeamsPageSize = 6
const ownTeamLookupPageSize = 100

async function findVisibleHackathonBySlug(
  slug: string,
  apiFetch: typeof $fetch
) {
  const pageSize = 100
  let page = 1

  while (true) {
    const response = await apiFetch<TeamWorkspaceApiListResponse<VisibleHackathonRecord>>('/api/hackathons', {
      query: {
        page,
        page_size: pageSize
      }
    })
    const matchingHackathon = response.data.find(hackathon => hackathon.slug === slug)

    if (matchingHackathon) {
      return matchingHackathon
    }

    const total = response.meta?.total ?? response.data.length
    const loadedItems = page * pageSize

    if (response.data.length === 0 || loadedItems >= total) {
      return null
    }

    page += 1
  }
}

function toSectionErrorMessage(error: unknown, fallback: string) {
  const message = normalizeTeamWorkspaceApiError(error).message
  return message && message.length > 0 ? message : fallback
}

export function useTeamFormationWorkspace(
  hackathon: MaybeRefOrGetter<PublicHackathon>,
  slug: MaybeRefOrGetter<string>,
  options?: {
    teamId?: MaybeRefOrGetter<string | null | undefined>
  }
) {
  const apiFetch = $fetch
  const user = useUser()
  const resolvedHackathon = computed(() => toValue(hackathon))
  const resolvedSlug = computed(() => toValue(slug))
  const resolvedTeamId = computed(() => {
    const teamId = toValue(options?.teamId ?? null)
    return typeof teamId === 'string' && teamId.trim().length > 0 ? teamId : null
  })
  const authSubject = computed(() => user.value?.sub ?? 'anonymous')
  const rememberedPendingJoinRequestIds = useState<Record<string, string>>(
    'team-workspace-remembered-pending-join-request-ids',
    () => ({})
  )

  const actorRequest = useAsyncData<TeamWorkspaceActor | null>(
    () => `team-workspace-actor:${authSubject.value}`,
    async () => {
      if (!user.value?.sub) {
        return null
      }

      const response = await apiFetch<TeamWorkspaceApiDataResponse<{ actor: TeamWorkspaceActor }>>('/api/session')
      return response.data.actor
    },
    {
      default: () => null,
      watch: [computed(() => user.value?.sub ?? null)],
      server: false
    }
  )

  const actor = computed<TeamWorkspaceActor | null>(() => {
    if (!user.value?.sub) {
      return createTeamWorkspaceFallbackActor(user.value)
    }

    if (actorRequest.status.value === 'idle' || actorRequest.status.value === 'pending') {
      return null
    }

    if (actorRequest.error.value) {
      return null
    }

    return actorRequest.data.value ?? createTeamWorkspaceFallbackActor(user.value)
  })

  const actorUserId = computed(() => actor.value?.kind === 'platform_user' ? actor.value.platformUser.id : null)
  const actorErrorMessage = computed(() => {
    if (!actorRequest.error.value) {
      return ''
    }

    return normalizeTeamWorkspaceApiError(actorRequest.error.value).message
  })

  const visibleHackathonRequest = useAsyncData<VisibleHackathonRecord | null>(
    () => `team-workspace-visible-hackathon:${authSubject.value}:${resolvedSlug.value}`,
    async () => {
      if (actor.value?.kind !== 'platform_user') {
        return null
      }

      return await findVisibleHackathonBySlug(resolvedSlug.value, apiFetch)
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

    return normalizeTeamWorkspaceApiError(visibleHackathonRequest.error.value).message
  })

  const ownApplicationRequest = useAsyncData<ParticipantApplicationRecord | null>(
    () => `team-workspace-own-application:${authSubject.value}:${visibleHackathonId.value ?? 'none'}`,
    async () => {
      if (actor.value?.kind !== 'platform_user' || !visibleHackathonId.value) {
        return null
      }

      const response = await apiFetch<TeamWorkspaceApiDataResponse<ParticipantApplicationRecord | null>>(
        `/api/hackathons/${visibleHackathonId.value}/applications/me`
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

    return normalizeTeamWorkspaceApiError(ownApplicationRequest.error.value).message
  })

  const visibleTeams = ref<TeamSummaryRecord[]>([])
  const visibleTeamsStatus = ref<LoadStatus>('idle')
  const visibleTeamsErrorMessage = ref('')
  const visibleTeamsTotal = ref(0)
  const currentVisibleTeamsPage = ref(0)
  const isLoadingMoreVisibleTeams = ref(false)
  const loadMoreVisibleTeamsErrorMessage = ref('')

  const ownTeam = ref<TeamDetailRecord | null>(null)
  const ownTeamStatus = ref<LoadStatus>('idle')
  const ownTeamErrorMessage = ref('')

  const currentTeam = ref<TeamDetailRecord | null>(null)
  const currentTeamStatus = ref<LoadStatus>('idle')
  const currentTeamErrorMessage = ref('')

  const teamJoinRequests = ref<TeamJoinRequestRecord[]>([])
  const teamJoinRequestsStatus = ref<LoadStatus>('idle')
  const teamJoinRequestsErrorMessage = ref('')

  const pendingActionKey = ref<string | null>(null)
  const mutationError = ref('')

  const currentTeamMembership = computed(() =>
    getOwnTeamMembership(currentTeam.value, actorUserId.value)
  )
  const ownTeamMembership = computed(() =>
    getOwnTeamMembership(ownTeam.value, actorUserId.value)
  )
  const isCurrentTeamAdmin = computed(() => currentTeamMembership.value?.role === 'admin')
  const hasMoreVisibleTeams = computed(() => visibleTeams.value.length < visibleTeamsTotal.value)

  function buildRememberedJoinRequestKey(teamId: string) {
    return `${visibleHackathonId.value ?? 'none'}:${actorUserId.value ?? 'none'}:${teamId}`
  }

  function rememberPendingJoinRequest(teamId: string, requestId: string) {
    rememberedPendingJoinRequestIds.value[buildRememberedJoinRequestKey(teamId)] = requestId
  }

  function forgetPendingJoinRequest(teamId: string) {
    const requestKey = buildRememberedJoinRequestKey(teamId)
    const { [requestKey]: _removed, ...remainingRequestIds } = rememberedPendingJoinRequestIds.value

    rememberedPendingJoinRequestIds.value = remainingRequestIds
  }

  function getRememberedPendingJoinRequestId(teamId: string) {
    return rememberedPendingJoinRequestIds.value[buildRememberedJoinRequestKey(teamId)] ?? null
  }

  function resetVisibleTeamsState() {
    visibleTeams.value = []
    visibleTeamsStatus.value = 'idle'
    visibleTeamsErrorMessage.value = ''
    visibleTeamsTotal.value = 0
    currentVisibleTeamsPage.value = 0
    isLoadingMoreVisibleTeams.value = false
    loadMoreVisibleTeamsErrorMessage.value = ''
  }

  function resetOwnTeamState() {
    ownTeam.value = null
    ownTeamStatus.value = 'idle'
    ownTeamErrorMessage.value = ''
  }

  function resetCurrentTeamState() {
    currentTeam.value = null
    currentTeamStatus.value = 'idle'
    currentTeamErrorMessage.value = ''
    teamJoinRequests.value = []
    teamJoinRequestsStatus.value = 'idle'
    teamJoinRequestsErrorMessage.value = ''
  }

  async function fetchVisibleTeamPage(page: number, pageSize: number = visibleTeamsPageSize) {
    if (!visibleHackathonId.value) {
      throw new Error('The current hackathon team route could not be resolved.')
    }

    return await apiFetch<TeamWorkspaceApiListResponse<TeamSummaryRecord>>(
      `/api/hackathons/${visibleHackathonId.value}/teams`,
      {
        query: {
          page,
          page_size: pageSize
        }
      }
    )
  }

  async function fetchTeamDetail(teamId: string) {
    if (!visibleHackathonId.value) {
      throw new Error('The current hackathon team route could not be resolved.')
    }

    const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamDetailRecord>>(
      `/api/hackathons/${visibleHackathonId.value}/teams/${teamId}`
    )

    return response.data
  }

  async function loadVisibleTeams(pageCount: number = 1, options?: { loadMore?: boolean }) {
    if (!visibleHackathonId.value || actor.value?.kind !== 'platform_user') {
      resetVisibleTeamsState()
      return
    }

    const isLoadMore = options?.loadMore ?? false

    if (isLoadMore) {
      isLoadingMoreVisibleTeams.value = true
      loadMoreVisibleTeamsErrorMessage.value = ''
    } else {
      visibleTeamsStatus.value = 'pending'
      visibleTeamsErrorMessage.value = ''
      loadMoreVisibleTeamsErrorMessage.value = ''
    }

    try {
      const responses = await Promise.all(
        Array.from({ length: pageCount }, async (_, index) => await fetchVisibleTeamPage(index + 1))
      )
      const nextTeams = responses.flatMap(response => response.data)
      const uniqueTeams = nextTeams.filter((team, index, items) =>
        items.findIndex(candidate => candidate.id === team.id) === index
      )

      visibleTeams.value = uniqueTeams
      visibleTeamsTotal.value = responses.at(-1)?.meta?.total ?? uniqueTeams.length
      currentVisibleTeamsPage.value = pageCount
      visibleTeamsStatus.value = 'success'
    } catch (error) {
      if (isLoadMore) {
        loadMoreVisibleTeamsErrorMessage.value = toSectionErrorMessage(
          error,
          'Additional visible teams could not be loaded right now.'
        )
        return
      }

      visibleTeams.value = []
      visibleTeamsTotal.value = 0
      currentVisibleTeamsPage.value = 0
      visibleTeamsStatus.value = 'error'
      visibleTeamsErrorMessage.value = toSectionErrorMessage(
        error,
        'Visible teams could not be loaded right now.'
      )
    } finally {
      if (isLoadMore) {
        isLoadingMoreVisibleTeams.value = false
      }
    }
  }

  async function loadMoreVisibleTeams() {
    if (!hasMoreVisibleTeams.value || isLoadingMoreVisibleTeams.value) {
      return
    }

    await loadVisibleTeams(currentVisibleTeamsPage.value + 1, {
      loadMore: true
    })
  }

  async function loadOwnTeam() {
    if (!visibleHackathonId.value || actor.value?.kind !== 'platform_user') {
      resetOwnTeamState()
      return
    }

    ownTeamStatus.value = 'pending'
    ownTeamErrorMessage.value = ''

    try {
      let page = 1

      while (true) {
        const response = await fetchVisibleTeamPage(page, ownTeamLookupPageSize)

        if (response.data.length === 0) {
          ownTeam.value = null
          ownTeamStatus.value = 'success'
          return
        }

        const prioritizedTeams = [...response.data].sort((left, right) => {
          const leftPriority = left.createdByUserId === actorUserId.value ? 1 : 0
          const rightPriority = right.createdByUserId === actorUserId.value ? 1 : 0
          return rightPriority - leftPriority
        })

        for (const team of prioritizedTeams) {
          const detail = await fetchTeamDetail(team.id)

          if (getOwnTeamMembership(detail, actorUserId.value)) {
            ownTeam.value = detail
            ownTeamStatus.value = 'success'
            return
          }
        }

        const total = response.meta?.total ?? response.data.length
        const loadedItems = page * ownTeamLookupPageSize

        if (loadedItems >= total) {
          ownTeam.value = null
          ownTeamStatus.value = 'success'
          return
        }

        page += 1
      }
    } catch (error) {
      ownTeam.value = null
      ownTeamStatus.value = 'error'
      ownTeamErrorMessage.value = toSectionErrorMessage(
        error,
        'Your current team membership could not be resolved right now.'
      )
    }
  }

  async function loadCurrentTeam() {
    if (!visibleHackathonId.value || !resolvedTeamId.value || actor.value?.kind !== 'platform_user') {
      resetCurrentTeamState()
      return
    }

    currentTeamStatus.value = 'pending'
    currentTeamErrorMessage.value = ''

    try {
      const detail = await fetchTeamDetail(resolvedTeamId.value)
      currentTeam.value = detail
      currentTeamStatus.value = 'success'

      if (getOwnTeamMembership(detail, actorUserId.value)) {
        ownTeam.value = detail
        ownTeamStatus.value = 'success'
        ownTeamErrorMessage.value = ''
      }
    } catch (error) {
      currentTeam.value = null
      currentTeamStatus.value = 'error'
      currentTeamErrorMessage.value = toSectionErrorMessage(
        error,
        'The selected team workspace could not be loaded right now.'
      )
    }
  }

  async function loadCurrentTeamJoinRequests() {
    if (!visibleHackathonId.value || !currentTeam.value || !isCurrentTeamAdmin.value) {
      teamJoinRequests.value = []
      teamJoinRequestsStatus.value = 'idle'
      teamJoinRequestsErrorMessage.value = ''
      return
    }

    teamJoinRequestsStatus.value = 'pending'
    teamJoinRequestsErrorMessage.value = ''

    try {
      const response = await apiFetch<TeamWorkspaceApiListResponse<TeamJoinRequestRecord>>(
        `/api/hackathons/${visibleHackathonId.value}/teams/${currentTeam.value.id}/join-requests`
      )

      teamJoinRequests.value = response.data
      teamJoinRequestsStatus.value = 'success'
    } catch (error) {
      teamJoinRequests.value = []
      teamJoinRequestsStatus.value = 'error'
      teamJoinRequestsErrorMessage.value = toSectionErrorMessage(
        error,
        'Team join requests could not be loaded right now.'
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
      mutationError.value = normalizeTeamWorkspaceApiError(error).message
      return null
    } finally {
      pendingActionKey.value = null
    }
  }

  async function createTeam(input: {
    name: string
    slug: string
    isOpenToJoinRequests: boolean
  }) {
    if (!visibleHackathonId.value) {
      mutationError.value = 'The current hackathon team route could not be resolved.'
      return null
    }

    const createdTeam = await runMutation('create-team', async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamDetailRecord>>(
        `/api/hackathons/${visibleHackathonId.value}/teams`,
        {
          method: 'POST',
          body: input
        }
      )

      ownTeam.value = response.data
      ownTeamStatus.value = 'success'
      await loadVisibleTeams(1)
      return response.data
    })

    return createdTeam
  }

  async function requestToJoinTeam(teamId: string) {
    if (!visibleHackathonId.value) {
      mutationError.value = 'The current hackathon team route could not be resolved.'
      return null
    }

    const joinRequest = await runMutation(`join-team:${teamId}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamJoinRequestRecord>>(
        `/api/hackathons/${visibleHackathonId.value}/team-join-requests`,
        {
          method: 'POST',
          body: {
            teamId
          }
        }
      )

      rememberPendingJoinRequest(teamId, response.data.id)
      return response.data
    })

    return joinRequest
  }

  async function cancelPendingJoinRequest(teamId: string, requestId?: string | null) {
    if (!visibleHackathonId.value) {
      mutationError.value = 'The current hackathon team route could not be resolved.'
      return null
    }

    const effectiveRequestId = requestId ?? getRememberedPendingJoinRequestId(teamId)

    if (!effectiveRequestId) {
      mutationError.value = 'No pending join request is available to cancel from this workspace session.'
      return null
    }

    const canceledRequest = await runMutation(`cancel-join-request:${effectiveRequestId}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamJoinRequestRecord>>(
        `/api/hackathons/${visibleHackathonId.value}/team-join-requests/${effectiveRequestId}/actions/cancel`,
        {
          method: 'POST'
        }
      )

      forgetPendingJoinRequest(teamId)

      if (currentTeam.value?.id === teamId && isCurrentTeamAdmin.value) {
        await loadCurrentTeamJoinRequests()
      }

      return response.data
    })

    return canceledRequest
  }

  async function updateCurrentTeamProfile(input: {
    name?: string
    slug?: string
  }) {
    if (!visibleHackathonId.value || !currentTeam.value) {
      mutationError.value = 'The team workspace is unavailable for profile updates.'
      return null
    }

    const updatedTeam = await runMutation(`update-team:${currentTeam.value.id}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamDetailRecord>>(
        `/api/hackathons/${visibleHackathonId.value}/teams/${currentTeam.value!.id}`,
        {
          method: 'PATCH',
          body: input
        }
      )

      currentTeam.value = response.data
      if (getOwnTeamMembership(response.data, actorUserId.value)) {
        ownTeam.value = response.data
        ownTeamStatus.value = 'success'
      }
      await loadVisibleTeams(Math.max(currentVisibleTeamsPage.value, 1))
      return response.data
    })

    return updatedTeam
  }

  async function updateCurrentTeamJoinPolicy(isOpenToJoinRequests: boolean) {
    if (!visibleHackathonId.value || !currentTeam.value) {
      mutationError.value = 'The team workspace is unavailable for join-policy updates.'
      return null
    }

    const updatedTeam = await runMutation(`update-team-join-policy:${currentTeam.value.id}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamDetailRecord>>(
        `/api/hackathons/${visibleHackathonId.value}/teams/${currentTeam.value!.id}/join-policy`,
        {
          method: 'PATCH',
          body: {
            isOpenToJoinRequests
          }
        }
      )

      currentTeam.value = response.data
      if (getOwnTeamMembership(response.data, actorUserId.value)) {
        ownTeam.value = response.data
        ownTeamStatus.value = 'success'
      }
      await loadVisibleTeams(Math.max(currentVisibleTeamsPage.value, 1))
      return response.data
    })

    return updatedTeam
  }

  async function approveJoinRequest(requestId: string) {
    if (!visibleHackathonId.value || !currentTeam.value) {
      mutationError.value = 'The team workspace is unavailable for join-request review.'
      return null
    }

    const request = await runMutation(`approve-join-request:${requestId}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamJoinRequestRecord>>(
        `/api/hackathons/${visibleHackathonId.value}/team-join-requests/${requestId}/actions/approve`,
        {
          method: 'POST'
        }
      )

      await Promise.all([
        loadCurrentTeam(),
        loadCurrentTeamJoinRequests(),
        loadVisibleTeams(Math.max(currentVisibleTeamsPage.value, 1))
      ])
      return response.data
    })

    return request
  }

  async function rejectJoinRequest(requestId: string) {
    if (!visibleHackathonId.value || !currentTeam.value) {
      mutationError.value = 'The team workspace is unavailable for join-request review.'
      return null
    }

    const request = await runMutation(`reject-join-request:${requestId}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamJoinRequestRecord>>(
        `/api/hackathons/${visibleHackathonId.value}/team-join-requests/${requestId}/actions/reject`,
        {
          method: 'POST'
        }
      )

      await loadCurrentTeamJoinRequests()
      return response.data
    })

    return request
  }

  async function leaveCurrentTeam() {
    if (!visibleHackathonId.value || !currentTeam.value) {
      mutationError.value = 'The team workspace is unavailable for membership changes.'
      return null
    }

    const result = await runMutation(`leave-team:${currentTeam.value.id}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<{
        id: string
        teamId: string
        userId: string
        leftAt: string
      }>>(
        `/api/hackathons/${visibleHackathonId.value}/teams/${currentTeam.value!.id}/actions/leave`,
        {
          method: 'POST'
        }
      )

      await Promise.all([
        loadCurrentTeam(),
        loadOwnTeam(),
        loadVisibleTeams(Math.max(currentVisibleTeamsPage.value, 1))
      ])
      return response.data
    })

    return result
  }

  async function removeCurrentTeamMember(userId: string) {
    if (!visibleHackathonId.value || !currentTeam.value) {
      mutationError.value = 'The team workspace is unavailable for membership changes.'
      return null
    }

    const result = await runMutation(`remove-team-member:${currentTeam.value.id}:${userId}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<{
        id: string
        teamId: string
        userId: string
        leftAt: string
      }>>(
        `/api/hackathons/${visibleHackathonId.value}/teams/${currentTeam.value!.id}/members/${userId}/actions/remove`,
        {
          method: 'POST'
        }
      )

      await Promise.all([
        loadCurrentTeam(),
        loadOwnTeam(),
        loadVisibleTeams(Math.max(currentVisibleTeamsPage.value, 1))
      ])
      return response.data
    })

    return result
  }

  watch([visibleHackathonId, actorUserId], async ([hackathonId, userId]) => {
    resetVisibleTeamsState()
    resetOwnTeamState()

    if (!hackathonId || !userId) {
      return
    }

    await Promise.all([
      loadVisibleTeams(1),
      loadOwnTeam()
    ])
  }, {
    immediate: true
  })

  watch([visibleHackathonId, resolvedTeamId, actorUserId], async ([hackathonId, teamId, userId]) => {
    resetCurrentTeamState()

    if (!hackathonId || !teamId || !userId) {
      return
    }

    await loadCurrentTeam()
  }, {
    immediate: true
  })

  watch([currentTeam, isCurrentTeamAdmin], async ([team, isAdmin]) => {
    if (!team || !isAdmin) {
      teamJoinRequests.value = []
      teamJoinRequestsStatus.value = 'idle'
      teamJoinRequestsErrorMessage.value = ''
      return
    }

    await loadCurrentTeamJoinRequests()
  }, {
    immediate: true
  })

  return {
    actor,
    actorErrorMessage,
    actorStatus: computed(() => actorRequest.status.value),
    currentTeam,
    currentTeamErrorMessage,
    currentTeamMembership,
    currentTeamStatus,
    forgetPendingJoinRequest,
    getRememberedPendingJoinRequestId,
    hasMoreVisibleTeams,
    isCurrentTeamAdmin,
    isLoadingMoreVisibleTeams,
    leaveCurrentTeam,
    loadCurrentTeam,
    loadCurrentTeamJoinRequests,
    loadMoreVisibleTeams,
    loadOwnTeam,
    loadVisibleTeams,
    loadMoreVisibleTeamsErrorMessage,
    mutationError,
    ownApplication,
    ownApplicationErrorMessage,
    ownApplicationStatus: computed(() => ownApplicationRequest.status.value),
    ownTeam,
    ownTeamErrorMessage,
    ownTeamMembership,
    ownTeamStatus,
    pendingActionKey,
    rememberPendingJoinRequest,
    requestToJoinTeam,
    cancelPendingJoinRequest,
    approveJoinRequest,
    rejectJoinRequest,
    createTeam,
    removeCurrentTeamMember,
    resolvedHackathon,
    resolvedTeamId,
    teamJoinRequests,
    teamJoinRequestsErrorMessage,
    teamJoinRequestsStatus,
    updateCurrentTeamJoinPolicy,
    updateCurrentTeamProfile,
    visibleHackathon,
    visibleHackathonErrorMessage,
    visibleHackathonId,
    visibleHackathonStatus: computed(() => visibleHackathonRequest.status.value),
    visibleTeams,
    visibleTeamsErrorMessage,
    visibleTeamsStatus,
    visibleTeamsTotal
  }
}
