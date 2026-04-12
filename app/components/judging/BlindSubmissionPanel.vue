<script setup lang="ts">
import type { JudgeAssignmentDetail } from '~/utils/judging-workspace'

import JudgeAssignmentStatusBadge from '~/components/judging/JudgeAssignmentStatusBadge.vue'
import {
  formatBlindApplicationCount,
  formatJudgeTimestamp
} from '~/utils/judging-workspace'

defineProps<{
  assignment: JudgeAssignmentDetail
}>()
</script>

<template>
  <AppCard class="rounded-xl hackathon-workspace-detail-panel p-6">
    <div
      data-testid="judge-blind-submission"
      class="space-y-6"
    >
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <AppBadge
            color="neutral"
            variant="outline"
            class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
          >
            Blind submission
          </AppBadge>
          <JudgeAssignmentStatusBadge :status="assignment.status" />
        </div>

        <div class="space-y-2">
          <h2
            data-testid="judge-assignment-project-name"
            class="text-[28px] font-semibold tracking-[-0.03em] text-highlighted dark:text-white sm:text-[32px]"
          >
            {{ assignment.blindSubmission.projectName ?? 'Untitled blind submission' }}
          </h2>
          <p class="max-w-3xl text-[15px] leading-7 text-neutral-600 dark:text-[#A3A3A3]">
            {{ assignment.blindSubmission.summary || 'No blind summary is available for this assignment yet.' }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="app-inset-card-tight px-4 py-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Submission status
          </p>
          <p class="mt-2 text-base font-semibold text-highlighted">
            {{ assignment.blindSubmission.status }}
          </p>
        </div>

        <div class="app-inset-card-tight px-4 py-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Locked
          </p>
          <p class="mt-2 text-base font-semibold text-highlighted">
            {{ formatJudgeTimestamp(assignment.blindSubmission.lockedAt) }}
          </p>
        </div>

        <div class="app-inset-card-tight px-4 py-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Application context
          </p>
          <p class="mt-2 text-base font-semibold text-highlighted">
            {{ formatBlindApplicationCount(assignment.blindSubmission.applications.length) }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
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

      <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Anonymized application context
            </p>
            <p class="mt-2 text-sm leading-7 text-toned">
              Team identity is intentionally withheld. Use only the application timestamps below as review context.
            </p>
          </div>
        </div>

        <div class="grid gap-3">
          <div
            v-for="application in assignment.blindSubmission.applications"
            :key="application.id"
            class="app-inset-card-tight px-4 py-4"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm font-semibold text-highlighted">
                  Blind application {{ application.id.slice(-4).toUpperCase() }}
                </p>
                <p class="mt-1 text-xs uppercase tracking-[0.18em] text-muted">
                  {{ application.status }}
                </p>
              </div>

              <div class="grid gap-2 sm:text-right">
                <p class="text-sm text-toned">
                  Submitted {{ formatJudgeTimestamp(application.submittedAt) }}
                </p>
                <p class="text-sm text-toned">
                  Reviewed {{ formatJudgeTimestamp(application.reviewedAt) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppCard>
</template>
