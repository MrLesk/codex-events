<script setup lang="ts">
import type { CriterionScoreDraft } from '~/utils/judging-workspace'

const props = withDefaults(defineProps<{
  modelValue: CriterionScoreDraft[]
  disabled?: boolean
  readonly?: boolean
}>(), {
  disabled: false,
  readonly: false
})

const emit = defineEmits<{
  'update:modelValue': [CriterionScoreDraft[]]
}>()

function updateDraft(index: number, key: 'score' | 'comment', value: string) {
  const nextDrafts = props.modelValue.map((draft, candidateIndex) =>
    candidateIndex === index
      ? {
          ...draft,
          [key]: value
        }
      : draft
  )

  emit('update:modelValue', nextDrafts)
}
</script>

<template>
  <AppCard
    variant="subtle"
    :ui="{ root: 'rounded-[2rem] border border-default/80 bg-elevated/88 shadow-[0_28px_72px_-52px_rgba(17,24,39,0.48)]' }"
  >
    <div class="space-y-5">
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Scoring rubric
        </p>
        <h2 class="text-2xl font-semibold tracking-[-0.04em] text-highlighted">
          Score each canonical criterion
        </h2>
        <p class="text-sm leading-7 text-toned">
          Every criterion needs an integer score before the review can be completed. Comments remain optional and stay tied to the assignment.
        </p>
      </div>

      <div class="grid gap-4">
        <div
          v-for="(draft, index) in modelValue"
          :key="draft.evaluationCriterionId"
          class="app-inset-card p-5"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-semibold text-highlighted">
                  {{ draft.criterionName }}
                </h3>
                <AppBadge
                  color="neutral"
                  variant="outline"
                  class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                >
                  Weight {{ draft.criterionWeight }}
                </AppBadge>
              </div>
              <p class="max-w-2xl text-sm leading-7 text-toned">
                {{ draft.criterionDescription }}
              </p>
            </div>

            <div class="w-full app-inset-card-tight p-4 lg:max-w-[12rem]">
              <label
                :for="`judge-criterion-score-${draft.evaluationCriterionId}`"
                class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
              >
                Score
              </label>
              <input
                :id="`judge-criterion-score-${draft.evaluationCriterionId}`"
                :value="draft.score"
                type="number"
                min="0"
                step="1"
                :disabled="disabled || readonly"
                :data-testid="`judge-criterion-score-${draft.evaluationCriterionId}`"
                class="app-inset-field mt-3 w-full px-3 py-2.5 text-lg font-semibold text-highlighted disabled:opacity-70"
                @input="updateDraft(index, 'score', ($event.target as HTMLInputElement).value)"
              >
            </div>
          </div>

          <div class="mt-4 space-y-2">
            <label
              :for="`judge-criterion-comment-${draft.evaluationCriterionId}`"
              class="text-sm font-medium text-highlighted"
            >
              Comment
            </label>
            <textarea
              :id="`judge-criterion-comment-${draft.evaluationCriterionId}`"
              :value="draft.comment"
              rows="3"
              :disabled="disabled || readonly"
              class="app-inset-field w-full px-3 py-2.5 text-sm leading-6 disabled:opacity-70"
              @input="updateDraft(index, 'comment', ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
        </div>
      </div>
    </div>
  </AppCard>
</template>
