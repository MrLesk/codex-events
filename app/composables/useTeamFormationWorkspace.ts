import type { PublicHackathon } from './useHackathonPresentation'
import type {
  ParticipantApplicationRecord
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
  getOwnTeamMembership,
  normalizeTeamWorkspaceApiError
} from '~/utils/team-workspace'

type LoadStatus = 'idle' | 'pending' | 'success' | 'error'
type VisibleTeamsFilter = {
  openToJoin?: boolean
  hasCapacity?: boolean
  workspaceMode?: 'solo' | 'team'
  memberCount?: 'multi_person' | 'full'
}
type VisibleTeamsDirectoryFilter = 'all' | 'open_to_join' | 'solo' | 'multi_person' | 'full'
type VisibleTeamsFilterCounts = Record<VisibleTeamsDirectoryFilter, number>

interface TeamSummaryListResponse extends TeamWorkspaceApiListResponse<TeamSummaryRecord> {
  meta?: NonNullable<TeamWorkspaceApiListResponse<TeamSummaryRecord>['meta']> & {
    filterCounts?: Partial<VisibleTeamsFilterCounts>
  }
}

const visibleTeamsPageSize = 6
const ownTeamLookupPageSize = 100

function toSectionErrorMessage(error: unknown, fallback: string) {
  const message = normalizeTeamWorkspaceApiError(error).message
  return message && message.length > 0 ? message : fallback
}

function createEmptyVisibleTeamsFilterCounts(): VisibleTeamsFilterCounts {
  return {
    all: 0,
    open_to_join: 0,
    solo: 0,
    multi_person: 0,
    full: 0
  }
}

function normalizeVisibleTeamsFilterCounts(filterCounts?: Partial<VisibleTeamsFilterCounts>): VisibleTeamsFilterCounts {
  return {
    ...createEmptyVisibleTeamsFilterCounts(),
    ...filterCounts
  }
}

export function useTeamFormationWorkspace(
  hackathon: MaybeRefOrGetter<PublicHackathon & {
    id: string
  }>,
  options?: {
    teamId?: MaybeRefOrGetter<string | null | undefined>
  }
) {
  const apiFetch = import.meta.server ? useRequestFetch() : $fetch
  const { actor, status: actorStatus } = useAccountLifecycleActor()
  const resolvedHackathon = computed(() => toValue(hackathon))
  const resolvedTeamId = computed(() => {
    const teamId = toValue(options?.teamId ?? null)
    return typeof teamId === 'string' && teamId.trim().length > 0 ? teamId : null
  })
  const authSubject = computed(() => actor.value.kind === 'anonymous' ? 'anonymous' : actor.value.sessionUser.sub)
  const rememberedPendingJoinRequestIds = useState<Record<string, string>>(
    'team-workspace-remembered-pending-join-request-ids',
    () => ({})
  )
  const typedActor = computed<TeamWorkspaceActor | null>(() => actor.value)
  const actorUserId = computed(() => typedActor.value?.kind === 'platform_user' ? typedActor.value.platformUser.id : null)
  const actorErrorMessage = computed(() => '')

  const visibleHackathon = computed(() => resolvedHackathon.value)
  const visibleHackathonId = computed(() => resolvedHackathon.value.id)
  const visibleHackathonErrorMessage = computed(() => '')

  const ownApplicationRequest = useAsyncData<ParticipantApplicationRecord | null>(
    () => `team-workspace-own-application:${authSubject.value}:${visibleHackathonId.value ?? 'none'}`,
    async () => {
      if (typedActor.value?.kind !== 'platform_user' || !visibleHackathonId.value) {
        return null
      }

      const response = await apiFetch<TeamWorkspaceApiDataResponse<ParticipantApplicationRecord | null>>(
        `/api/hackathons/${visibleHackathonId.value}/applications/me`
      )

      return response.data
    },
    {
      default: () => null,
      watch: [typedActor, visibleHackathonId]
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
  const visibleTeamsFilterCounts = ref<VisibleTeamsFilterCounts>(createEmptyVisibleTeamsFilterCounts())
  const currentVisibleTeamsPage = ref(0)
  const isLoadingMoreVisibleTeams = ref(false)
  const loadMoreVisibleTeamsErrorMessage = ref('')
  const activeVisibleTeamsFilter = ref<VisibleTeamsFilter>({})

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
    visibleTeamsFilterCounts.value = createEmptyVisibleTeamsFilterCounts()
    currentVisibleTeamsPage.value = 0
    isLoadingMoreVisibleTeams.value = false
    loadMoreVisibleTeamsErrorMessage.value = ''
    activeVisibleTeamsFilter.value = {}
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

  async function fetchTeamPage(
    page: number,
    pageSize: number = visibleTeamsPageSize,
    options?: VisibleTeamsFilter
  ) {
    if (!visibleHackathonId.value) {
      throw new Error('The current hackathon team route could not be resolved.')
    }

    return await apiFetch<TeamSummaryListResponse>(
      `/api/hackathons/${visibleHackathonId.value}/teams`,
      {
        query: {
          page,
          page_size: pageSize,
          ...(typeof options?.openToJoin === 'boolean'
            ? {
                open_to_join: options.openToJoin
              }
            : {}),
          ...(typeof options?.hasCapacity === 'boolean'
            ? {
                has_capacity: options.hasCapacity
              }
            : {}),
          ...(options?.workspaceMode
            ? {
                workspace_mode: options.workspaceMode
              }
            : {}),
          ...(options?.memberCount
            ? {
                member_count: options.memberCount
              }
            : {})
        }
      }
    )
  }

  async function findVisibleTeamBySlug(teamSlug: string) {
    if (!visibleHackathonId.value || typedActor.value?.kind !== 'platform_user') {
      return null
    }

    const normalizedTeamSlug = teamSlug.trim().toLowerCase()

    if (!normalizedTeamSlug) {
      return null
    }

    const response = await apiFetch<TeamSummaryListResponse>(
      `/api/hackathons/${visibleHackathonId.value}/teams`,
      {
        query: {
          page: 1,
          page_size: 1,
          slug: normalizedTeamSlug
        }
      }
    )

    return response.data.find(team => team.slug === normalizedTeamSlug) ?? null
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

  async function loadVisibleTeams(pageCount: number = 1, options?: {
    loadMore?: boolean
    filter?: VisibleTeamsFilter
  }) {
    if (!visibleHackathonId.value || typedActor.value?.kind !== 'platform_user') {
      resetVisibleTeamsState()
      return
    }

    const isLoadMore = options?.loadMore ?? false
    const nextFilter = options?.filter ?? activeVisibleTeamsFilter.value

    if (!isLoadMore) {
      activeVisibleTeamsFilter.value = {
        ...nextFilter
      }
    }

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
        Array.from(
          { length: pageCount },
          async (_, index) => await fetchTeamPage(index + 1, visibleTeamsPageSize, nextFilter)
        )
      )
      const nextTeams = responses.flatMap(response => response.data)
      const uniqueTeams = nextTeams.filter((team, index, items) =>
        items.findIndex(candidate => candidate.id === team.id) === index
      )

      visibleTeams.value = uniqueTeams
      visibleTeamsTotal.value = responses.at(-1)?.meta?.total ?? uniqueTeams.length
      visibleTeamsFilterCounts.value = normalizeVisibleTeamsFilterCounts(responses.at(-1)?.meta?.filterCounts)
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
      visibleTeamsFilterCounts.value = createEmptyVisibleTeamsFilterCounts()
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
      loadMore: true,
      filter: activeVisibleTeamsFilter.value
    })
  }

  async function loadOwnTeam() {
    if (!visibleHackathonId.value || typedActor.value?.kind !== 'platform_user') {
      resetOwnTeamState()
      return
    }

    ownTeamStatus.value = 'pending'
    ownTeamErrorMessage.value = ''

    try {
      let page = 1

      while (true) {
        const response = await fetchTeamPage(page, ownTeamLookupPageSize)

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
            ownTeamErrorMessage.value = ''

            if (!resolvedTeamId.value || resolvedTeamId.value === detail.id) {
              currentTeam.value = detail
              currentTeamStatus.value = 'success'
              currentTeamErrorMessage.value = ''
            }

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
    if (!visibleHackathonId.value || !resolvedTeamId.value || typedActor.value?.kind !== 'platform_user') {
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

      teamJoinRequests.value = response.data.filter(request => request.status === 'pending')
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
    bio: string
    isOpenToJoinRequests: boolean
    workspaceMode: 'solo' | 'team'
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
      ownTeamErrorMessage.value = ''
      currentTeam.value = response.data
      currentTeamStatus.value = 'success'
      currentTeamErrorMessage.value = ''
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
    bio?: string
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
      void loadVisibleTeams(Math.max(currentVisibleTeamsPage.value, 1))
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
      void loadVisibleTeams(Math.max(currentVisibleTeamsPage.value, 1))
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
        loadCurrentTeamJoinRequests()
      ])
      void loadVisibleTeams(Math.max(currentVisibleTeamsPage.value, 1))
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
        teamDissolved: boolean
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

  async function promoteCurrentTeamMember(userId: string) {
    if (!visibleHackathonId.value || !currentTeam.value) {
      mutationError.value = 'The team workspace is unavailable for membership changes.'
      return null
    }

    const result = await runMutation(`make-team-admin:${currentTeam.value.id}:${userId}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<{
        id: string
        teamId: string
        userId: string
        role: 'admin'
      }>>(
        `/api/hackathons/${visibleHackathonId.value}/teams/${currentTeam.value!.id}/members/${userId}/actions/make-admin`,
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
    if (!hackathonId || !teamId || !userId) {
      resetCurrentTeamState()
      return
    }

    if (currentTeam.value?.id === teamId && currentTeamStatus.value === 'success') {
      return
    }

    resetCurrentTeamState()
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
    actor: typedActor,
    actorErrorMessage,
    actorStatus,
    currentTeam,
    currentTeamErrorMessage,
    currentTeamMembership,
    currentTeamStatus,
    findVisibleTeamBySlug,
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
    promoteCurrentTeamMember,
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
    visibleHackathonStatus: computed(() => {
      if (actorStatus.value === 'idle' || actorStatus.value === 'pending') {
        return actorStatus.value
      }

      return 'success'
    }),
    visibleTeams,
    visibleTeamsErrorMessage,
    visibleTeamsFilterCounts,
    visibleTeamsStatus,
    visibleTeamsTotal
  }
}
