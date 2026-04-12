<script setup lang="ts">
import type { ApiDataResponse } from '~/utils/admin-workspace'
import type { JudgeAssignmentDetail } from '~/utils/judging-workspace'

import BlindSubmissionPanel from '~/components/judging/BlindSubmissionPanel.vue'
import JudgeReviewRubric from '~/components/judging/JudgeReviewRubric.vue'
import { buildAccountHackathonJudgingTabHref } from '~/utils/judging-query'
import {
  buildCompletionCriterionScoresPayload,
  canCompleteJudgeAssignment,
  canMarkJudgeAssignmentIneligible,
  canSkipJudgeAssignment,
  canStartJudgeAssignment,
  createCriterionScoreDrafts,
  describeJudgeAssignmentStatus,
  hasIncompleteCriterionScores
} from '~/utils/judging-workspace'

const props = defineProps<{
  hackathonId: string
  hackathonSlug: string
  assignmentId: string
  nextReviewHref?: string | null
}>()

const emit = defineEmits<{
  updated: []
}>()

const normalizedHackathonId = computed(() => props.hackathonId.trim())
const normalizedAssignmentId = computed(() => props.assignmentId.trim())
const judgingWorkspaceHref = computed(() =>
  buildAccountHackathonJudgingTabHref(props.hackathonSlug)
)

const workspace = useJudgeAssignmentWorkspace(normalizedHackathonId, normalizedAssignmentId)

const hackathon = computed(() => workspace.hackathon.value)
const criteria = computed(() => workspace.criteria.value)
const assignment = ref<JudgeAssignmentDetail | null>(null)
const scoreDrafts = ref(createCriterionScoreDrafts(criteria.value, null))
const skipReason = ref('')
const ineligibleReason = ref('')
const showInlineSkipForm = ref(false)
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
  skipReason.value = ''
  ineligibleReason.value = nextAssignment.ineligibilityReason ?? ''
  showInlineSkipForm.value = false
}, {
  immediate: true
})

watch(criteria, (nextCriteria) => {
  scoreDrafts.value = createCriterionScoreDrafts(nextCriteria, assignment.value)
})

const hasIncompleteScores = computed(() => hasIncompleteCriterionScores(scoreDrafts.value))
const completedCriteriaCount = computed(() =>
  scoreDrafts.value.filter(draft => draft.score.trim().length > 0).length
)
const rubricReadonly = computed(() => !assignment.value || assignment.value.status !== 'judge_started')
const isWorkspaceLoading = computed(() =>
  workspace.status.value === 'pending'
  || (!workspace.error.value && (!workspace.hackathon.value || !workspace.assignment.value))
)

function notifyWorkspaceUpdated() {
  emit('updated')
}

function openInlineSkipForm() {
  showInlineSkipForm.value = true
}

function closeInlineSkipForm() {
  showInlineSkipForm.value = false
  skipReason.value = ''
}

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
      `/api/hackathons/${normalizedHackathonId.value}/judging/assignments/${normalizedAssignmentId.value}/actions/start`,
      {
        method: 'POST'
      }
    )

    assignment.value = response.data
    scoreDrafts.value = createCriterionScoreDrafts(criteria.value, response.data)
    showInlineSkipForm.value = false
    actionState.success = 'Review started. The scoring rubric is now unlocked.'
    notifyWorkspaceUpdated()
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
      `/api/hackathons/${normalizedHackathonId.value}/judging/assignments/${normalizedAssignmentId.value}/actions/complete`,
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
    notifyWorkspaceUpdated()
  })
}

async function skipReview() {
  if (!assignment.value || !canSkipJudgeAssignment(assignment.value)) {
    return
  }

  await withActionFeedback('skip', async () => {
    await $fetch(
      `/api/hackathons/${normalizedHackathonId.value}/judging/assignments/${normalizedAssignmentId.value}/actions/skip`,
      {
        method: 'POST',
        body: {
          reason: skipReason.value.trim() || undefined
        }
      }
    )

    notifyWorkspaceUpdated()
    await navigateTo(judgingWorkspaceHref.value)
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
      `/api/hackathons/${normalizedHackathonId.value}/judging/assignments/${normalizedAssignmentId.value}/actions/mark-ineligible`,
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
    notifyWorkspaceUpdated()
  })
}
</script>

<template>
  <div class="space-y-6">
    <NuxtLink
      :to="judgingWorkspaceHref"
      class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-600 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
    >
      <AppIcon
        name="i-lucide-arrow-left"
        class="size-4"
      />
      Back to judging queue
    </NuxtLink>

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
      class="mx-auto grid max-w-[58rem] gap-6"
    >
      <div class="h-80 rounded-xl hackathon-workspace-detail-panel" />
      <div class="h-80 rounded-xl hackathon-workspace-detail-panel" />
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
      v-else
      class="mx-auto max-w-[58rem] space-y-6"
    >
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

      <AppCard class="rounded-xl hackathon-workspace-detail-panel">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-xl font-semibold text-highlighted dark:text-white">
              Review progress
            </h2>
            <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
              The main flow stays simple: review the submission, score the criteria, then move on.
            </p>
          </div>
        </template>

        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="space-y-1">
            <p class="text-base font-semibold text-highlighted dark:text-white">
              <template v-if="assignment.status === 'assigned'">
                Start review to unlock scoring
              </template>
              <template v-else-if="assignment.status === 'judge_started' && criteria.length > 0">
                {{ completedCriteriaCount }} / {{ criteria.length }} criteria scored
              </template>
              <template v-else-if="assignment.status === 'judge_started'">
                Criteria missing for this review
              </template>
              <template v-else-if="assignment.status === 'judge_completed'">
                Review submitted
              </template>
              <template v-else>
                {{ describeJudgeAssignmentStatus(assignment.status) }}
              </template>
            </p>

            <p class="text-sm leading-7 text-toned">
              {{ describeJudgeAssignmentStatus(assignment.status) }}
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <AppButton
              v-if="canSkipJudgeAssignment(assignment)"
              data-testid="judge-show-skip-review"
              color="warning"
              variant="outline"
              size="lg"
              class="justify-center rounded-lg"
              @click="openInlineSkipForm"
            >
              Skip review
            </AppButton>

            <AppButton
              v-if="canStartJudgeAssignment(assignment)"
              data-testid="judge-start-review"
              color="primary"
              size="lg"
              icon="i-lucide-play"
              class="justify-center rounded-lg"
              :loading="actionState.pendingAction === 'start'"
              @click="startReview"
            >
              Start review
            </AppButton>

            <AppButton
              v-if="canCompleteJudgeAssignment(assignment)"
              data-testid="judge-complete-review"
              color="success"
              variant="outline"
              size="lg"
              icon="i-lucide-check"
              class="justify-center rounded-lg"
              :disabled="hasIncompleteScores || criteria.length === 0"
              :loading="actionState.pendingAction === 'complete'"
              @click="completeReview"
            >
              Complete review
            </AppButton>

            <AppButton
              v-if="assignment.status === 'judge_completed'"
              :to="judgingWorkspaceHref"
              color="neutral"
              variant="outline"
              size="lg"
              class="justify-center rounded-lg"
            >
              Back to queue
            </AppButton>

            <AppButton
              v-if="props.nextReviewHref"
              :to="props.nextReviewHref"
              color="primary"
              variant="outline"
              size="lg"
              trailing-icon="i-lucide-arrow-right"
              class="justify-center rounded-lg"
            >
              Start next review
            </AppButton>
          </div>
        </div>

        <div
          v-if="showInlineSkipForm && canSkipJudgeAssignment(assignment)"
          class="mt-4 space-y-3 app-inset-card p-4"
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

          <div class="flex flex-wrap gap-3">
            <AppButton
              data-testid="judge-skip-review"
              color="warning"
              variant="outline"
              size="lg"
              class="justify-center rounded-lg"
              :loading="actionState.pendingAction === 'skip'"
              @click="skipReview"
            >
              Confirm skip review
            </AppButton>

            <AppButton
              color="neutral"
              variant="outline"
              size="lg"
              class="justify-center rounded-lg"
              @click="closeInlineSkipForm"
            >
              Cancel
            </AppButton>
          </div>

          <div
            v-if="canMarkJudgeAssignmentIneligible(assignment)"
            class="mt-4 space-y-3 app-inset-card p-4"
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
              class="w-full justify-center rounded-lg md:w-auto"
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
</template>
