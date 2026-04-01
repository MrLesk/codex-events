<script setup lang="ts">
import type { ApiDataResponse, HackathonRecord } from '~/utils/admin-workspace'
import type { JudgeAssignmentDetail } from '~/utils/judging-workspace'

import BlindSubmissionPanel from '~/components/judging/BlindSubmissionPanel.vue'
import JudgeAssignmentStatusBadge from '~/components/judging/JudgeAssignmentStatusBadge.vue'
import JudgeReviewRubric from '~/components/judging/JudgeReviewRubric.vue'
import { formatHackathonState, getHackathonStateColor } from '~/utils/admin-workspace'
import {
  buildCompletionCriterionScoresPayload,
  canCompleteJudgeAssignment,
  canMarkJudgeAssignmentIneligible,
  canSkipJudgeAssignment,
  canStartJudgeAssignment,
  createCriterionScoreDrafts,
  describeJudgeAssignmentStatus,
  formatJudgeIneligibilityStatus,
  formatJudgeTimestamp,
  hasIncompleteCriterionScores,
  resolveJudgeIneligibilityColor
} from '~/utils/judging-workspace'

definePageMeta({
  layout: 'hackathon-detail',
  middleware: ['require-hackathon-judge']
})

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())
const assignmentId = computed(() => String(route.params.assignmentId ?? '').trim())

if (!slug.value || !assignmentId.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Judge assignment not found.'
  })
}

const {
  data: hackathonResponse,
  error: hackathonError
} = await useFetch<ApiDataResponse<HackathonRecord>>(() => `/api/hackathons/slug/${slug.value}`, {
  key: () => `judge-assignment-hackathon:${slug.value}:${assignmentId.value}`
})

if (hackathonError.value) {
  throw createError({
    statusCode: hackathonError.value.statusCode ?? hackathonError.value.status ?? 500,
    statusMessage: hackathonError.value.statusMessage ?? 'Unable to load the requested hackathon.'
  })
}

if (!hackathonResponse.value?.data) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const hackathonId = computed(() => hackathonResponse.value!.data.id)
const workspace = useJudgeAssignmentWorkspace(hackathonId, assignmentId)

const hackathon = computed(() => workspace.hackathon.value)
const criteria = computed(() => workspace.criteria.value)
const assignment = ref<JudgeAssignmentDetail | null>(null)
const scoreDrafts = ref(createCriterionScoreDrafts(criteria.value, null))
const skipReason = ref('')
const ineligibleReason = ref('')
const actionState = reactive({
  pendingAction: '' as '' | 'start' | 'complete' | 'skip' | 'ineligible',
  success: '',
  error: ''
})

watch(workspace.assignment, (nextAssignment) => {
  if (!nextAssignment) {
    return
  }

  assignment.value = nextAssignment
  scoreDrafts.value = createCriterionScoreDrafts(criteria.value, nextAssignment)
  ineligibleReason.value = nextAssignment.ineligibilityReason ?? ''
}, {
  immediate: true
})

watch(criteria, (nextCriteria) => {
  scoreDrafts.value = createCriterionScoreDrafts(nextCriteria, assignment.value)
})

const hasIncompleteScores = computed(() => hasIncompleteCriterionScores(scoreDrafts.value))
const rubricReadonly = computed(() => !assignment.value || assignment.value.status !== 'judge_started')
const timelineRows = computed(() => [
  {
    label: 'Assigned',
    value: formatJudgeTimestamp(assignment.value?.assignedAt)
  },
  {
    label: 'Started',
    value: formatJudgeTimestamp(assignment.value?.startedAt)
  },
  {
    label: 'Completed',
    value: formatJudgeTimestamp(assignment.value?.completedAt)
  },
  {
    label: 'Eligibility marked',
    value: formatJudgeTimestamp(assignment.value?.ineligibilityMarkedAt)
  }
])

async function withActionFeedback(
  action: 'start' | 'complete' | 'skip' | 'ineligible',
  handler: () => Promise<void>
) {
  actionState.pendingAction = action
  actionState.error = ''
  actionState.success = ''

  try {
    await handler()
  } catch (error) {
    actionState.error = error instanceof Error
      ? error.message
      : 'The judge action could not be completed.'
  } finally {
    actionState.pendingAction = ''
  }
}

async function startReview() {
  if (!assignment.value || !canStartJudgeAssignment(assignment.value)) {
    return
  }

  await withActionFeedback('start', async () => {
    const response = await $fetch<ApiDataResponse<JudgeAssignmentDetail>>(
      `/api/hackathons/${hackathonId.value}/judging/assignments/${assignmentId.value}/actions/start`,
      {
        method: 'POST'
      }
    )

    assignment.value = response.data
    scoreDrafts.value = createCriterionScoreDrafts(criteria.value, response.data)
    actionState.success = 'Review started. The scoring rubric is now unlocked.'
  })
}

async function completeReview() {
  if (!assignment.value || !canCompleteJudgeAssignment(assignment.value)) {
    return
  }

  if (criteria.value.length === 0) {
    actionState.error = 'This hackathon has no evaluation criteria configured for blind review.'
    return
  }

  if (hasIncompleteScores.value) {
    actionState.error = 'Every criterion needs an integer score before the review can be completed.'
    return
  }

  await withActionFeedback('complete', async () => {
    const response = await $fetch<ApiDataResponse<JudgeAssignmentDetail>>(
      `/api/hackathons/${hackathonId.value}/judging/assignments/${assignmentId.value}/actions/complete`,
      {
        method: 'POST',
        body: {
          criterionScores: buildCompletionCriterionScoresPayload(scoreDrafts.value)
        }
      }
    )

    assignment.value = response.data
    scoreDrafts.value = createCriterionScoreDrafts(criteria.value, response.data)
    actionState.success = 'Review submitted. The assignment is now recorded as complete.'
  })
}

async function skipReview() {
  if (!assignment.value || !canSkipJudgeAssignment(assignment.value)) {
    return
  }

  await withActionFeedback('skip', async () => {
    await $fetch(
      `/api/hackathons/${hackathonId.value}/judging/assignments/${assignmentId.value}/actions/skip`,
      {
        method: 'POST',
        body: {
          reason: skipReason.value.trim() || undefined
        }
      }
    )

    await navigateTo({
      path: '/account/judging',
      query: {
        notice: 'skipped'
      }
    })
  })
}

async function markIneligible() {
  if (!assignment.value || !canMarkJudgeAssignmentIneligible(assignment.value)) {
    return
  }

  if (!ineligibleReason.value.trim()) {
    actionState.error = 'An ineligibility reason is required.'
    return
  }

  await withActionFeedback('ineligible', async () => {
    const response = await $fetch<ApiDataResponse<JudgeAssignmentDetail>>(
      `/api/hackathons/${hackathonId.value}/judging/assignments/${assignmentId.value}/actions/mark-ineligible`,
      {
        method: 'POST',
        body: {
          reason: ineligibleReason.value.trim()
        }
      }
    )

    assignment.value = response.data
    scoreDrafts.value = createCriterionScoreDrafts(criteria.value, response.data)
    actionState.success = 'The assignment is now marked ineligible.'
  })
}

useSeoMeta({
  title: () => `Review Submission | ${hackathonResponse.value!.data.name} | Codex Hackathons`,
  description: () => `Review this submission and record your scores for ${hackathonResponse.value!.data.name}.`
})
</script>

<template>
  <div class="pb-24">
    <section class="relative isolate overflow-hidden border-b border-default/80 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_24%),linear-gradient(180deg,rgba(249,251,255,0.98),rgba(241,246,252,0.96))]">
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />

      <AppContainer class="py-10 sm:py-14">
        <NuxtLink
          to="/account/judging"
          class="inline-flex items-center gap-2 rounded-full border border-default/80 bg-elevated/82 px-4 py-2 text-sm font-medium text-highlighted shadow-[0_18px_40px_-28px_rgba(17,24,39,0.35)] transition hover:border-primary/45"
        >
          <AppIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          Back to inbox
        </NuxtLink>

        <div
          v-if="workspace.status.value === 'pending'"
          class="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_20rem]"
        >
          <div class="h-48 rounded-[2rem] border border-default/80 bg-elevated/78" />
          <div class="h-48 rounded-[2rem] border border-default/80 bg-elevated/78" />
        </div>

        <AppAlert
          v-else-if="workspace.error.value"
          class="mt-8"
          color="warning"
          variant="soft"
          title="Blind review unavailable"
          :description="workspace.error.value.message"
        />

        <AppAlert
          v-else-if="!assignment || !hackathon"
          class="mt-8"
          color="warning"
          variant="soft"
          title="Judge assignment unavailable"
          description="The requested blind review could not be loaded for this session."
        />

        <div
          v-else
          class="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_20rem] xl:items-start"
        >
          <div class="space-y-5">
            <div class="flex flex-wrap items-center gap-2">
              <AppBadge
                :color="getHackathonStateColor(hackathon.state)"
                variant="soft"
                class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
              >
                {{ formatHackathonState(hackathon.state) }}
              </AppBadge>
              <span class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {{ hackathon.name }}
              </span>
            </div>

            <div class="space-y-4">
              <h1 class="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-highlighted sm:text-5xl">
                Blind review for {{ assignment.blindSubmission.projectName ?? 'untitled submission' }}
              </h1>
              <p class="max-w-3xl text-base leading-8 text-toned">
                Score the rubric against the anonymized record below. Team identity remains hidden even if this session also has admin access elsewhere.
              </p>
            </div>
          </div>

          <AppCard
            variant="subtle"
            :ui="{ root: 'rounded-[1.9rem] border border-default/80 bg-elevated/84 shadow-[0_28px_72px_-52px_rgba(17,24,39,0.42)]' }"
          >
            <div class="space-y-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Assignment status
              </p>

              <div
                data-testid="judge-assignment-status"
                class="flex flex-wrap items-center gap-2"
              >
                <JudgeAssignmentStatusBadge :status="assignment.status" />
                <AppBadge
                  data-testid="judge-assignment-ineligibility"
                  :color="resolveJudgeIneligibilityColor(assignment.ineligibilityStatus)"
                  variant="soft"
                  class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                >
                  {{ formatJudgeIneligibilityStatus(assignment.ineligibilityStatus) }}
                </AppBadge>
              </div>

              <p class="text-sm leading-7 text-toned">
                {{ describeJudgeAssignmentStatus(assignment.status) }}
              </p>
            </div>
          </AppCard>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="space-y-6 pt-10">
      <AppAlert
        v-if="actionState.success"
        color="success"
        variant="subtle"
        icon="i-lucide-badge-check"
        title="Judge action recorded"
        :description="actionState.success"
      />

      <AppAlert
        v-if="actionState.error"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Judge action failed"
        :description="actionState.error"
      />

      <div
        v-if="workspace.status.value === 'pending'"
        class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"
      >
        <div class="h-96 rounded-[2rem] border border-default/80 bg-elevated/78" />
        <div class="h-96 rounded-[2rem] border border-default/80 bg-elevated/78" />
      </div>

      <div
        v-else-if="assignment && hackathon"
        class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"
      >
        <div class="space-y-6">
          <BlindSubmissionPanel :assignment="assignment" />

          <AppAlert
            v-if="criteria.length === 0"
            color="warning"
            variant="soft"
            title="No evaluation criteria configured"
            description="This hackathon has no scoring criteria yet, so the review cannot be completed from the blind workspace."
          />

          <JudgeReviewRubric
            v-else
            v-model="scoreDrafts"
            :disabled="actionState.pendingAction === 'complete'"
            :readonly="rubricReadonly"
          />
        </div>

        <div class="space-y-6">
          <AppCard
            variant="subtle"
            :ui="{ root: 'rounded-[2rem] border border-default/80 bg-elevated/88 shadow-[0_28px_72px_-52px_rgba(17,24,39,0.42)]' }"
          >
            <div class="space-y-4">
              <div class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Timeline
                </p>
                <h2 class="text-xl font-semibold tracking-[-0.03em] text-highlighted">
                  Assignment checkpoints
                </h2>
              </div>

              <div class="grid gap-3">
                <div
                  v-for="row in timelineRows"
                  :key="row.label"
                  class="app-inset-card-tight px-4 py-3"
                >
                  <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                    {{ row.label }}
                  </p>
                  <p class="mt-2 text-sm font-medium text-highlighted">
                    {{ row.value }}
                  </p>
                </div>
              </div>
            </div>
          </AppCard>

          <AppCard
            variant="subtle"
            :ui="{ root: 'rounded-[2rem] border border-default/80 bg-elevated/88 shadow-[0_28px_72px_-52px_rgba(17,24,39,0.42)]' }"
          >
            <div class="space-y-5">
              <div class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Review controls
                </p>
                <h2 class="text-xl font-semibold tracking-[-0.03em] text-highlighted">
                  Record the next canonical outcome
                </h2>
              </div>

              <div class="space-y-3">
                <AppButton
                  v-if="canStartJudgeAssignment(assignment)"
                  data-testid="judge-start-review"
                  color="primary"
                  size="lg"
                  icon="i-lucide-play"
                  class="w-full justify-center rounded-full"
                  :loading="actionState.pendingAction === 'start'"
                  @click="startReview"
                >
                  Start review
                </AppButton>

                <AppButton
                  v-if="canCompleteJudgeAssignment(assignment)"
                  data-testid="judge-complete-review"
                  color="success"
                  size="lg"
                  icon="i-lucide-check"
                  class="w-full justify-center rounded-full"
                  :disabled="hasIncompleteScores || criteria.length === 0"
                  :loading="actionState.pendingAction === 'complete'"
                  @click="completeReview"
                >
                  Complete review
                </AppButton>

                <p
                  v-if="assignment.status === 'judge_completed'"
                  class="rounded-[1.35rem] border border-success/20 bg-success/6 px-4 py-3 text-sm leading-7 text-toned"
                >
                  This review is complete. The rubric is now read-only unless eligibility is changed below.
                </p>

                <p
                  v-if="assignment.status === 'assigned'"
                  class="rounded-[1.35rem] border border-primary/20 bg-primary/6 px-4 py-3 text-sm leading-7 text-toned"
                >
                  Start the assignment to unlock rubric editing and completion.
                </p>
              </div>

              <div
                v-if="canSkipJudgeAssignment(assignment)"
                class="space-y-3 app-inset-card p-4"
              >
                <div>
                  <p class="text-sm font-semibold text-highlighted">
                    Skip this review
                  </p>
                  <p class="mt-1 text-sm leading-7 text-toned">
                    Optional reason. The assignment leaves your queue and is redistributed to another eligible judge.
                  </p>
                </div>

                <textarea
                  v-model="skipReason"
                  rows="3"
                  data-testid="judge-skip-reason"
                  class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm leading-7 text-toned outline-none transition focus:border-primary"
                />

                <AppButton
                  data-testid="judge-skip-review"
                  color="neutral"
                  variant="outline"
                  class="w-full justify-center rounded-full"
                  :loading="actionState.pendingAction === 'skip'"
                  @click="skipReview"
                >
                  Skip review
                </AppButton>
              </div>

              <div
                v-if="canMarkJudgeAssignmentIneligible(assignment)"
                class="space-y-3 app-inset-card p-4"
              >
                <div>
                  <p class="text-sm font-semibold text-highlighted">
                    Mark assignment ineligible
                  </p>
                  <p class="mt-1 text-sm leading-7 text-toned">
                    Required reason. This does not reveal team identity, but it does change the assignment-level outcome.
                  </p>
                </div>

                <textarea
                  v-model="ineligibleReason"
                  rows="3"
                  data-testid="judge-ineligibility-reason"
                  class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm leading-7 text-toned outline-none transition focus:border-primary"
                />

                <AppButton
                  data-testid="judge-mark-ineligible"
                  color="error"
                  variant="soft"
                  class="w-full justify-center rounded-full"
                  :loading="actionState.pendingAction === 'ineligible'"
                  @click="markIneligible"
                >
                  Mark ineligible
                </AppButton>
              </div>
            </div>
          </AppCard>
        </div>
      </div>
    </AppContainer>
  </div>
</template>
