<script setup lang="ts">
import type { JudgeAssignmentDetail } from '~/utils/judging-workspace'

import JudgeAssignmentStatusBadge from './JudgeAssignmentStatusBadge.vue'

import { buildAccountHackathonJudgingTabHref } from '~/utils/judging-query'
import {
  describeJudgeAssignmentStatus,
  formatBlindApplicationCount,
  formatJudgeIneligibilityStatus,
  formatJudgeTimestamp,
  resolveJudgeIneligibilityColor
} from '~/utils/judging-workspace'

const props = defineProps<{
  assignment: JudgeAssignmentDetail
  hackathonSlug: string
}>()

const assignmentHref = computed(() =>
  buildAccountHackathonJudgingTabHref(props.hackathonSlug, props.assignment.id)
)
</script>

<template>
  <NuxtLink
    :to="assignmentHref"
    :data-testid="`judge-assignment-card-${assignment.id}`"
    class="hackathon-workspace-panel group rounded-xl p-5 transition-colors hover:border-black/20 dark:hover:border-white/[0.2]"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <JudgeAssignmentStatusBadge :status="assignment.status" />
            <AppBadge
              :color="resolveJudgeIneligibilityColor(assignment.ineligibilityStatus)"
              variant="subtle"
              class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            >
              {{ formatJudgeIneligibilityStatus(assignment.ineligibilityStatus) }}
            </AppBadge>
          </div>

          <div class="space-y-2">
            <h3 class="text-[20px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              {{ assignment.blindSubmission.projectName ?? 'Untitled blind submission' }}
            </h3>
            <p class="max-w-2xl text-[14px] text-neutral-600 dark:text-[#B0B0B0]">
              {{ assignment.blindSubmission.summary || describeJudgeAssignmentStatus(assignment.status) }}
            </p>
          </div>
        </div>

        <div class="inline-flex items-center gap-1 text-[13px] font-medium text-highlighted dark:text-white">
          <span>Open review</span>
          <AppIcon
            name="i-lucide-arrow-right"
            class="size-3.5"
          />
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-3">
        <div class="rounded-lg border border-black/8 bg-[#F7F7F8] px-3 py-2 dark:border-white/[0.08] dark:bg-[#171717]">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Blind context
          </p>
          <p class="mt-1 text-[13px] font-medium text-highlighted dark:text-white">
            {{ formatBlindApplicationCount(assignment.blindSubmission.applications.length) }}
          </p>
        </div>

        <div class="rounded-lg border border-black/8 bg-[#F7F7F8] px-3 py-2 dark:border-white/[0.08] dark:bg-[#171717]">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Assigned
          </p>
          <p class="mt-1 text-[13px] font-medium text-highlighted dark:text-white">
            {{ formatJudgeTimestamp(assignment.assignedAt) }}
          </p>
        </div>

        <div class="rounded-lg border border-black/8 bg-[#F7F7F8] px-3 py-2 dark:border-white/[0.08] dark:bg-[#171717]">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Review signal
          </p>
          <p class="mt-1 text-[13px] font-medium text-highlighted dark:text-white">
            {{ assignment.startedAt ? `Started ${formatJudgeTimestamp(assignment.startedAt)}` : 'Ready to start' }}
          </p>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
