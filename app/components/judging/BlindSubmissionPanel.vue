<script setup lang="ts">
import type { BlindJudgeAssignmentDetail } from '~/domains/judging/workspace'

import JudgeSubmissionPanel from '~/components/judging/JudgeSubmissionPanel.vue'
import { getJudgeSubmissionPanelDisplay } from '~/domains/judging/workspace'

const props = defineProps<{
  assignment: BlindJudgeAssignmentDetail
}>()

const display = computed(() => getJudgeSubmissionPanelDisplay(props.assignment))
</script>

<template>
  <JudgeSubmissionPanel :display="display">
    <slot />
  </JudgeSubmissionPanel>
</template>
