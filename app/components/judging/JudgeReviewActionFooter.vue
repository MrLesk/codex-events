<script setup lang="ts">
import type { JudgeAssignmentDetail } from '~/domains/judging/workspace'

import {
  canCompleteJudgeAssignment,
  canMarkJudgeAssignmentIneligible,
  canSkipJudgeAssignment,
  describeJudgeAssignmentStatus
} from '~/domains/judging/workspace'

defineProps<{
  assignment: JudgeAssignmentDetail
  reviewProgressHeading: string
  reviewActionDisabledReason: string | null
  actionSuccess: string
  actionError: string
  pendingAction: '' | 'start' | 'save' | 'complete' | 'skip' | 'ineligible'
  skipReviewDisabled: boolean
  completeDisabled: boolean
  showInlineSkipForm: boolean
  skipActionLabel: string
  skipDescription: string
  completeActionLabel: string
  nextActionLabel: string
  judgingWorkspaceHref: string
  nextReviewHref?: string | null
}>()

const emit = defineEmits<{
  openSkipForm: []
  closeSkipForm: []
  completeReview: []
  skipReview: []
  markIneligible: []
}>()

const skipReason = defineModel<string>('skipReason', { required: true })
const ineligibleReason = defineModel<string>('ineligibleReason', { required: true })
</script>

<template>
  <div class="space-y-4 border-t border-black/8 pt-6 dark:border-white/[0.08]">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="space-y-1">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          Review progress
        </p>
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
          :disabled="skipReviewDisabled"
          @click="emit('openSkipForm')"
        >
          {{ skipActionLabel }}
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
          :loading="pendingAction === 'complete'"
          @click="emit('completeReview')"
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
          v-if="nextReviewHref"
          :to="nextReviewHref"
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

    <AppAlert
      v-if="reviewActionDisabledReason"
      color="warning"
      variant="soft"
      icon="i-lucide-lock"
      title="Blind review not active"
      :description="reviewActionDisabledReason"
    />

    <AppAlert
      v-if="actionSuccess"
      color="success"
      variant="subtle"
      icon="i-lucide-badge-check"
      title="Judge action recorded"
      :description="actionSuccess"
    />

    <AppAlert
      v-if="actionError"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Judge action failed"
      :description="actionError"
    />

    <div
      v-if="showInlineSkipForm && canSkipJudgeAssignment(assignment) && !skipReviewDisabled"
      class="space-y-3 rounded-xl border border-black/8 bg-white/78 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] backdrop-blur-xl dark:border-white/[0.10] dark:bg-[#151515]/64 p-4"
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
          :loading="pendingAction === 'skip'"
          @click="emit('skipReview')"
        >
          Confirm {{ skipActionLabel.toLowerCase() }}
        </AppButton>

        <AppButton
          color="neutral"
          variant="outline"
          size="lg"
          class="justify-center rounded-lg"
          @click="emit('closeSkipForm')"
        >
          Cancel
        </AppButton>
      </div>

      <div
        v-if="canMarkJudgeAssignmentIneligible(assignment)"
        class="mt-4 space-y-3 rounded-xl border border-black/8 bg-white/78 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] backdrop-blur-xl dark:border-white/[0.10] dark:bg-[#151515]/64 p-4"
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
          :loading="pendingAction === 'ineligible'"
          @click="emit('markIneligible')"
        >
          Mark ineligible
        </AppButton>
      </div>
    </div>
  </div>
</template>
