import type { PublicEvent } from '~/domains/events/presentation'
import type {
  ParticipantApplicationRecord
} from '~/domains/applications/participant-application'
import type {
  AccountEventTeamsPage
} from '#shared/domains/events/account-event-teams-page'
import type {
  AccountEventWorkspacePage
} from '#shared/domains/events/account-event-workspace-page'
import type {
  TeamDetailRecord,
  TeamJoinRequestRecord,
  TeamSummaryRecord,
  TeamWorkspaceActor,
  TeamWorkspaceApiDataResponse,
  TeamWorkspaceApiListResponse
} from '~/domains/teams/workspace'

import {
  getOwnTeamMembership,
  normalizeTeamWorkspaceApiError
} from '~/domains/teams/workspace'
import { isAbortError, throwIfAborted } from '~/lib/request-cancellation'
import { useAbortableRequest } from '~/composables/useAbortableRequest'
import { useApiClient } from '~/composables/useApiClient'

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

type TeamFormationInitialState = Pick<
  AccountEventWorkspacePage,
  'application' | 'ownTeam' | 'ownMembership' | 'joinRequests'
> & Partial<Pick<AccountEventTeamsPage, 'selectedTeam' | 'visibleTeams' | 'visibleTeamsMeta'>>

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
  event: MaybeRefOrGetter<Pick<PublicEvent, 'slug' | 'state' | 'maxTeamMembers'> & {
    id: string
  }>,
  options?: {
    teamId?: MaybeRefOrGetter<string | null | undefined>
    initialState?: MaybeRefOrGetter<TeamFormationInitialState | null | undefined>
  }
) {
  const apiFetch = useApiClient()
  const requests = useAbortableRequest()
  const { actor, status: actorStatus } = useAccountLifecycleActor()
  const resolvedEvent = computed(() => toValue(event))
  const resolvedTeamId = computed(() => {
    const teamId = toValue(options?.teamId ?? null)
    return typeof teamId === 'string' && teamId.trim().length > 0 ? teamId : null
  })
  const rememberedPendingJoinRequestIds = useState<Record<string, string>>(
    'team-workspace-remembered-pending-join-request-ids',
    () => ({})
  )
  const typedActor = computed<TeamWorkspaceActor | null>(() => actor.value)
  const actorUserId = computed(() => typedActor.value?.kind === 'platform_user' ? typedActor.value.platformUser.id : null)
  const actorErrorMessage = computed(() => '')

  const visibleEvent = computed(() => resolvedEvent.value)
  const visibleEventId = computed(() => resolvedEvent.value.id)
  const visibleEventErrorMessage = computed(() => '')

  const ownApplication = ref<ParticipantApplicationRecord | null>(null)
  const ownApplicationStatus = ref<LoadStatus>('idle')
  const ownApplicationErrorMessage = ref('')

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

  const initialState = computed(() => toValue(options?.initialState ?? null) ?? null)

  function applyInitialState(state: TeamFormationInitialState | null) {
    if (!state) {
      ownApplication.value = null
      ownApplicationStatus.value = 'idle'
      ownTeam.value = null
      ownTeamStatus.value = 'idle'
      currentTeam.value = null
      currentTeamStatus.value = 'idle'
      teamJoinRequests.value = []
      teamJoinRequestsStatus.value = 'idle'
      visibleTeams.value = []
      visibleTeamsStatus.value = 'idle'
      visibleTeamsTotal.value = 0
      visibleTeamsFilterCounts.value = createEmptyVisibleTeamsFilterCounts()
      currentVisibleTeamsPage.value = 0
      return
    }

    ownApplication.value = state.application as ParticipantApplicationRecord | null
    ownApplicationStatus.value = 'success'
    ownApplicationErrorMessage.value = ''
    ownTeam.value = state.ownTeam as TeamDetailRecord | null
    ownTeamStatus.value = 'success'
    ownTeamErrorMessage.value = ''
    const requestedTeamId = resolvedTeamId.value
    const initialCurrentTeam = requestedTeamId
      ? state.selectedTeam?.id === requestedTeamId ? state.selectedTeam : null
      : state.ownTeam
    currentTeam.value = initialCurrentTeam as TeamDetailRecord | null
    currentTeamStatus.value = initialCurrentTeam || !requestedTeamId ? 'success' : 'idle'
    currentTeamErrorMessage.value = ''
    teamJoinRequests.value = state.joinRequests as TeamJoinRequestRecord[]
    teamJoinRequestsStatus.value = 'success'
    teamJoinRequestsErrorMessage.value = ''

    if (state.visibleTeams && state.visibleTeamsMeta) {
      visibleTeams.value = state.visibleTeams as TeamSummaryRecord[]
      visibleTeamsStatus.value = 'success'
      visibleTeamsTotal.value = state.visibleTeamsMeta.total
      visibleTeamsFilterCounts.value = normalizeVisibleTeamsFilterCounts(state.visibleTeamsMeta.filterCounts)
      currentVisibleTeamsPage.value = state.visibleTeamsMeta.page
    } else {
      visibleTeams.value = []
      visibleTeamsStatus.value = 'idle'
      visibleTeamsTotal.value = 0
      visibleTeamsFilterCounts.value = createEmptyVisibleTeamsFilterCounts()
      currentVisibleTeamsPage.value = 0
    }
  }

  watch([initialState, resolvedTeamId], ([state]) => {
    applyInitialState(state)
  }, { immediate: true })

  const currentTeamMembership = computed(() =>
    getOwnTeamMembership(currentTeam.value, actorUserId.value)
  )
  const ownTeamMembership = computed(() =>
    getOwnTeamMembership(ownTeam.value, actorUserId.value)
  )
  const isCurrentTeamAdmin = computed(() => currentTeamMembership.value?.role === 'admin')
  const hasMoreVisibleTeams = computed(() => visibleTeams.value.length < visibleTeamsTotal.value)

  function buildRememberedJoinRequestKey(teamId: string) {
    return `${visibleEventId.value ?? 'none'}:${actorUserId.value ?? 'none'}:${teamId}`
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
    options: VisibleTeamsFilter | undefined,
    signal: AbortSignal
  ) {
    if (!visibleEventId.value) {
      throw new Error('The current event team route could not be resolved.')
    }

    return await apiFetch<TeamSummaryListResponse>(
      `/api/events/${visibleEventId.value}/teams`,
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
        },
        signal
      }
    )
  }

  async function findVisibleTeamBySlug(teamSlug: string) {
    if (!visibleEventId.value || typedActor.value?.kind !== 'platform_user') {
      return null
    }

    const normalizedTeamSlug = teamSlug.trim().toLowerCase()

    if (!normalizedTeamSlug) {
      return null
    }

    const signal = requests.createSignal('team-slug')

    const response = await apiFetch<TeamSummaryListResponse>(
      `/api/events/${visibleEventId.value}/teams`,
      {
        query: {
          page: 1,
          page_size: 1,
          slug: normalizedTeamSlug
        },
        signal
      }
    )

    throwIfAborted(signal)

    return response.data.find(team => team.slug === normalizedTeamSlug) ?? null
  }

  async function fetchTeamDetail(teamId: string, signal: AbortSignal) {
    if (!visibleEventId.value) {
      throw new Error('The current event team route could not be resolved.')
    }

    const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamDetailRecord>>(
      `/api/events/${visibleEventId.value}/teams/${teamId}`,
      { signal }
    )

    throwIfAborted(signal)

    return response.data
  }

  async function loadVisibleTeams(pageCount: number = 1, options?: {
    loadMore?: boolean
    filter?: VisibleTeamsFilter
  }) {
    if (!visibleEventId.value || typedActor.value?.kind !== 'platform_user') {
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

    const signal = requests.createSignal('visible-teams')

    try {
      const responses = await Promise.all(
        Array.from(
          { length: pageCount },
          async (_, index) => await fetchTeamPage(index + 1, visibleTeamsPageSize, nextFilter, signal)
        )
      )
      throwIfAborted(signal)
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
      if (isAbortError(error, signal)) {
        return
      }

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
      if (isLoadMore && !signal.aborted) {
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

  async function loadCurrentTeam() {
    if (!visibleEventId.value || !resolvedTeamId.value || typedActor.value?.kind !== 'platform_user') {
      resetCurrentTeamState()
      return
    }

    currentTeamStatus.value = 'pending'
    currentTeamErrorMessage.value = ''
    const signal = requests.createSignal('current-team')

    try {
      const detail = await fetchTeamDetail(resolvedTeamId.value, signal)
      throwIfAborted(signal)
      currentTeam.value = detail
      currentTeamStatus.value = 'success'

      if (getOwnTeamMembership(detail, actorUserId.value)) {
        ownTeam.value = detail
        ownTeamStatus.value = 'success'
        ownTeamErrorMessage.value = ''
      }
    } catch (error) {
      if (isAbortError(error, signal)) {
        return
      }

      currentTeam.value = null
      currentTeamStatus.value = 'error'
      currentTeamErrorMessage.value = toSectionErrorMessage(
        error,
        'The selected team workspace could not be loaded right now.'
      )
    }
  }

  async function loadCurrentTeamJoinRequests() {
    if (!visibleEventId.value || !currentTeam.value || !isCurrentTeamAdmin.value) {
      teamJoinRequests.value = []
      teamJoinRequestsStatus.value = 'idle'
      teamJoinRequestsErrorMessage.value = ''
      return
    }

    teamJoinRequestsStatus.value = 'pending'
    teamJoinRequestsErrorMessage.value = ''
    const signal = requests.createSignal('team-join-requests')

    try {
      const response = await apiFetch<TeamWorkspaceApiListResponse<TeamJoinRequestRecord>>(
        `/api/events/${visibleEventId.value}/teams/${currentTeam.value.id}/join-requests`,
        { signal }
      )

      throwIfAborted(signal)

      teamJoinRequests.value = response.data.filter(request => request.status === 'pending')
      teamJoinRequestsStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error, signal)) {
        return
      }

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
    if (!visibleEventId.value) {
      mutationError.value = 'The current event team route could not be resolved.'
      return null
    }

    const createdTeam = await runMutation('create-team', async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamDetailRecord>>(
        `/api/events/${visibleEventId.value}/teams`,
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
      visibleTeams.value = [response.data, ...visibleTeams.value.filter(team => team.id !== response.data.id)]
      visibleTeamsTotal.value += 1
      return response.data
    })

    return createdTeam
  }

  async function requestToJoinTeam(teamId: string) {
    if (!visibleEventId.value) {
      mutationError.value = 'The current event team route could not be resolved.'
      return null
    }

    const joinRequest = await runMutation(`join-team:${teamId}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamJoinRequestRecord>>(
        `/api/events/${visibleEventId.value}/team-join-requests`,
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
    if (!visibleEventId.value) {
      mutationError.value = 'The current event team route could not be resolved.'
      return null
    }

    const effectiveRequestId = requestId ?? getRememberedPendingJoinRequestId(teamId)

    if (!effectiveRequestId) {
      mutationError.value = 'No pending join request is available to cancel from this workspace session.'
      return null
    }

    const canceledRequest = await runMutation(`cancel-join-request:${effectiveRequestId}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamJoinRequestRecord>>(
        `/api/events/${visibleEventId.value}/team-join-requests/${effectiveRequestId}/actions/cancel`,
        {
          method: 'POST'
        }
      )

      forgetPendingJoinRequest(teamId)

      return response.data
    })

    return canceledRequest
  }

  async function updateCurrentTeamProfile(input: {
    name?: string
    bio?: string
  }) {
    if (!visibleEventId.value || !currentTeam.value) {
      mutationError.value = 'The team workspace is unavailable for profile updates.'
      return null
    }

    const updatedTeam = await runMutation(`update-team:${currentTeam.value.id}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamDetailRecord>>(
        `/api/events/${visibleEventId.value}/teams/${currentTeam.value!.id}`,
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
      visibleTeams.value = visibleTeams.value.map(team => team.id === response.data.id ? response.data : team)
      return response.data
    })

    return updatedTeam
  }

  async function updateCurrentTeamJoinPolicy(isOpenToJoinRequests: boolean) {
    if (!visibleEventId.value || !currentTeam.value) {
      mutationError.value = 'The team workspace is unavailable for join-policy updates.'
      return null
    }

    const updatedTeam = await runMutation(`update-team-join-policy:${currentTeam.value.id}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamDetailRecord>>(
        `/api/events/${visibleEventId.value}/teams/${currentTeam.value!.id}/join-policy`,
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
      visibleTeams.value = visibleTeams.value.map(team => team.id === response.data.id ? response.data : team)
      return response.data
    })

    return updatedTeam
  }

  async function approveJoinRequest(requestId: string) {
    if (!visibleEventId.value || !currentTeam.value) {
      mutationError.value = 'The team workspace is unavailable for join-request review.'
      return null
    }

    const request = await runMutation(`approve-join-request:${requestId}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamJoinRequestRecord>>(
        `/api/events/${visibleEventId.value}/team-join-requests/${requestId}/actions/approve`,
        {
          method: 'POST'
        }
      )

      teamJoinRequests.value = teamJoinRequests.value.map(request =>
        request.id === requestId ? { ...request, ...response.data } : request
      )
      return response.data
    })

    return request
  }

  async function rejectJoinRequest(requestId: string) {
    if (!visibleEventId.value || !currentTeam.value) {
      mutationError.value = 'The team workspace is unavailable for join-request review.'
      return null
    }

    const request = await runMutation(`reject-join-request:${requestId}`, async () => {
      const response = await apiFetch<TeamWorkspaceApiDataResponse<TeamJoinRequestRecord>>(
        `/api/events/${visibleEventId.value}/team-join-requests/${requestId}/actions/reject`,
        {
          method: 'POST'
        }
      )

      teamJoinRequests.value = teamJoinRequests.value.map(request =>
        request.id === requestId ? { ...request, ...response.data } : request
      )
      return response.data
    })

    return request
  }

  async function leaveCurrentTeam() {
    if (!visibleEventId.value || !currentTeam.value) {
      mutationError.value = 'The team workspace is unavailable for membership changes.'
      return null
    }

    const result = await runMutation(`leave-team:${currentTeam.value.id}`, async () => {
      const leavingTeamId = currentTeam.value!.id
      const response = await apiFetch<TeamWorkspaceApiDataResponse<{
        id: string
        teamId: string
        userId: string
        leftAt: string
        teamDissolved: boolean
      }>>(
        `/api/events/${visibleEventId.value}/teams/${currentTeam.value!.id}/actions/leave`,
        {
          method: 'POST'
        }
      )

      currentTeam.value = null
      currentTeamStatus.value = 'success'
      ownTeam.value = null
      ownTeamStatus.value = 'success'
      visibleTeams.value = visibleTeams.value.filter(team => team.id !== leavingTeamId)
      visibleTeamsTotal.value = Math.max(0, visibleTeamsTotal.value - 1)
      return response.data
    })

    return result
  }

  async function removeCurrentTeamMember(userId: string) {
    if (!visibleEventId.value || !currentTeam.value) {
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
        `/api/events/${visibleEventId.value}/teams/${currentTeam.value!.id}/members/${userId}/actions/remove`,
        {
          method: 'POST'
        }
      )

      const nextMembers = currentTeam.value!.members.filter(member => member.userId !== userId)
      currentTeam.value = { ...currentTeam.value!, members: nextMembers }
      if (ownTeam.value?.id === currentTeam.value.id) {
        ownTeam.value = currentTeam.value
      }
      return response.data
    })

    return result
  }

  async function promoteCurrentTeamMember(userId: string) {
    if (!visibleEventId.value || !currentTeam.value) {
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
        `/api/events/${visibleEventId.value}/teams/${currentTeam.value!.id}/members/${userId}/actions/make-admin`,
        {
          method: 'POST'
        }
      )

      const nextMembers = currentTeam.value!.members.map(member =>
        member.userId === userId ? { ...member, role: 'admin' as const } : member
      )
      currentTeam.value = { ...currentTeam.value!, members: nextMembers }
      if (ownTeam.value?.id === currentTeam.value.id) {
        ownTeam.value = currentTeam.value
      }
      return response.data
    })

    return result
  }

  watch([resolvedTeamId, actorUserId], async ([teamId, userId]) => {
    if (!teamId || !userId) {
      if (initialState.value) {
        currentTeam.value = initialState.value.ownTeam as TeamDetailRecord | null
        currentTeamStatus.value = 'success'
      } else {
        resetCurrentTeamState()
      }
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
    loadVisibleTeams,
    loadMoreVisibleTeamsErrorMessage,
    mutationError,
    ownApplication,
    ownApplicationErrorMessage,
    ownApplicationStatus,
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
    resolvedEvent,
    resolvedTeamId,
    teamJoinRequests,
    teamJoinRequestsErrorMessage,
    teamJoinRequestsStatus,
    updateCurrentTeamJoinPolicy,
    updateCurrentTeamProfile,
    visibleEvent,
    visibleEventErrorMessage,
    visibleEventId,
    visibleEventStatus: computed(() => {
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
