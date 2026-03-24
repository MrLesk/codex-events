<script setup lang="ts">
import type { JudgeAssignmentDetail } from '~/utils/judging-workspace'

import JudgeAssignmentStatusBadge from './JudgeAssignmentStatusBadge.vue'

import {
  describeJudgeAssignmentStatus,
  formatBlindApplicationCount,
  formatJudgeIneligibilityStatus,
  formatJudgeTimestamp,
  resolveJudgeIneligibilityColor
} from '~/utils/judging-workspace'

const props = defineProps<{
  assignment: JudgeAssignmentDetail
}>()

const assignmentHref = computed(() =>
  `/judging/${props.assignment.hackathonId}/assignments/${props.assignment.id}`
)
</script>

<template>
  <NuxtLink
    :to="assignmentHref"
    :data-testid="`judge-assignment-card-${assignment.id}`"
    class="group relative overflow-hidden rounded-[1.9rem] border border-default/80 bg-[linear-gradient(155deg,rgba(255,255,255,0.86),rgba(247,249,253,0.96)_42%,rgba(238,243,251,0.94))] p-6 shadow-[0_28px_72px_-52px_rgba(17,24,39,0.45)] transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_34px_84px_-52px_rgba(59,130,246,0.24)]"
  >
    <div class="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />

    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <JudgeAssignmentStatusBadge :status="assignment.status" />
            <AppBadge
              :color="resolveJudgeIneligibilityColor(assignment.ineligibilityStatus)"
              variant="subtle"
              class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
            >
              {{ formatJudgeIneligibilityStatus(assignment.ineligibilityStatus) }}
            </AppBadge>
          </div>

          <div class="space-y-2">
            <h3 class="text-2xl font-semibold tracking-[-0.04em] text-highlighted">
              {{ assignment.blindSubmission.projectName ?? 'Untitled blind submission' }}
            </h3>
            <p class="max-w-2xl text-sm leading-7 text-toned">
              {{ assignment.blindSubmission.summary || describeJudgeAssignmentStatus(assignment.status) }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 text-sm font-semibold text-primary transition group-hover:translate-x-1">
          <span>Open review</span>
          <AppIcon
            name="i-lucide-arrow-right"
            class="size-4"
          />
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-3">
        <div class="rounded-[1.35rem] border border-default/70 bg-white/72 px-4 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Blind context
          </p>
          <p class="mt-2 text-sm font-medium text-highlighted">
            {{ formatBlindApplicationCount(assignment.blindSubmission.applications.length) }}
          </p>
        </div>

        <div class="rounded-[1.35rem] border border-default/70 bg-white/72 px-4 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Assigned
          </p>
          <p class="mt-2 text-sm font-medium text-highlighted">
            {{ formatJudgeTimestamp(assignment.assignedAt) }}
          </p>
        </div>

        <div class="rounded-[1.35rem] border border-default/70 bg-white/72 px-4 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Review signal
          </p>
          <p class="mt-2 text-sm font-medium text-highlighted">
            {{ assignment.startedAt ? `Started ${formatJudgeTimestamp(assignment.startedAt)}` : 'Ready to start' }}
          </p>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
