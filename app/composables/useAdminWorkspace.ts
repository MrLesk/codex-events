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

import {
  buildAdminWorkspaceCacheKey,
  filterManageableHackathons,
  getAdminWorkspaceSubjectKey,
  hasHackathonAdminAccess,
  listAllPaginatedItems
} from '~/utils/admin-workspace'

export function useAdminWorkspace() {
  const authenticatedUser = useUser()
  const subjectKey = computed(() => getAdminWorkspaceSubjectKey(authenticatedUser.value?.sub))

  const session = useFetch<ApiDataResponse<{ actor: SessionActor }>>('/api/session', {
    key: () => buildAdminWorkspaceCacheKey('admin-workspace-session', subjectKey.value),
    watch: [subjectKey]
  })

  const actor = computed(() => session.data.value?.data.actor ?? null)

  const hackathons = useFetch<ApiListResponse<HackathonRecord>>('/api/hackathons?page=1&page_size=100', {
    key: () => buildAdminWorkspaceCacheKey('admin-workspace-hackathons', subjectKey.value),
    watch: [subjectKey]
  })

  const manageableHackathons = computed(() => {
    const items = hackathons.data.value?.data ?? []
    return filterManageableHackathons(items, actor.value)
  })

  async function refreshRoot() {
    await Promise.all([
      session.refresh(),
      hackathons.refresh()
    ])
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

export function useAdminHackathonWorkspace(hackathonId: MaybeRefOrGetter<string>) {
  const resolvedHackathonId = computed(() => toValue(hackathonId))
  const adminWorkspace = useAdminWorkspace()
  const apiFetch = import.meta.server ? useRequestFetch() : $fetch

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
      watch: [adminWorkspace.subjectKey, resolvedHackathonId]
    }
  )

  const prizes = useFetch<ApiListResponse<PrizeDefinition>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/prizes`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-prizes', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId]
    }
  )

  const applicationTermsVersions = useFetch<ApiListResponse<TermsDocument>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/terms/application_terms/versions`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-application-terms', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId]
    }
  )

  const winnerTermsVersions = useFetch<ApiListResponse<TermsDocument>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/terms/winner_terms/versions`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-winner-terms', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId]
    }
  )

  const roleAssignments = useFetch<ApiListResponse<HackathonRoleAssignment>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/roles`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-roles', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId]
    }
  )

  const applications = useFetch<ApiListResponse<AdminApplicationRecord>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/applications`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-applications', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId]
    }
  )

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
      default: () => []
    }
  )

  const noSubmissionTeams = useFetch<ApiDataResponse<NoSubmissionEntry[]>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/no-submission-teams`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-no-submission', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId]
    }
  )

  const assignments = useFetch<ApiListResponse<JudgeAssignmentSummary>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/judging/assignments`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-assignments', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId]
    }
  )

  const leaderboard = useFetch<ApiListResponse<LeaderboardEntry>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/leaderboard`,
    {
      key: () => buildAdminWorkspaceCacheKey('admin-hackathon-leaderboard', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
      watch: [adminWorkspace.subjectKey, resolvedHackathonId]
    }
  )

  const currentHackathon = computed(() => hackathon.data.value?.data ?? null)
  const canManageCurrentHackathon = computed(() => {
    if (!currentHackathon.value) {
      return false
    }

    return hasHackathonAdminAccess(adminWorkspace.actor.value, currentHackathon.value.id)
  })

  async function refreshWorkspace() {
    await Promise.all([
      adminWorkspace.refreshRoot(),
      hackathon.refresh(),
      criteria.refresh(),
      prizes.refresh(),
      applicationTermsVersions.refresh(),
      winnerTermsVersions.refresh(),
      roleAssignments.refresh(),
      applications.refresh(),
      teams.refresh(),
      noSubmissionTeams.refresh(),
      assignments.refresh(),
      leaderboard.refresh()
    ])
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
