import type { Ref } from 'vue'
import type { SessionActor } from '~/domains/accounts/session-actor'
import type {
  EventRecord,
  TermsDocument
} from '~/domains/events/records'
import type { EventRoleAssignment } from '~/domains/events/access'
import type { JudgeAssignmentSummary } from '~/domains/judging/admin-oversight'
import type { EvaluationCriterion } from '~/domains/judging/criteria-config'
import type {
  LeaderboardEntry
} from '~/domains/outcomes/admin-outcomes'
import type { PrizeDefinition } from '~/domains/outcomes/prizes'
import type { TeamSummary } from '~/domains/teams/admin-team-record'
import type { ApiDataResponse, ApiListResponse } from '~/lib/api'

import { buildApiCacheKey, getApiSubjectKey, listAllPaginatedItems } from '~/lib/api'
import {
  filterManageableEvents,
  hasEventAdminAccess
} from '~/domains/events/access'

interface AdminWorkspaceOptions {
  loadEvents?: MaybeRefOrGetter<boolean>
}

interface AdminEventSettingsWorkspaceOptions {
  loadCriteria?: MaybeRefOrGetter<boolean>
  loadPrizes?: MaybeRefOrGetter<boolean>
  loadTerms?: MaybeRefOrGetter<boolean>
  loadRoleAssignments?: MaybeRefOrGetter<boolean>
}

interface AdminEventOperationsWorkspaceOptions {
  loadLifecycleData?: MaybeRefOrGetter<boolean>
}

interface RefreshableAsyncRequest {
  status: Ref<string>
  refresh: () => Promise<unknown>
}

function resolveLoadFlag(flag: MaybeRefOrGetter<boolean> | undefined) {
  return computed(() => flag === undefined ? true : toValue(flag))
}

function refreshWhenEnabled(request: RefreshableAsyncRequest, enabled: Ref<boolean>) {
  watch(enabled, async (isEnabled) => {
    if (!isEnabled || request.status.value !== 'idle') {
      return
    }

    await request.refresh()
  })
}

export function useAdminWorkspace(options: AdminWorkspaceOptions = {}) {
  const authenticatedUser = useUser()
  const subjectKey = computed(() => getApiSubjectKey(authenticatedUser.value?.sub))
  const loadEvents = resolveLoadFlag(options.loadEvents)

  const session = useFetch<ApiDataResponse<{ actor: SessionActor }>>('/api/session', {
    key: () => buildApiCacheKey('admin-workspace-session', subjectKey.value),
    watch: [subjectKey]
  })

  const actor = computed(() => session.data.value?.data.actor ?? null)

  const events = useFetch<ApiListResponse<EventRecord>>('/api/events?page=1&page_size=100', {
    key: () => buildApiCacheKey('admin-workspace-events', subjectKey.value),
    watch: [subjectKey],
    immediate: loadEvents.value
  })
  refreshWhenEnabled(events, loadEvents)

  const manageableEvents = computed(() => {
    const items = events.data.value?.data ?? []
    return filterManageableEvents(items, actor.value)
  })

  async function refreshRoot() {
    const requests: Array<Promise<unknown>> = [
      session.refresh(),
      refreshNuxtData(buildApiCacheKey('session-actor', subjectKey.value))
    ]

    if (loadEvents.value) {
      requests.push(events.refresh())
    }

    await Promise.all(requests)
  }

  return {
    session,
    actor,
    subjectKey,
    events,
    manageableEvents,
    refreshRoot
  }
}

function useAdminEventBase(eventId: MaybeRefOrGetter<string>) {
  const resolvedEventId = computed(() => toValue(eventId))
  const adminWorkspace = useAdminWorkspace({
    loadEvents: false
  })

  const event = useFetch<ApiDataResponse<EventRecord>>(
    () => `/api/events/${resolvedEventId.value}`,
    {
      key: () => buildApiCacheKey('admin-event', adminWorkspace.subjectKey.value, resolvedEventId.value),
      watch: [adminWorkspace.subjectKey, resolvedEventId]
    }
  )

  const currentEvent = computed(() => event.data.value?.data ?? null)
  const canManageCurrentEvent = computed(() => {
    if (!currentEvent.value) {
      return false
    }

    return hasEventAdminAccess(adminWorkspace.actor.value, currentEvent.value.id)
  })

  return {
    ...adminWorkspace,
    resolvedEventId,
    event,
    currentEvent,
    canManageCurrentEvent
  }
}

export function useAdminEventSettingsWorkspace(
  eventId: MaybeRefOrGetter<string>,
  options: AdminEventSettingsWorkspaceOptions = {}
) {
  const adminEvent = useAdminEventBase(eventId)
  const loadCriteria = resolveLoadFlag(options.loadCriteria)
  const loadPrizes = resolveLoadFlag(options.loadPrizes)
  const loadTerms = resolveLoadFlag(options.loadTerms)
  const loadRoleAssignments = resolveLoadFlag(options.loadRoleAssignments)
  const loadCompetitionCriteria = computed(() =>
    loadCriteria.value && adminEvent.currentEvent.value?.eventType === 'hackathon'
  )
  const loadCompetitionPrizes = computed(() =>
    loadPrizes.value && adminEvent.currentEvent.value?.eventType === 'hackathon'
  )
  const loadWinnerTerms = computed(() =>
    loadTerms.value && adminEvent.currentEvent.value?.eventType === 'hackathon'
  )

  const criteria = useFetch<ApiListResponse<EvaluationCriterion>>(
    () => `/api/events/${adminEvent.resolvedEventId.value}/evaluation-criteria`,
    {
      key: () => buildApiCacheKey('admin-event-criteria', adminEvent.subjectKey.value, adminEvent.resolvedEventId.value),
      watch: [adminEvent.subjectKey, adminEvent.resolvedEventId],
      immediate: loadCompetitionCriteria.value
    }
  )
  refreshWhenEnabled(criteria, loadCompetitionCriteria)

  const prizes = useFetch<ApiListResponse<PrizeDefinition>>(
    () => `/api/events/${adminEvent.resolvedEventId.value}/prizes`,
    {
      key: () => buildApiCacheKey('admin-event-prizes', adminEvent.subjectKey.value, adminEvent.resolvedEventId.value),
      watch: [adminEvent.subjectKey, adminEvent.resolvedEventId],
      immediate: loadCompetitionPrizes.value
    }
  )
  refreshWhenEnabled(prizes, loadCompetitionPrizes)

  const applicationTermsVersions = useFetch<ApiListResponse<TermsDocument>>(
    () => `/api/events/${adminEvent.resolvedEventId.value}/terms/application_terms/versions`,
    {
      key: () => buildApiCacheKey('admin-event-application-terms', adminEvent.subjectKey.value, adminEvent.resolvedEventId.value),
      watch: [adminEvent.subjectKey, adminEvent.resolvedEventId],
      immediate: loadTerms.value
    }
  )
  refreshWhenEnabled(applicationTermsVersions, loadTerms)

  const winnerTermsVersions = useFetch<ApiListResponse<TermsDocument>>(
    () => `/api/events/${adminEvent.resolvedEventId.value}/terms/winner_terms/versions`,
    {
      key: () => buildApiCacheKey('admin-event-winner-terms', adminEvent.subjectKey.value, adminEvent.resolvedEventId.value),
      watch: [adminEvent.subjectKey, adminEvent.resolvedEventId],
      immediate: loadWinnerTerms.value
    }
  )
  refreshWhenEnabled(winnerTermsVersions, loadWinnerTerms)

  const roleAssignments = useFetch<ApiListResponse<EventRoleAssignment>>(
    () => `/api/events/${adminEvent.resolvedEventId.value}/roles`,
    {
      key: () => buildApiCacheKey('admin-event-roles', adminEvent.subjectKey.value, adminEvent.resolvedEventId.value),
      watch: [adminEvent.subjectKey, adminEvent.resolvedEventId],
      immediate: loadRoleAssignments.value
    }
  )
  refreshWhenEnabled(roleAssignments, loadRoleAssignments)

  async function refreshWorkspace() {
    const requests: Array<Promise<unknown>> = [
      adminEvent.refreshRoot(),
      adminEvent.event.refresh()
    ]

    if (loadCompetitionCriteria.value) {
      requests.push(criteria.refresh())
    }

    if (loadCompetitionPrizes.value) {
      requests.push(prizes.refresh())
    }

    if (loadTerms.value) {
      requests.push(applicationTermsVersions.refresh())
    }

    if (loadWinnerTerms.value) {
      requests.push(winnerTermsVersions.refresh())
    }

    if (loadRoleAssignments.value) {
      requests.push(roleAssignments.refresh())
    }

    await Promise.all(requests)
  }

  return {
    ...adminEvent,
    criteria,
    prizes,
    applicationTermsVersions,
    winnerTermsVersions,
    roleAssignments,
    refreshWorkspace
  }
}

export function useAdminEventOperationsWorkspace(
  eventId: MaybeRefOrGetter<string>,
  options: AdminEventOperationsWorkspaceOptions = {}
) {
  const adminEvent = useAdminEventBase(eventId)
  const apiFetch = import.meta.server ? useRequestFetch() : $fetch
  const loadLifecycleData = resolveLoadFlag(options.loadLifecycleData)
  const loadCompetitionData = computed(() =>
    loadLifecycleData.value && adminEvent.currentEvent.value?.eventType === 'hackathon'
  )

  const prizes = useFetch<ApiListResponse<PrizeDefinition>>(
    () => `/api/events/${adminEvent.resolvedEventId.value}/prizes`,
    {
      key: () => buildApiCacheKey('admin-event-prizes', adminEvent.subjectKey.value, adminEvent.resolvedEventId.value),
      watch: [adminEvent.subjectKey, adminEvent.resolvedEventId],
      immediate: loadCompetitionData.value
    }
  )
  refreshWhenEnabled(prizes, loadCompetitionData)

  const roleAssignments = useFetch<ApiListResponse<EventRoleAssignment>>(
    () => `/api/events/${adminEvent.resolvedEventId.value}/roles`,
    {
      key: () => buildApiCacheKey('admin-event-roles', adminEvent.subjectKey.value, adminEvent.resolvedEventId.value),
      watch: [adminEvent.subjectKey, adminEvent.resolvedEventId],
      immediate: loadCompetitionData.value
    }
  )
  refreshWhenEnabled(roleAssignments, loadCompetitionData)

  const teams = useAsyncData<TeamSummary[]>(
    () => buildApiCacheKey('admin-event-teams', adminEvent.subjectKey.value, adminEvent.resolvedEventId.value),
    async () => await listAllPaginatedItems(
      async (page, pageSize) => await apiFetch<ApiListResponse<TeamSummary>>(
        `/api/events/${adminEvent.resolvedEventId.value}/teams`,
        {
          query: {
            page,
            page_size: pageSize
          }
        }
      ),
      100
    ),
    {
      watch: [adminEvent.subjectKey, adminEvent.resolvedEventId],
      default: () => [],
      immediate: loadCompetitionData.value
    }
  )
  refreshWhenEnabled(teams, loadCompetitionData)

  const assignments = useFetch<ApiListResponse<JudgeAssignmentSummary>>(
    () => `/api/events/${adminEvent.resolvedEventId.value}/judging/assignments`,
    {
      key: () => buildApiCacheKey('admin-event-assignments', adminEvent.subjectKey.value, adminEvent.resolvedEventId.value),
      watch: [adminEvent.subjectKey, adminEvent.resolvedEventId],
      immediate: loadCompetitionData.value
    }
  )
  refreshWhenEnabled(assignments, loadCompetitionData)

  const leaderboard = useFetch<ApiListResponse<LeaderboardEntry>>(
    () => `/api/events/${adminEvent.resolvedEventId.value}/leaderboard`,
    {
      key: () => buildApiCacheKey('admin-event-leaderboard', adminEvent.subjectKey.value, adminEvent.resolvedEventId.value),
      watch: [adminEvent.subjectKey, adminEvent.resolvedEventId],
      immediate: loadCompetitionData.value
    }
  )
  refreshWhenEnabled(leaderboard, loadCompetitionData)

  async function refreshWorkspace() {
    const requests: Array<Promise<unknown>> = [
      adminEvent.refreshRoot(),
      adminEvent.event.refresh()
    ]

    if (loadCompetitionData.value) {
      requests.push(
        prizes.refresh(),
        roleAssignments.refresh(),
        teams.refresh(),
        assignments.refresh(),
        leaderboard.refresh()
      )
    }

    await Promise.all(requests)
  }

  return {
    ...adminEvent,
    prizes,
    roleAssignments,
    teams,
    assignments,
    leaderboard,
    refreshWorkspace
  }
}
