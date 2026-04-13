<script setup lang="ts">
import type { ApiDataResponse } from '~/utils/admin-workspace'
import type { JudgeAssignmentDetail } from '~/utils/judging-workspace'

import BlindSubmissionPanel from '~/components/judging/BlindSubmissionPanel.vue'
import JudgeReviewRubric from '~/components/judging/JudgeReviewRubric.vue'
import PitchSubmissionPanel from '~/components/judging/PitchSubmissionPanel.vue'
import { buildAccountHackathonJudgingTabHref } from '~/utils/judging-query'
import {
  buildCompletionCriterionScoresPayload,
  buildPitchReviewCompletionPayload,
  canCompleteJudgeAssignment,
  canMarkJudgeAssignmentIneligible,
  canSkipJudgeAssignment,
  canStartJudgeAssignment,
  createCriterionScoreDrafts,
  createPitchScoreDraft,
  describeJudgeAssignmentStatus,
  hasIncompleteCriterionScores,
  hasIncompletePitchScore,
  isBlindJudgeAssignment,
  isPitchJudgeAssignment
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

const scoreOptions = Array.from({ length: 11 }, (_, index) => index)

const normalizedHackathonId = computed(() => props.hackathonId.trim())
const normalizedAssignmentId = computed(() => props.assignmentId.trim())
const judgingWorkspaceHref = computed(() =>
  buildAccountHackathonJudgingTabHref(props.hackathonSlug)
)

const workspace = useJudgeAssignmentWorkspace(normalizedHackathonId, normalizedAssignmentId)

const hackathon = computed(() => workspace.hackathon.value)
const criteria = computed(() => workspace.criteria.value)
const assignment = ref<JudgeAssignmentDetail | null>(null)
const blindAssignment = computed(() =>
  isBlindJudgeAssignment(assignment.value) ? assignment.value : null
)
const pitchAssignment = computed(() =>
  isPitchJudgeAssignment(assignment.value) ? assignment.value : null
)
const scoreDrafts = ref(createCriterionScoreDrafts(criteria.value, null))
const pitchDraft = ref(createPitchScoreDraft(null))
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
  pitchDraft.value = createPitchScoreDraft(nextAssignment)
  skipReason.value = ''
  ineligibleReason.value = nextAssignment.ineligibilityReason ?? ''
  showInlineSkipForm.value = false
}, {
  immediate: true
})

watch(criteria, (nextCriteria) => {
  if (!blindAssignment.value) {
    return
  }

  scoreDrafts.value = createCriterionScoreDrafts(nextCriteria, blindAssignment.value)
})

const hasIncompleteScores = computed(() => hasIncompleteCriterionScores(scoreDrafts.value))
const hasIncompletePitchVote = computed(() => hasIncompletePitchScore(pitchDraft.value))
const completedCriteriaCount = computed(() =>
  scoreDrafts.value.filter(draft => draft.score.trim().length > 0).length
)
const rubricReadonly = computed(() => !assignment.value || assignment.value.status !== 'judge_started')
const completeDisabled = computed(() => {
  if (!assignment.value || !canCompleteJudgeAssignment(assignment.value)) {
    return true
  }

  if (blindAssignment.value) {
    return hasIncompleteScores.value || criteria.value.length === 0
  }

  if (pitchAssignment.value) {
    return hasIncompletePitchVote.value
  }

  return true
})
const reviewProgressHeading = computed(() => {
  if (!assignment.value) {
    return 'Review progress'
  }

  if (assignment.value.status === 'assigned') {
    return pitchAssignment.value ? 'Start pitch review to unlock voting' : 'Start review to unlock scoring'
  }

  if (assignment.value.status === 'judge_started') {
    if (blindAssignment.value) {
      return criteria.value.length > 0
        ? `${completedCriteriaCount.value} / ${criteria.value.length} criteria scored`
        : 'Criteria missing for this review'
    }

    return pitchDraft.value.score.trim().length > 0
      ? `Score ${pitchDraft.value.score.trim()} selected`
      : 'Pitch score still required'
  }

  if (assignment.value.status === 'judge_completed') {
    return pitchAssignment.value ? 'Pitch vote submitted' : 'Review submitted'
  }

  return describeJudgeAssignmentStatus(assignment.value.status)
})
const reviewProgressDescription = computed(() =>
  blindAssignment.value
    ? 'The main flow stays simple: review the submission, score the criteria, then move on.'
    : 'The main flow stays simple: review the finalist, record one 0-10 pitch vote, then move on.'
)
const skipActionLabel = computed(() =>
  blindAssignment.value ? 'Skip blind review' : 'Skip pitch vote'
)
const skipDescription = computed(() =>
  blindAssignment.value
    ? 'Optional reason. The assignment leaves your queue and is redistributed to another eligible judge.'
    : 'Optional reason. The assignment leaves your queue. Pitch review expects every judge to vote, but only submitted votes are averaged when the stage closes.'
)
const startActionLabel = computed(() =>
  blindAssignment.value ? 'Start blind review' : 'Start pitch review'
)
const completeActionLabel = computed(() =>
  blindAssignment.value ? 'Complete blind review' : 'Submit pitch vote'
)
const nextActionLabel = computed(() =>
  blindAssignment.value ? 'Start next blind review' : 'Start next pitch vote'
)
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

function updatePitchScore(score: number) {
  if (actionState.pendingAction === 'complete' || !pitchAssignment.value || rubricReadonly.value) {
    return
  }

  pitchDraft.value = {
    ...pitchDraft.value,
    score: String(score)
  }
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
    pitchDraft.value = createPitchScoreDraft(response.data)
    showInlineSkipForm.value = false
    actionState.success = isPitchJudgeAssignment(response.data)
      ? 'Pitch review started. Record your 0-10 vote when you are ready.'
      : 'Review started. The scoring rubric is now unlocked.'
    notifyWorkspaceUpdated()
  })
}

async function completeReview() {
  if (!assignment.value || !canCompleteJudgeAssignment(assignment.value)) {
    return
  }

  if (pitchAssignment.value) {
    if (hasIncompletePitchVote.value) {
      actionState.error = 'A 0-10 pitch score is required before the vote can be submitted.'
      return
    }

    await withActionFeedback('complete', async () => {
      const response = await $fetch<ApiDataResponse<JudgeAssignmentDetail>>(
        `/api/hackathons/${normalizedHackathonId.value}/judging/assignments/${normalizedAssignmentId.value}/actions/complete`,
        {
          method: 'POST',
          body: buildPitchReviewCompletionPayload(pitchDraft.value)
        }
      )

      assignment.value = response.data
      scoreDrafts.value = createCriterionScoreDrafts(criteria.value, response.data)
      pitchDraft.value = createPitchScoreDraft(response.data)
      actionState.success = 'Pitch vote submitted. The assignment is now recorded as complete.'
      notifyWorkspaceUpdated()
    })

    return
  }

  if (criteria.value.length === 0) {
    actionState.error = 'This hackathon has no evaluation criteria configured for blind review.'
    return
  }

  if (hasIncompleteScores.value) {
    actionState.error = 'Every criterion needs an integer score between 0 and 10 before the review can be completed.'
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
    pitchDraft.value = createPitchScoreDraft(response.data)
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
    pitchDraft.value = createPitchScoreDraft(response.data)
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
      title="Judge review unavailable"
      :description="workspace.error.value.message"
    />

    <AppAlert
      v-else-if="!assignment || !hackathon"
      color="warning"
      variant="soft"
      title="Judge assignment unavailable"
      description="The requested judge assignment could not be loaded for this session."
    />

    <div
      v-else
      class="mx-auto max-w-[58rem] space-y-6"
    >
      <BlindSubmissionPanel
        v-if="blindAssignment"
        :assignment="blindAssignment"
      />

      <PitchSubmissionPanel
        v-else-if="pitchAssignment"
        :assignment="pitchAssignment"
      />

      <AppAlert
        v-if="blindAssignment && criteria.length === 0"
        color="warning"
        variant="soft"
        title="No evaluation criteria configured"
        description="This hackathon has no scoring criteria yet, so the review cannot be completed from the blind workspace."
      />

      <JudgeReviewRubric
        v-else-if="blindAssignment"
        v-model="scoreDrafts"
        :disabled="actionState.pendingAction === 'complete'"
        :readonly="rubricReadonly"
      />

      <AppCard
        v-else-if="pitchAssignment"
        class="rounded-xl hackathon-workspace-detail-panel"
      >
        <template #header>
          <div class="space-y-1">
            <h2 class="text-xl font-semibold text-highlighted dark:text-white">
              Score this pitch
            </h2>
            <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
              Record one shared-scale vote from 0 to 10. Comments stay optional.
            </p>
          </div>
        </template>

        <div class="space-y-5">
          <div class="space-y-3">
            <label class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Pitch score
            </label>

            <div
              class="grid grid-cols-11 gap-1.5"
              role="radiogroup"
              aria-label="Pitch score"
            >
              <button
                v-for="score in scoreOptions"
                :key="score"
                type="button"
                role="radio"
                :aria-checked="pitchDraft.score === String(score)"
                :disabled="actionState.pendingAction === 'complete' || rubricReadonly"
                :data-testid="`judge-pitch-score-option-${score}`"
                class="rounded-lg border px-0 py-2 text-center text-[11px] font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs"
                :class="pitchDraft.score === String(score)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-black/8 bg-black/20 text-muted hover:border-black/14 hover:bg-white/5 hover:text-highlighted dark:border-white/[0.08] dark:hover:border-white/[0.14] dark:hover:text-white'"
                @click="updatePitchScore(score)"
              >
                {{ score }}
              </button>
            </div>

            <div class="flex items-center justify-between gap-3 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted sm:text-xs">
              <span>Weak</span>
              <span>Solid</span>
              <span>Exceptional</span>
            </div>
          </div>

          <div class="space-y-2">
            <label
              for="judge-pitch-comment"
              class="text-sm font-medium text-highlighted"
            >
              Comment
            </label>

            <AppTextarea
              id="judge-pitch-comment"
              v-model="pitchDraft.comment"
              rows="3"
              placeholder="Optional note for this pitch vote."
              :disabled="actionState.pendingAction === 'complete' || rubricReadonly"
              class="leading-6"
            />
          </div>
        </div>
      </AppCard>

      <AppCard class="rounded-xl hackathon-workspace-detail-panel">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-xl font-semibold text-highlighted dark:text-white">
              Review progress
            </h2>
            <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
              {{ reviewProgressDescription }}
            </p>
          </div>
        </template>

        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="space-y-1">
            <p class="text-base font-semibold text-highlighted dark:text-white">
              {{ reviewProgressHeading }}
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
              {{ skipActionLabel }}
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
              {{ startActionLabel }}
            </AppButton>

            <AppButton
              v-if="canCompleteJudgeAssignment(assignment)"
              data-testid="judge-complete-review"
              color="success"
              variant="outline"
              size="lg"
              icon="i-lucide-check"
              class="justify-center rounded-lg"
              :disabled="completeDisabled"
              :loading="actionState.pendingAction === 'complete'"
              @click="completeReview"
            >
              {{ completeActionLabel }}
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
              {{ nextActionLabel }}
            </AppButton>
          </div>
        </div>

        <div
          v-if="showInlineSkipForm && canSkipJudgeAssignment(assignment)"
          class="mt-4 space-y-3 app-inset-card p-4"
        >
          <div>
            <p class="text-sm font-semibold text-highlighted">
              {{ skipActionLabel }}
            </p>
            <p class="mt-1 text-sm leading-7 text-toned">
              {{ skipDescription }}
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
              Confirm {{ skipActionLabel.toLowerCase() }}
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
                Required reason. This keeps blind review anonymous while changing the assignment-level outcome.
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
