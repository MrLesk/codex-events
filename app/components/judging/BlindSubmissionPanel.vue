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
  <UCard
    variant="subtle"
    :ui="{ root: 'rounded-[2rem] border border-default/80 bg-elevated/88 shadow-[0_28px_72px_-52px_rgba(17,24,39,0.48)]' }"
  >
    <div
      data-testid="judge-blind-submission"
      class="space-y-6"
    >
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            color="neutral"
            variant="outline"
            class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
          >
            Blind submission
          </UBadge>
          <JudgeAssignmentStatusBadge :status="assignment.status" />
        </div>

        <div class="space-y-2">
          <h1
            data-testid="judge-assignment-project-name"
            class="text-3xl font-semibold tracking-[-0.05em] text-highlighted sm:text-4xl"
          >
            {{ assignment.blindSubmission.projectName ?? 'Untitled blind submission' }}
          </h1>
          <p class="max-w-3xl text-sm leading-8 text-toned sm:text-base">
            {{ assignment.blindSubmission.summary || 'No blind summary is available for this assignment yet.' }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-[1.45rem] border border-default/70 bg-default/70 px-4 py-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Submission status
          </p>
          <p class="mt-2 text-base font-semibold text-highlighted">
            {{ assignment.blindSubmission.status }}
          </p>
        </div>

        <div class="rounded-[1.45rem] border border-default/70 bg-default/70 px-4 py-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Locked
          </p>
          <p class="mt-2 text-base font-semibold text-highlighted">
            {{ formatJudgeTimestamp(assignment.blindSubmission.lockedAt) }}
          </p>
        </div>

        <div class="rounded-[1.45rem] border border-default/70 bg-default/70 px-4 py-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Application context
          </p>
          <p class="mt-2 text-base font-semibold text-highlighted">
            {{ formatBlindApplicationCount(assignment.blindSubmission.applications.length) }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <UButton
          v-if="assignment.blindSubmission.repositoryUrl"
          :to="assignment.blindSubmission.repositoryUrl"
          target="_blank"
          rel="noreferrer"
          color="primary"
          variant="soft"
          icon="i-lucide-github"
          class="rounded-full"
        >
          Repository
        </UButton>

        <UButton
          v-if="assignment.blindSubmission.demoUrl"
          :to="assignment.blindSubmission.demoUrl"
          target="_blank"
          rel="noreferrer"
          color="neutral"
          variant="outline"
          icon="i-lucide-monitor-play"
          class="rounded-full"
        >
          Demo
        </UButton>
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
            class="rounded-[1.35rem] border border-default/70 bg-default/60 px-4 py-4"
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
  </UCard>
</template>
