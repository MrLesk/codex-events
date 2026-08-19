import type { ApiDataResponse, ApiListResponse } from '~/lib/api'
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
import { throwIfAborted } from '~/lib/request-cancellation'
import { useApiFetch } from '~/composables/useApiClient'
import { useApiData } from '~/composables/useApiData'
import { useSessionActor } from '~/composables/useSessionActor'

export function useJudgeWorkspace() {
  const session = useSessionActor()
  const actor = session.actor
  const subjectKey = computed(() => getJudgeWorkspaceSubjectKey(
    actor.value.isAuthenticated ? actor.value.sessionUser.sub : null
  ))
  const canLoadEvents = computed(() => Boolean(actor.value?.hasPlatformAccount))

  const events = useApiData<EventRecord[]>(
    () => buildJudgeWorkspaceCacheKey('judge-workspace-events', subjectKey.value),
    async ({ apiFetch, signal }) => {
      if (!canLoadEvents.value) {
        return []
      }

      return await listAllVisibleEvents(
        async (page, pageSize) => await apiFetch<ApiListResponse<EventRecord>>('/api/events', {
          query: {
            page,
            page_size: pageSize
          },
          signal
        }),
        100,
        signal
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

  const inboxRequest = useApiData<JudgeInboxGroup[]>(
    () => buildJudgeWorkspaceCacheKey('judge-workspace-inbox', subjectKey.value),
    async ({ apiFetch, signal }) => {
      if (!actor.value?.hasPlatformAccount) {
        return []
      }

      const groups = await Promise.all(reviewableEvents.value.map(async (event) => {
        const assignmentsResponse = await apiFetch<ApiListResponse<JudgeAssignmentApiDetail>>(
          `/api/events/${event.id}/judging/assignments`,
          { signal }
        )
        const assignments = assignmentsResponse.data.map(normalizeJudgeAssignmentDetail)

        return {
          event,
          assignments: sortJudgeAssignments(filterAssignmentsForActor(assignments, actor.value))
        } satisfies JudgeInboxGroup
      }))

      throwIfAborted(signal)

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
  const resolvedEventId = computed(() => String(toValue(eventId)).trim())
  const resolvedAssignmentId = computed(() => String(toValue(assignmentId)).trim())

  const session = useSessionActor()
  const subjectKey = computed(() => getJudgeWorkspaceSubjectKey(
    session.actor.value.isAuthenticated ? session.actor.value.sessionUser.sub : null
  ))

  const event = useApiFetch<ApiDataResponse<EventRecord>>(
    () => `/api/events/${resolvedEventId.value}`,
    {
      key: () => buildJudgeWorkspaceCacheKey('judge-assignment-event', subjectKey.value, resolvedEventId.value),
      watch: [subjectKey, resolvedEventId],
      server: false
    }
  )

  const assignmentRequest = useApiFetch<ApiDataResponse<JudgeAssignmentApiDetail>>(
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

  const criteria = useApiData<EvaluationCriterion[]>(
    () => buildJudgeWorkspaceCacheKey(
      'judge-assignment-criteria',
      subjectKey.value,
      resolvedEventId.value,
      criteriaStage.value ?? 'none'
    ),
    async ({ apiFetch, signal }) => {
      if (criteriaStage.value !== 'blind_review') {
        return []
      }

      const response = await apiFetch<ApiListResponse<EvaluationCriterion>>(
        `/api/events/${resolvedEventId.value}/evaluation-criteria`,
        { signal }
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
    actor: session.actor,
    event: computed(() => event.data.value?.data ?? null),
    assignment,
    criteria: computed(() => criteria.data.value ?? []),
    status,
    error,
    refreshAssignmentWorkspace
  }
}
