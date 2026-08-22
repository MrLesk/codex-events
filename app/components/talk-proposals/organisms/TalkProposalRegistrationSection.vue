<script setup lang="ts">
import type {
  TalkProposalAnswer,
  TalkProposalQuestionDefinition
} from '#shared/domains/talk-proposals/questions'
import TalkProposalQuestionInput from '~/components/talk-proposals/molecules/TalkProposalQuestionInput.vue'

const title = defineModel<string>('title', { required: true })
const abstract = defineModel<string>('abstract', { required: true })
const demoOrSlidesUrl = defineModel<string>('demoOrSlidesUrl', { required: true })
const answers = defineModel<TalkProposalAnswer[]>('answers', { required: true })

const props = defineProps<{
  questions: TalkProposalQuestionDefinition[]
  errors: {
    title?: string
    abstract?: string
    demoOrSlidesUrl?: string
    questions: Record<string, string>
  }
  disabled?: boolean
}>()

function updateAnswer(index: number, value: string | boolean) {
  answers.value = answers.value.map((answer, currentIndex) => currentIndex === index
    ? { ...answer, value }
    : answer)
}
</script>

<template>
  <section
    id="registration-section-talk-proposal"
    tabindex="-1"
    class="space-y-4 border-t border-black/8 pt-5 dark:border-white/[0.08]"
    data-testid="combined-talk-proposal-section"
  >
    <h2 class="text-[13px] font-medium text-highlighted dark:text-white">
      Talk proposal
    </h2>

    <div data-registration-field="talkProposal.title">
      <AppFormField
        name="combined-talk-proposal-title"
        label="Title *"
      >
        <AppInput
          id="combined-talk-proposal-title"
          v-model="title"
          :disabled="props.disabled"
        />
        <p
          v-if="props.errors.title"
          class="text-[11px] text-error"
        >
          {{ props.errors.title }}
        </p>
      </AppFormField>
    </div>

    <div data-registration-field="talkProposal.abstract">
      <AppFormField
        name="combined-talk-proposal-abstract"
        label="Abstract *"
      >
        <AppTextarea
          id="combined-talk-proposal-abstract"
          v-model="abstract"
          :disabled="props.disabled"
          :rows="8"
        />
        <p
          v-if="props.errors.abstract"
          class="text-[11px] text-error"
        >
          {{ props.errors.abstract }}
        </p>
      </AppFormField>
    </div>

    <div data-registration-field="talkProposal.demoOrSlidesUrl">
      <AppFormField
        name="combined-talk-proposal-url"
        label="Demo or slides URL (optional)"
      >
        <AppInput
          id="combined-talk-proposal-url"
          v-model="demoOrSlidesUrl"
          type="url"
          :disabled="props.disabled"
        />
        <p
          v-if="props.errors.demoOrSlidesUrl"
          class="text-[11px] text-error"
        >
          {{ props.errors.demoOrSlidesUrl }}
        </p>
      </AppFormField>
    </div>

    <TalkProposalQuestionInput
      v-for="(question, index) in props.questions"
      :key="question.id"
      :question="question"
      :model-value="answers[index]?.value ?? (question.type === 'acknowledgement' ? false : '')"
      :disabled="props.disabled"
      :error="props.errors.questions[question.id]"
      registration-field-prefix="talkProposal.question"
      @update:model-value="updateAnswer(index, $event)"
    />
  </section>
</template>
