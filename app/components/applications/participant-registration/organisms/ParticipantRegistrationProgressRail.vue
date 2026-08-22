<script setup lang="ts">
import type { ParticipantRegistrationProgressSection } from '~/domains/applications/participant-registration-experience'
import ParticipantRegistrationProgressItem from '~/components/applications/participant-registration/molecules/ParticipantRegistrationProgressItem.vue'

const props = defineProps<{
  sections: ParticipantRegistrationProgressSection[]
  completedRequiredCount: number
  requiredCount: number
  progressPercent: number
  submitLabel: string
  showSubmit?: boolean
  submitting?: boolean
}>()

const emit = defineEmits<{
  navigate: [section: ParticipantRegistrationProgressSection]
}>()
</script>

<template>
  <aside
    class="sticky top-6 overflow-hidden rounded-xl border border-black/10 bg-white/90 shadow-[0_24px_54px_-42px_rgba(0,0,0,0.65)] backdrop-blur dark:border-white/10 dark:bg-[#171717]/92"
    data-testid="registration-progress-rail"
  >
    <div class="space-y-3 px-4 pb-3 pt-4">
      <div>
        <h2 class="text-[15px] font-semibold text-highlighted">
          Registration progress
        </h2>
        <p class="mt-1 text-[12px] text-muted">
          {{ props.completedRequiredCount }} of {{ props.requiredCount }} required items complete
        </p>
      </div>
      <AppMeter
        :value="props.progressPercent"
        size="sm"
        :tone="props.progressPercent === 100 ? 'success' : 'info'"
        label="Required items"
        :value-text="`${props.progressPercent}%`"
      />
    </div>

    <ol class="border-y border-black/8 px-3 dark:border-white/[0.08]">
      <ParticipantRegistrationProgressItem
        v-for="section in props.sections"
        :key="section.id"
        :section="section"
        @navigate="emit('navigate', $event)"
      />
    </ol>

    <div
      v-if="props.showSubmit"
      class="p-3"
    >
      <AppButton
        type="submit"
        color="neutral"
        variant="solid"
        :loading="props.submitting"
        :disabled="props.submitting"
        class="w-full justify-center bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
      >
        {{ props.submitLabel }}
      </AppButton>
    </div>
  </aside>
</template>
