<script setup lang="ts">
import type { JudgeAssignmentStatus } from '~/utils/judging-workspace'

import {
  formatJudgeAssignmentStatus,
  resolveJudgeAssignmentStatusColor
} from '~/utils/judging-workspace'

defineProps<{
  status: JudgeAssignmentStatus
}>()
</script>

<template>
  <UBadge
    :color="resolveJudgeAssignmentStatusColor(status)"
    variant="soft"
    class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
  >
    {{ formatJudgeAssignmentStatus(status) }}
  </UBadge>
</template>
