import type {
  ApiDataResponse,
  ApiListResponse,
  EvaluationCriterion,
  HackathonRecord,
  SessionActor
} from '~/utils/admin-workspace'
import type {
  JudgeAssignmentDetail,
  JudgeInboxGroup
} from '~/utils/judging-workspace'

import {
  buildJudgeWorkspaceCacheKey,
  filterAssignmentsForActor,
  filterReviewableHackathons,
  getJudgeWorkspaceSubjectKey,
  listAllVisibleHackathons,
  sortJudgeAssignments
} from '~/utils/judging-workspace'

export function useJudgeWorkspace() {
  const authenticatedUser = useUser()
  const subjectKey = computed(() => getJudgeWorkspaceSubjectKey(authenticatedUser.value?.sub))

  const session = useFetch<ApiDataResponse<{ actor: SessionActor }>>('/api/session', {
    key: () => buildJudgeWorkspaceCacheKey('judge-workspace-session', subjectKey.value),
    watch: [subjectKey],
    server: false
  })

  const actor = computed(() => session.data.value?.data.actor ?? null)
  const canLoadHackathons = computed(() => Boolean(actor.value?.hasPlatformAccount))

  const hackathons = useAsyncData<HackathonRecord[]>(
    () => buildJudgeWorkspaceCacheKey('judge-workspace-hackathons', subjectKey.value),
    async () => {
      if (!canLoadHackathons.value) {
        return []
      }

      return await listAllVisibleHackathons(
        async (page, pageSize) => await $fetch<ApiListResponse<HackathonRecord>>('/api/hackathons', {
          query: {
            page,
            page_size: pageSize
          }
        }),
        100
      )
    },
    {
      watch: [subjectKey, canLoadHackathons],
      server: false,
      default: () => []
    }
  )

  const reviewableHackathons = computed(() =>
    filterReviewableHackathons(hackathons.data.value ?? [], actor.value)
  )

  const inboxRequest = useAsyncData<JudgeInboxGroup[]>(
    () => buildJudgeWorkspaceCacheKey('judge-workspace-inbox', subjectKey.value),
    async () => {
      if (!actor.value?.hasPlatformAccount) {
        return []
      }

      const groups = await Promise.all(reviewableHackathons.value.map(async (hackathon) => {
        const assignmentsResponse = await $fetch<ApiListResponse<JudgeAssignmentDetail>>(
          `/api/hackathons/${hackathon.id}/judging/assignments`
        )

        return {
          hackathon,
          assignments: sortJudgeAssignments(filterAssignmentsForActor(assignmentsResponse.data, actor.value))
        } satisfies JudgeInboxGroup
      }))

      return groups.filter(group => group.assignments.length > 0)
    },
    {
      watch: [subjectKey, reviewableHackathons],
      server: false,
      default: () => []
    }
  )

  const status = computed(() => {
    if (session.status.value === 'pending' || hackathons.status.value === 'pending' || inboxRequest.status.value === 'pending') {
      return 'pending'
    }

    return 'success'
  })

  const error = computed(() =>
    session.error.value
    ?? hackathons.error.value
    ?? inboxRequest.error.value
    ?? null
  )

  async function refreshWorkspace() {
    await Promise.all([
      session.refresh(),
      hackathons.refresh(),
      inboxRequest.refresh()
    ])
  }

  return {
    session,
    hackathons,
    actor,
    reviewableHackathons,
    inboxGroups: computed(() => inboxRequest.data.value ?? []),
    hasPlatformAccount: computed(() => Boolean(actor.value?.hasPlatformAccount)),
    status,
    error,
    refreshWorkspace
  }
}

export function useJudgeAssignmentWorkspace(
  hackathonId: MaybeRefOrGetter<string>,
  assignmentId: MaybeRefOrGetter<string>
) {
  const authenticatedUser = useUser()
  const subjectKey = computed(() => getJudgeWorkspaceSubjectKey(authenticatedUser.value?.sub))
  const resolvedHackathonId = computed(() => String(toValue(hackathonId)).trim())
  const resolvedAssignmentId = computed(() => String(toValue(assignmentId)).trim())

  const session = useFetch<ApiDataResponse<{ actor: SessionActor }>>('/api/session', {
    key: () => buildJudgeWorkspaceCacheKey('judge-assignment-session', subjectKey.value),
    watch: [subjectKey],
    server: false
  })

  const hackathon = useFetch<ApiDataResponse<HackathonRecord>>(
    () => `/api/hackathons/${resolvedHackathonId.value}`,
    {
      key: () => buildJudgeWorkspaceCacheKey('judge-assignment-hackathon', subjectKey.value, resolvedHackathonId.value),
      watch: [subjectKey, resolvedHackathonId],
      server: false
    }
  )

  const assignment = useFetch<ApiDataResponse<JudgeAssignmentDetail>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/judging/assignments/${resolvedAssignmentId.value}`,
    {
      key: () => buildJudgeWorkspaceCacheKey(
        'judge-assignment-detail',
        subjectKey.value,
        resolvedHackathonId.value,
        resolvedAssignmentId.value
      ),
      watch: [subjectKey, resolvedHackathonId, resolvedAssignmentId],
      server: false
    }
  )

  const criteria = useFetch<ApiListResponse<EvaluationCriterion>>(
    () => `/api/hackathons/${resolvedHackathonId.value}/evaluation-criteria`,
    {
      key: () => buildJudgeWorkspaceCacheKey('judge-assignment-criteria', subjectKey.value, resolvedHackathonId.value),
      watch: [subjectKey, resolvedHackathonId],
      server: false
    }
  )

  const status = computed(() => {
    if (
      session.status.value === 'pending'
      || hackathon.status.value === 'pending'
      || assignment.status.value === 'pending'
      || criteria.status.value === 'pending'
    ) {
      return 'pending'
    }

    return 'success'
  })

  const error = computed(() =>
    session.error.value
    ?? hackathon.error.value
    ?? assignment.error.value
    ?? criteria.error.value
    ?? null
  )

  async function refreshAssignmentWorkspace() {
    await Promise.all([
      session.refresh(),
      hackathon.refresh(),
      assignment.refresh(),
      criteria.refresh()
    ])
  }

  return {
    session,
    actor: computed(() => session.data.value?.data.actor ?? null),
    hackathon: computed(() => hackathon.data.value?.data ?? null),
    assignment: computed(() => assignment.data.value?.data ?? null),
    criteria: computed(() => criteria.data.value?.data ?? []),
    status,
    error,
    refreshAssignmentWorkspace
  }
}
