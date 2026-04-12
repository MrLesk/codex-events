<script setup lang="ts">
import type { ApiDataResponse, HackathonRecord } from '~/utils/admin-workspace'
import type { JudgeAssignmentDetail } from '~/utils/judging-workspace'

import {
  formatHackathonLocation,
  formatHackathonStateLabel,
  formatHackathonWindow,
  formatMaxTeamMembers
} from '~/composables/useHackathonPresentation'
import BlindSubmissionPanel from '~/components/judging/BlindSubmissionPanel.vue'
import JudgeAssignmentStatusBadge from '~/components/judging/JudgeAssignmentStatusBadge.vue'
import JudgeReviewRubric from '~/components/judging/JudgeReviewRubric.vue'
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
const pageHackathon = computed(() => hackathonResponse.value!.data)
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
const isWorkspaceLoading = computed(() =>
  workspace.status.value === 'pending'
  || (!workspace.error.value && (!workspace.hackathon.value || !workspace.assignment.value))
)
const judgingWorkspaceLocation = computed(() => ({
  path: `/account/hackathons/${encodeURIComponent(slug.value)}`,
  query: {
    tab: 'judging'
  }
}))
const detailSummary = computed(() => [
  formatHackathonWindow(pageHackathon.value.registrationOpensAt, pageHackathon.value.submissionClosesAt),
  formatHackathonLocation(pageHackathon.value),
  formatMaxTeamMembers(pageHackathon.value.maxTeamMembers)
].join(' • '))
const headerStateLabel = computed(() =>
  formatHackathonStateLabel(pageHackathon.value.state).toUpperCase()
)
const headerStateClass = computed(() => {
  if (pageHackathon.value.state === 'submission_open') {
    return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
  }

  if (pageHackathon.value.state === 'registration_open') {
    return 'border border-sky-600/35 bg-sky-500/16 text-sky-800 dark:border-sky-400/35 dark:bg-sky-500/14 dark:text-sky-300'
  }

  if (pageHackathon.value.state === 'winners_announced') {
    return 'bg-green-500/10 text-green-400 border border-green-500/20'
  }

  return 'bg-white/[0.05] text-[#A3A3A3] border border-white/[0.08]'
})
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

    await navigateTo(judgingWorkspaceLocation.value)
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
  <div class="relative isolate pb-16">
    <section class="relative z-10 border-b border-black/8 bg-white/42 backdrop-blur-lg dark:border-white/[0.08] dark:bg-black/48">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <NuxtLink
          :to="judgingWorkspaceLocation"
          class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-600 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
        >
          <AppIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          Back to Judging
        </NuxtLink>

        <div class="mt-3 border-b border-black/8 pb-0 dark:border-white/[0.08]">
          <div class="space-y-2 pb-4">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0 flex flex-wrap items-center gap-3">
                  <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                    {{ pageHackathon.name }}
                  </h1>
                  <span
                    class="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                    :class="headerStateClass"
                  >
                    {{ headerStateLabel }}
                  </span>
                </div>
              </div>

              <p class="text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
                {{ detailSummary }}
              </p>
            </div>

            <p class="text-[14px] text-neutral-600 dark:text-[#A3A3A3]">
              Review the assigned submission in the blind workspace. Team identity remains hidden throughout scoring.
            </p>
          </div>

          <nav
            aria-label="Judging workspace sections"
            role="tablist"
            class="account-hackathon-tab-list flex items-center gap-5 overflow-x-auto"
          >
            <NuxtLink
              id="judge-assignment-tab"
              :to="judgingWorkspaceLocation"
              role="tab"
              aria-selected="true"
              aria-controls="judge-assignment-panel"
              class="border-b-2 border-black pb-3 text-[14px] font-medium text-highlighted dark:border-white dark:text-white"
            >
              Judging
            </NuxtLink>
          </nav>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="relative z-10 max-w-[68rem] space-y-6 pt-6">
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
        v-if="isWorkspaceLoading"
        class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"
      >
        <div class="h-96 rounded-xl hackathon-workspace-detail-panel" />
        <div class="h-96 rounded-xl hackathon-workspace-detail-panel" />
      </div>

      <AppAlert
        v-else-if="workspace.error.value"
        color="warning"
        variant="soft"
        title="Blind review unavailable"
        :description="workspace.error.value.message"
      />

      <AppAlert
        v-else-if="!assignment || !hackathon"
        color="warning"
        variant="soft"
        title="Judge assignment unavailable"
        description="The requested blind review could not be loaded for this session."
      />

      <div
        v-else-if="assignment && hackathon"
        id="judge-assignment-panel"
        role="tabpanel"
        aria-labelledby="judge-assignment-tab"
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
          <AppCard class="rounded-xl hackathon-workspace-detail-panel p-6">
            <div class="space-y-4">
              <div class="space-y-2">
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

          <AppCard class="rounded-xl hackathon-workspace-detail-panel p-6">
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
                  class="w-full justify-center rounded-lg"
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
                  class="w-full justify-center rounded-lg"
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

                <AppTextarea
                  v-model="skipReason"
                  rows="3"
                  data-testid="judge-skip-reason"
                  class="leading-6"
                />

                <AppButton
                  data-testid="judge-skip-review"
                  color="neutral"
                  variant="outline"
                  class="w-full justify-center rounded-lg"
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

                <AppTextarea
                  v-model="ineligibleReason"
                  rows="3"
                  data-testid="judge-ineligibility-reason"
                  class="leading-6"
                />

                <AppButton
                  data-testid="judge-mark-ineligible"
                  color="error"
                  variant="soft"
                  class="w-full justify-center rounded-lg"
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
