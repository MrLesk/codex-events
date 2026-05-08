import type { ApiDataResponse, ApiListResponse } from '~/lib/api'
import type { SessionActor } from '~/domains/accounts/session-actor'
import type { EventRecord } from '~/domains/events/records'
import type { EvaluationCriterion } from '~/domains/judging/criteria-config'
import type {
  JudgeAssignmentApiDetail,
  JudgeInboxGroup
} from '~/domains/judging/workspace'

import {
  buildJudgeWorkspaceCacheKey,
  filterAssignmentsForActor,
  filterReviewableEvents,
  getJudgeWorkspaceSubjectKey,
  listAllVisibleEvents,
  normalizeJudgeAssignmentDetail,
  sortJudgeAssignments
} from '~/domains/judging/workspace'

export function useJudgeWorkspace() {
  const authenticatedUser = useUser()
  const subjectKey = computed(() => getJudgeWorkspaceSubjectKey(authenticatedUser.value?.sub))

  const session = useFetch<ApiDataResponse<{ actor: SessionActor }>>('/api/session', {
    key: () => buildJudgeWorkspaceCacheKey('judge-workspace-session', subjectKey.value),
    watch: [subjectKey],
    server: false
  })

  const actor = computed(() => session.data.value?.data.actor ?? null)
  const canLoadEvents = computed(() => Boolean(actor.value?.hasPlatformAccount))

  const events = useAsyncData<EventRecord[]>(
    () => buildJudgeWorkspaceCacheKey('judge-workspace-events', subjectKey.value),
    async () => {
      if (!canLoadEvents.value) {
        return []
      }

      return await listAllVisibleEvents(
        async (page, pageSize) => await $fetch<ApiListResponse<EventRecord>>('/api/events', {
          query: {
            page,
            page_size: pageSize
          }
        }),
        100
      )
    },
    {
      watch: [subjectKey, canLoadEvents],
      server: false,
      default: () => []
    }
  )

  const reviewableEvents = computed(() =>
    filterReviewableEvents(events.data.value ?? [], actor.value)
  )

  const inboxRequest = useAsyncData<JudgeInboxGroup[]>(
    () => buildJudgeWorkspaceCacheKey('judge-workspace-inbox', subjectKey.value),
    async () => {
      if (!actor.value?.hasPlatformAccount) {
        return []
      }

      const groups = await Promise.all(reviewableEvents.value.map(async (event) => {
        const assignmentsResponse = await $fetch<ApiListResponse<JudgeAssignmentApiDetail>>(
          `/api/events/${event.id}/judging/assignments`
        )
        const assignments = assignmentsResponse.data.map(normalizeJudgeAssignmentDetail)

        return {
          event,
          assignments: sortJudgeAssignments(filterAssignmentsForActor(assignments, actor.value))
        } satisfies JudgeInboxGroup
      }))

      return groups.filter(group => group.assignments.length > 0)
    },
    {
      watch: [subjectKey, reviewableEvents],
      server: false,
      default: () => []
    }
  )

  const status = computed(() => {
    if (session.status.value === 'pending' || events.status.value === 'pending' || inboxRequest.status.value === 'pending') {
      return 'pending'
    }

    return 'success'
  })

  const error = computed(() =>
    session.error.value
    ?? events.error.value
    ?? inboxRequest.error.value
    ?? null
  )

  async function refreshWorkspace() {
    await Promise.all([
      session.refresh(),
      events.refresh(),
      inboxRequest.refresh()
    ])
  }

  return {
    session,
    events,
    actor,
    reviewableEvents,
    inboxGroups: computed(() => inboxRequest.data.value ?? []),
    hasPlatformAccount: computed(() => Boolean(actor.value?.hasPlatformAccount)),
    status,
    error,
    refreshWorkspace
  }
}

export function useJudgeAssignmentWorkspace(
  eventId: MaybeRefOrGetter<string>,
  assignmentId: MaybeRefOrGetter<string>
) {
  const authenticatedUser = useUser()
  const subjectKey = computed(() => getJudgeWorkspaceSubjectKey(authenticatedUser.value?.sub))
  const resolvedEventId = computed(() => String(toValue(eventId)).trim())
  const resolvedAssignmentId = computed(() => String(toValue(assignmentId)).trim())

  const session = useFetch<ApiDataResponse<{ actor: SessionActor }>>('/api/session', {
    key: () => buildJudgeWorkspaceCacheKey('judge-assignment-session', subjectKey.value),
    watch: [subjectKey],
    server: false
  })

  const event = useFetch<ApiDataResponse<EventRecord>>(
    () => `/api/events/${resolvedEventId.value}`,
    {
      key: () => buildJudgeWorkspaceCacheKey('judge-assignment-event', subjectKey.value, resolvedEventId.value),
      watch: [subjectKey, resolvedEventId],
      server: false
    }
  )

  const assignmentRequest = useFetch<ApiDataResponse<JudgeAssignmentApiDetail>>(
    () => `/api/events/${resolvedEventId.value}/judging/assignments/${resolvedAssignmentId.value}`,
    {
      key: () => buildJudgeWorkspaceCacheKey(
        'judge-assignment-detail',
        subjectKey.value,
        resolvedEventId.value,
        resolvedAssignmentId.value
      ),
      watch: [subjectKey, resolvedEventId, resolvedAssignmentId],
      server: false
    }
  )

  const assignment = computed(() => {
    const assignmentData = assignmentRequest.data.value?.data

    return assignmentData ? normalizeJudgeAssignmentDetail(assignmentData) : null
  })
  const criteriaStage = computed(() => assignment.value?.reviewStage ?? null)

  const criteria = useAsyncData<EvaluationCriterion[]>(
    () => buildJudgeWorkspaceCacheKey(
      'judge-assignment-criteria',
      subjectKey.value,
      resolvedEventId.value,
      criteriaStage.value ?? 'none'
    ),
    async () => {
      if (criteriaStage.value !== 'blind_review') {
        return []
      }

      const response = await $fetch<ApiListResponse<EvaluationCriterion>>(
        `/api/events/${resolvedEventId.value}/evaluation-criteria`
      )

      return response.data
    },
    {
      watch: [subjectKey, resolvedEventId, criteriaStage],
      server: false,
      default: () => []
    }
  )

  const status = computed(() => {
    if (
      session.status.value === 'pending'
      || event.status.value === 'pending'
      || assignmentRequest.status.value === 'pending'
      || criteria.status.value === 'pending'
    ) {
      return 'pending'
    }

    return 'success'
  })

  const error = computed(() =>
    session.error.value
    ?? event.error.value
    ?? assignmentRequest.error.value
    ?? criteria.error.value
    ?? null
  )

  async function refreshAssignmentWorkspace() {
    await Promise.all([
      session.refresh(),
      event.refresh(),
      assignmentRequest.refresh(),
      criteria.refresh()
    ])
  }

  return {
    session,
    actor: computed(() => session.data.value?.data.actor ?? null),
    event: computed(() => event.data.value?.data ?? null),
    assignment,
    criteria: computed(() => criteria.data.value ?? []),
    status,
    error,
    refreshAssignmentWorkspace
  }
}
