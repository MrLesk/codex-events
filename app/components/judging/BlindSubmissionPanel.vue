<script setup lang="ts">
import type { BlindJudgeAssignmentDetail } from '~/utils/judging-workspace'

import JudgeAssignmentStatusBadge from '~/components/judging/JudgeAssignmentStatusBadge.vue'
import {
  formatJudgeIneligibilityStatus,
  resolveJudgeIneligibilityColor
} from '~/utils/judging-workspace'

defineProps<{
  assignment: BlindJudgeAssignmentDetail
}>()
</script>

<template>
  <AppCard class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
    <template #header>
      <div class="space-y-3">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Blind review assignment
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <h2
              data-testid="judge-assignment-project-name"
              class="text-xl font-semibold text-highlighted dark:text-white"
            >
              {{ assignment.blindSubmission.projectName ?? 'Untitled submission' }}
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
        </div>
      </div>
    </template>

    <div
      data-testid="judge-blind-submission"
      class="space-y-6"
    >
      <div
        class="grid gap-6"
        :class="assignment.blindSubmission.track ? 'lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start' : ''"
      >
        <div class="min-w-0 space-y-2">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Submission description
          </p>
          <p class="text-sm leading-7 text-toned">
            {{ assignment.blindSubmission.summary || 'No project summary is available for this submission yet.' }}
          </p>
        </div>

        <div
          v-if="assignment.blindSubmission.track"
          class="rounded-xl border border-black/8 bg-[#F7F7F8] px-4 py-3 dark:border-white/[0.08] dark:bg-[#171717]"
        >
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Track
          </p>
          <p class="mt-1 text-[15px] font-semibold text-highlighted dark:text-white">
            {{ assignment.blindSubmission.track.name }}
          </p>
          <p class="mt-1 text-sm text-toned">
            {{ assignment.blindSubmission.track.description }}
          </p>
        </div>
      </div>

      <div
        v-if="assignment.blindSubmission.repositoryUrl || assignment.blindSubmission.demoUrl"
        class="flex flex-wrap gap-3"
      >
        <AppButton
          v-if="assignment.blindSubmission.repositoryUrl"
          :to="assignment.blindSubmission.repositoryUrl"
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
          v-if="assignment.blindSubmission.demoUrl"
          :to="assignment.blindSubmission.demoUrl"
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

      <div
        v-if="$slots.default"
        class="space-y-5 border-t border-black/8 pt-6 dark:border-white/[0.08]"
      >
        <slot />
      </div>
    </div>
  </AppCard>
</template>
