<script setup lang="ts">
import type { PitchJudgeAssignmentDetail } from '~/domains/judging/workspace'

import JudgeSubmissionPanel from '~/components/judging/JudgeSubmissionPanel.vue'
import { getJudgeSubmissionPanelDisplay } from '~/domains/judging/workspace'

const props = defineProps<{
  assignment: PitchJudgeAssignmentDetail
}>()

const display = computed(() => getJudgeSubmissionPanelDisplay(props.assignment))
</script>

<template>
  <JudgeSubmissionPanel :display="display">
    <slot />
  </JudgeSubmissionPanel>
</template>
