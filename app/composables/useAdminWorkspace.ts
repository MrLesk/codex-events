import type { Ref } from 'vue'
import type { SessionActor } from '~/domains/accounts/session-actor'
import type {
  HackathonRecord,
  TermsDocument
} from '~/domains/hackathons/records'
import type { HackathonRoleAssignment } from '~/domains/hackathons/access'
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
  filterManageableHackathons,
  hasHackathonAdminAccess
} from '~/domains/hackathons/access'

interface AdminWorkspaceOptions {
  loadHackathons?: MaybeRefOrGetter<boolean>
}

interface AdminHackathonSettingsWorkspaceOptions {
  loadCriteria?: MaybeRefOrGetter<boolean>
  loadPrizes?: MaybeRefOrGetter<boolean>
  loadTerms?: MaybeRefOrGetter<boolean>
  loadRoleAssignments?: MaybeRefOrGetter<boolean>
}

interface AdminHackathonOperationsWorkspaceOptions {
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
  const loadHackathons = resolveLoadFlag(options.loadHackathons)

  const session = useFetch<ApiDataResponse<{ actor: SessionActor }>>('/api/session', {
    key: () => buildApiCacheKey('admin-workspace-session', subjectKey.value),
    watch: [subjectKey]
  })

  const actor = computed(() => session.data.value?.data.actor ?? null)

  const hackathons = useFetch<ApiListResponse<HackathonRecord>>('/api/hackathons?page=1&page_size=100', {
    key: () => buildApiCacheKey('admin-workspace-hackathons', subjectKey.value),
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

function useAdminHackathonBase(hackathonId: MaybeRefOrGetter<string>) {
  const resolvedHackathonId = computed(() => toValue(hackathonId))
  const adminWorkspace = useAdminWorkspace({
    loadHackathons: false
  })

  const hackathon = useFetch<ApiDataResponse<HackathonRecord>>(
    () => `/api/hackathons/${resolvedHackathonId.value}`,
    {
      key: () => buildApiCacheKey('admin-hackathon', adminWorkspace.subjectKey.value, resolvedHackathonId.value),
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

  return {
    ...adminWorkspace,
    resolvedHackathonId,
    hackathon,
    currentHackathon,
    canManageCurrentHackathon
  }
}

export function useAdminHackathonSettingsWorkspace(
  hackathonId: MaybeRefOrGetter<string>,
  options: AdminHackathonSettingsWorkspaceOptions = {}
) {
  const adminHackathon = useAdminHackathonBase(hackathonId)
  const loadCriteria = resolveLoadFlag(options.loadCriteria)
  const loadPrizes = resolveLoadFlag(options.loadPrizes)
  const loadTerms = resolveLoadFlag(options.loadTerms)
  const loadRoleAssignments = resolveLoadFlag(options.loadRoleAssignments)

  const criteria = useFetch<ApiListResponse<EvaluationCriterion>>(
    () => `/api/hackathons/${adminHackathon.resolvedHackathonId.value}/evaluation-criteria`,
    {
      key: () => buildApiCacheKey('admin-hackathon-criteria', adminHackathon.subjectKey.value, adminHackathon.resolvedHackathonId.value),
      watch: [adminHackathon.subjectKey, adminHackathon.resolvedHackathonId],
      immediate: loadCriteria.value
    }
  )
  refreshWhenEnabled(criteria, loadCriteria)

  const prizes = useFetch<ApiListResponse<PrizeDefinition>>(
    () => `/api/hackathons/${adminHackathon.resolvedHackathonId.value}/prizes`,
    {
      key: () => buildApiCacheKey('admin-hackathon-prizes', adminHackathon.subjectKey.value, adminHackathon.resolvedHackathonId.value),
      watch: [adminHackathon.subjectKey, adminHackathon.resolvedHackathonId],
      immediate: loadPrizes.value
    }
  )
  refreshWhenEnabled(prizes, loadPrizes)

  const applicationTermsVersions = useFetch<ApiListResponse<TermsDocument>>(
    () => `/api/hackathons/${adminHackathon.resolvedHackathonId.value}/terms/application_terms/versions`,
    {
      key: () => buildApiCacheKey('admin-hackathon-application-terms', adminHackathon.subjectKey.value, adminHackathon.resolvedHackathonId.value),
      watch: [adminHackathon.subjectKey, adminHackathon.resolvedHackathonId],
      immediate: loadTerms.value
    }
  )
  refreshWhenEnabled(applicationTermsVersions, loadTerms)

  const winnerTermsVersions = useFetch<ApiListResponse<TermsDocument>>(
    () => `/api/hackathons/${adminHackathon.resolvedHackathonId.value}/terms/winner_terms/versions`,
    {
      key: () => buildApiCacheKey('admin-hackathon-winner-terms', adminHackathon.subjectKey.value, adminHackathon.resolvedHackathonId.value),
      watch: [adminHackathon.subjectKey, adminHackathon.resolvedHackathonId],
      immediate: loadTerms.value
    }
  )
  refreshWhenEnabled(winnerTermsVersions, loadTerms)

  const roleAssignments = useFetch<ApiListResponse<HackathonRoleAssignment>>(
    () => `/api/hackathons/${adminHackathon.resolvedHackathonId.value}/roles`,
    {
      key: () => buildApiCacheKey('admin-hackathon-roles', adminHackathon.subjectKey.value, adminHackathon.resolvedHackathonId.value),
      watch: [adminHackathon.subjectKey, adminHackathon.resolvedHackathonId],
      immediate: loadRoleAssignments.value
    }
  )
  refreshWhenEnabled(roleAssignments, loadRoleAssignments)

  async function refreshWorkspace() {
    const requests: Array<Promise<unknown>> = [
      adminHackathon.refreshRoot(),
      adminHackathon.hackathon.refresh()
    ]

    if (loadCriteria.value) {
      requests.push(criteria.refresh())
    }

    if (loadPrizes.value) {
      requests.push(prizes.refresh())
    }

    if (loadTerms.value) {
      requests.push(applicationTermsVersions.refresh())
    }

    if (loadTerms.value) {
      requests.push(winnerTermsVersions.refresh())
    }

    if (loadRoleAssignments.value) {
      requests.push(roleAssignments.refresh())
    }

    await Promise.all(requests)
  }

  return {
    ...adminHackathon,
    criteria,
    prizes,
    applicationTermsVersions,
    winnerTermsVersions,
    roleAssignments,
    refreshWorkspace
  }
}

export function useAdminHackathonOperationsWorkspace(
  hackathonId: MaybeRefOrGetter<string>,
  options: AdminHackathonOperationsWorkspaceOptions = {}
) {
  const adminHackathon = useAdminHackathonBase(hackathonId)
  const apiFetch = import.meta.server ? useRequestFetch() : $fetch
  const loadLifecycleData = resolveLoadFlag(options.loadLifecycleData)

  const prizes = useFetch<ApiListResponse<PrizeDefinition>>(
    () => `/api/hackathons/${adminHackathon.resolvedHackathonId.value}/prizes`,
    {
      key: () => buildApiCacheKey('admin-hackathon-prizes', adminHackathon.subjectKey.value, adminHackathon.resolvedHackathonId.value),
      watch: [adminHackathon.subjectKey, adminHackathon.resolvedHackathonId],
      immediate: loadLifecycleData.value
    }
  )
  refreshWhenEnabled(prizes, loadLifecycleData)

  const roleAssignments = useFetch<ApiListResponse<HackathonRoleAssignment>>(
    () => `/api/hackathons/${adminHackathon.resolvedHackathonId.value}/roles`,
    {
      key: () => buildApiCacheKey('admin-hackathon-roles', adminHackathon.subjectKey.value, adminHackathon.resolvedHackathonId.value),
      watch: [adminHackathon.subjectKey, adminHackathon.resolvedHackathonId],
      immediate: loadLifecycleData.value
    }
  )
  refreshWhenEnabled(roleAssignments, loadLifecycleData)

  const teams = useAsyncData<TeamSummary[]>(
    () => buildApiCacheKey('admin-hackathon-teams', adminHackathon.subjectKey.value, adminHackathon.resolvedHackathonId.value),
    async () => await listAllPaginatedItems(
      async (page, pageSize) => await apiFetch<ApiListResponse<TeamSummary>>(
        `/api/hackathons/${adminHackathon.resolvedHackathonId.value}/teams`,
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
      watch: [adminHackathon.subjectKey, adminHackathon.resolvedHackathonId],
      default: () => [],
      immediate: loadLifecycleData.value
    }
  )
  refreshWhenEnabled(teams, loadLifecycleData)

  const assignments = useFetch<ApiListResponse<JudgeAssignmentSummary>>(
    () => `/api/hackathons/${adminHackathon.resolvedHackathonId.value}/judging/assignments`,
    {
      key: () => buildApiCacheKey('admin-hackathon-assignments', adminHackathon.subjectKey.value, adminHackathon.resolvedHackathonId.value),
      watch: [adminHackathon.subjectKey, adminHackathon.resolvedHackathonId],
      immediate: loadLifecycleData.value
    }
  )
  refreshWhenEnabled(assignments, loadLifecycleData)

  const leaderboard = useFetch<ApiListResponse<LeaderboardEntry>>(
    () => `/api/hackathons/${adminHackathon.resolvedHackathonId.value}/leaderboard`,
    {
      key: () => buildApiCacheKey('admin-hackathon-leaderboard', adminHackathon.subjectKey.value, adminHackathon.resolvedHackathonId.value),
      watch: [adminHackathon.subjectKey, adminHackathon.resolvedHackathonId],
      immediate: loadLifecycleData.value
    }
  )
  refreshWhenEnabled(leaderboard, loadLifecycleData)

  async function refreshWorkspace() {
    const requests: Array<Promise<unknown>> = [
      adminHackathon.refreshRoot(),
      adminHackathon.hackathon.refresh()
    ]

    if (loadLifecycleData.value) {
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
    ...adminHackathon,
    prizes,
    roleAssignments,
    teams,
    assignments,
    leaderboard,
    refreshWorkspace
  }
}
