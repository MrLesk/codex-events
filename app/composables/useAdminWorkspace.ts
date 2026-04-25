import type {
  AdminApplicationRecord,
  ApiDataResponse,
  ApiListResponse,
  EvaluationCriterion,
  HackathonRecord,
  HackathonRoleAssignment,
  JudgeAssignmentSummary,
  LeaderboardEntry,
  NoSubmissionEntry,
  PrizeDefinition,
  SessionActor,
  TeamSummary,
  TermsDocument
} from '~/utils/admin-workspace'
import type { Ref } from 'vue'

import {
  buildAdminWorkspaceCacheKey,
  filterManageableHackathons,
  getAdminWorkspaceSubjectKey,
  hasHackathonAdminAccess,
  listAllPaginatedItems
} from '~/utils/admin-workspace'

interface AdminWorkspaceOptions {
  loadHackathons?: MaybeRefOrGetter<boolean>
}

interface AdminHackathonWorkspaceOptions {
  loadCriteria?: MaybeRefOrGetter<boolean>
  loadPrizes?: MaybeRefOrGetter<boolean>
  loadApplicationTermsVersions?: MaybeRefOrGetter<boolean>
  loadWinnerTermsVersions?: MaybeRefOrGetter<boolean>
  loadRoleAssignments?: MaybeRefOrGetter<boolean>
  loadApplications?: MaybeRefOrGetter<boolean>
  loadTeams?: MaybeRefOrGetter<boolean>
  loadNoSubmissionTeams?: MaybeRefOrGetter<boolean>
  loadAssignments?: MaybeRefOrGetter<boolean>
  loadLeaderboard?: MaybeRefOrGetter<boolean>
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
  const subjectKey = computed(() => getAdminWorkspaceSubjectKey(authenticatedUser.value?.sub))
  const loadHackathons = resolveLoadFlag(options.loadHackathons)

  const session = useFetch<ApiDataResponse<{ actor: SessionActor }>>('/api/session', {
    key: () => buildAdminWorkspaceCacheKey('admin-workspace-session', subjectKey.value),
    watch: [subjectKey]
  })

  const actor = computed(() => session.data.value?.data.actor ?? null)

  const hackathons = useFetch<ApiListResponse<HackathonRecord>>('/api/hackathons?page=1&page_size=100', {
    key: () => buildAdminWorkspaceCacheKey('admin-workspace-hackathons', subjectKey.value),
    watch: [subjectKey],
    immediate: loadHackathons.value
  })
  refreshWhenEnabled(hackathons, loadHackathons)

  const manageableHackathons = computed(() => {
    const items = hackathons.data.value?.data ?? []
    return filterManageableHackathons(items, actor.value)
  })

  async function refreshRoot() {
    await session.refresh()

    if (loadHackathons.value) {
      await hackathons.refresh()
    }
  }

  return {
    session,
    actor,
    subjectKey,
    hackathons,
    manageableHackathons,
    refreshRoot
  }
}

export function useAdminHackathonWorkspace(hackathonId: MaybeRefOrGetter<string>, options: AdminHackathonWorkspaceOptions = {}) {
  const resolvedHackathonId = computed(() => toValue(hackathonId))
  const adminWorkspace = useAdminWorkspace({
    loadHackathons: false
  })
  const apiFetch = import.meta.server ? useRequestFetch() : $fetch
  const loadCriteria = resolveLoadFlag(options.loadCriteria)
  const loadPrizes = resolveLoadFlag(options.loadPrizes)
  const loadApplicationTermsVersions = resolveLoadFlag(options.loadApplicationTermsVersions)
  const loadWinnerTermsVersions = resolveLoadFlag(options.loadWinnerTermsVersions)
  const loadRoleAssignments = resolveLoadFlag(options.loadRoleAssignments)
  const loadApplications = resolveLoadFlag(options.loadApplications)
  const loadTeams = resolveLoadFlag(options.loadTeams)
  const loadNoSubmissionTeams = resolveLoadFlag(options.loadNoSubmissionTeams)
  const loadAssignments = resolveLoadFlag(options.loadAssignments)
  const loadLeaderboard = resolveLoadFlag(options.loadLeaderboard)

  const hackathon = useFetch<ApiDataResponse<HackathonRecord>>(
    () => `/api/hackathons/${resolvedHackathonId.value}`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId]
    }
  )

  const criteria = useFetch<ApiListResponse<EvaluationCriterion>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/evaluation-criteria`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-criteria', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId],
      immediate: loadCriteria.value
    }
  )
  refreshWhenEnabled(criteria, loadCriteria)

  const prizes = useFetch<ApiListResponse<PrizeDefinition>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/prizes`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-prizes', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId],
      immediate: loadPrizes.value
    }
  )
  refreshWhenEnabled(prizes, loadPrizes)

  const applicationTermsVersions = useFetch<ApiListResponse<TermsDocument>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/terms/application_terms/versions`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-application-terms', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId],
      immediate: loadApplicationTermsVersions.value
    }
  )
  refreshWhenEnabled(applicationTermsVersions, loadApplicationTermsVersions)

  const winnerTermsVersions = useFetch<ApiListResponse<TermsDocument>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/terms/winner_terms/versions`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-winner-terms', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId],
      immediate: loadWinnerTermsVersions.value
    }
  )
  refreshWhenEnabled(winnerTermsVersions, loadWinnerTermsVersions)

  const roleAssignments = useFetch<ApiListResponse<HackathonRoleAssignment>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/roles`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-roles', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId],
      immediate: loadRoleAssignments.value
    }
  )
  refreshWhenEnabled(roleAssignments, loadRoleAssignments)

  const applications = useFetch<ApiListResponse<AdminApplicationRecord>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/applications`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-applications', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId],
      immediate: loadApplications.value
    }
  )
  refreshWhenEnabled(applications, loadApplications)

  const teams = useAsyncData<TeamSummary[]>(
    () => buildAdminWorkspaceCacheKey('admin-hackathon-teams', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
    async () => await listAllPaginatedItems(
      async (page, pageSize) => await apiFetch<ApiListResponse<TeamSummary>>(
        `/api/hackathons/${resolvedHackathonId.value}/teams`,
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
      watch: [adminWorkspace.subjectKey, resolvedHackathonId],
      default: () => [],
      immediate: loadTeams.value
    }
  )
  refreshWhenEnabled(teams, loadTeams)

  const noSubmissionTeams = useFetch<ApiDataResponse<NoSubmissionEntry[]>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/no-submission-teams`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-no-submission', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId],
      immediate: loadNoSubmissionTeams.value
    }
  )
  refreshWhenEnabled(noSubmissionTeams, loadNoSubmissionTeams)

  const assignments = useFetch<ApiListResponse<JudgeAssignmentSummary>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/judging/assignments`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-assignments', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId],
      immediate: loadAssignments.value
    }
  )
  refreshWhenEnabled(assignments, loadAssignments)

  const leaderboard = useFetch<ApiListResponse<LeaderboardEntry>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/leaderboard`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-leaderboard', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId],
      immediate: loadLeaderboard.value
    }
  )
  refreshWhenEnabled(leaderboard, loadLeaderboard)

  const currentHackathon = computed(() => hackathon.data.value?.data ?? null)
  const canManageCurrentHackathon = computed(() => {
    if (!currentHackathon.value) {
      return false
    }

    return hasHackathonAdminAccess(adminWorkspace.actor.value, currentHackathon.value.id)
  })

  async function refreshWorkspace() {
    const requests: Array<Promise<unknown>> = [
      adminWorkspace.refreshRoot(),
      hackathon.refresh()
    ]

    if (loadCriteria.value) {
      requests.push(criteria.refresh())
    }

    if (loadPrizes.value) {
      requests.push(prizes.refresh())
    }

    if (loadApplicationTermsVersions.value) {
      requests.push(applicationTermsVersions.refresh())
    }

    if (loadWinnerTermsVersions.value) {
      requests.push(winnerTermsVersions.refresh())
    }

    if (loadRoleAssignments.value) {
      requests.push(roleAssignments.refresh())
    }

    if (loadApplications.value) {
      requests.push(applications.refresh())
    }

    if (loadTeams.value) {
      requests.push(teams.refresh())
    }

    if (loadNoSubmissionTeams.value) {
      requests.push(noSubmissionTeams.refresh())
    }

    if (loadAssignments.value) {
      requests.push(assignments.refresh())
    }

    if (loadLeaderboard.value) {
      requests.push(leaderboard.refresh())
    }

    await Promise.all(requests)
  }

  return {
    ...adminWorkspace,
    hackathon,
    currentHackathon,
    criteria,
    prizes,
    applicationTermsVersions,
    winnerTermsVersions,
    roleAssignments,
    applications,
    teams,
    noSubmissionTeams,
    assignments,
    leaderboard,
    canManageCurrentHackathon,
    refreshWorkspace
  }
}
