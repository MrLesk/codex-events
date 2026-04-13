<script setup lang="ts">
import type { PitchJudgeAssignmentDetail } from '~/utils/judging-workspace'

import JudgeAssignmentStatusBadge from '~/components/judging/JudgeAssignmentStatusBadge.vue'
import {
  formatJudgeIneligibilityStatus,
  resolveJudgeIneligibilityColor
} from '~/utils/judging-workspace'

defineProps<{
  assignment: PitchJudgeAssignmentDetail
}>()
</script>

<template>
  <AppCard class="rounded-xl hackathon-workspace-detail-panel">
    <template #header>
      <div class="space-y-3">
        <div class="space-y-2">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Pitch review finalist
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <h2
              data-testid="judge-assignment-project-name"
              class="text-xl font-semibold text-highlighted dark:text-white"
            >
              {{ assignment.pitchSubmission.projectName ?? 'Untitled pitch finalist' }}
            </h2>

            <div
              data-testid="judge-assignment-status"
              class="flex items-center"
            >
              <JudgeAssignmentStatusBadge :status="assignment.status" />
            </div>

            <AppBadge
              data-testid="judge-assignment-ineligibility"
              :color="resolveJudgeIneligibilityColor(assignment.ineligibilityStatus)"
              variant="soft"
              class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
            >
              {{ formatJudgeIneligibilityStatus(assignment.ineligibilityStatus) }}
            </AppBadge>
          </div>
          <p class="text-sm font-medium text-neutral-700 dark:text-[#D0D0D0]">
            {{ assignment.pitchSubmission.teamName }}
          </p>
          <p class="max-w-3xl text-sm leading-7 text-toned">
            Pitch review is open. Every judge on the panel is expected to submit one 0-10 vote, with an optional comment if you want to capture extra signal.
          </p>
        </div>
      </div>
    </template>

    <div
      data-testid="judge-pitch-submission"
      class="space-y-6"
    >
      <p class="text-sm leading-7 text-toned">
        {{ assignment.pitchSubmission.summary || 'No project summary is available for this finalist yet.' }}
      </p>

      <div
        v-if="assignment.pitchSubmission.track"
        class="rounded-xl border border-black/8 bg-[#F7F7F8] px-4 py-3 dark:border-white/[0.08] dark:bg-[#171717]"
      >
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Track
        </p>
        <p class="mt-1 text-[15px] font-semibold text-highlighted dark:text-white">
          {{ assignment.pitchSubmission.track.name }}
        </p>
        <p class="mt-1 text-sm text-toned">
          {{ assignment.pitchSubmission.track.description }}
        </p>
      </div>

      <div
        v-if="assignment.pitchSubmission.repositoryUrl || assignment.pitchSubmission.demoUrl"
        class="flex flex-wrap gap-3"
      >
        <AppButton
          v-if="assignment.pitchSubmission.repositoryUrl"
          :to="assignment.pitchSubmission.repositoryUrl"
          target="_blank"
          rel="noreferrer"
          color="primary"
          variant="soft"
          icon="i-lucide-github"
          trailing-icon="i-lucide-external-link"
          class="rounded-lg"
        >
          Repository
        </AppButton>

        <AppButton
          v-if="assignment.pitchSubmission.demoUrl"
          :to="assignment.pitchSubmission.demoUrl"
          target="_blank"
          rel="noreferrer"
          color="neutral"
          variant="outline"
          icon="i-lucide-monitor-play"
          trailing-icon="i-lucide-external-link"
          class="rounded-lg"
        >
          Demo
        </AppButton>
      </div>
    </div>
  </AppCard>
</template>
