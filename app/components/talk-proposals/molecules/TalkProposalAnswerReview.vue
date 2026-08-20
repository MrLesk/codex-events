<script setup lang="ts">
import type {
  TalkProposalAnswer,
  TalkProposalQuestionDefinition
} from '#shared/domains/talk-proposals/questions'

const props = defineProps<{
  question: TalkProposalQuestionDefinition
  answer?: TalkProposalAnswer
}>()

const displayValue = computed(() => {
  if (props.question.type === 'acknowledgement') {
    return props.answer?.value === true ? 'Confirmed' : 'Not confirmed'
  }
  return typeof props.answer?.value === 'string' && props.answer.value.length > 0
    ? props.answer.value
    : 'No answer'
})
</script>

<template>
  <div class="space-y-1.5">
    <h4 class="text-sm font-medium text-highlighted">
      {{ question.prompt }}
      <span
        v-if="question.required"
        class="text-error"
        aria-label="Required"
      >*</span>
    </h4>
    <p class="whitespace-pre-wrap text-sm leading-6 text-toned">
      {{ displayValue }}
    </p>
  </div>
</template>
