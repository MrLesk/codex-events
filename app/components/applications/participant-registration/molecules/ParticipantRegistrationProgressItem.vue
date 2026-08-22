<script setup lang="ts">
import type { ParticipantRegistrationProgressSection } from '~/domains/applications/participant-registration-experience'

const props = defineProps<{
  section: ParticipantRegistrationProgressSection
}>()

const emit = defineEmits<{
  navigate: [section: ParticipantRegistrationProgressSection]
}>()
</script>

<template>
  <li class="border-t border-black/8 first:border-t-0 dark:border-white/[0.08]">
    <button
      type="button"
      class="flex w-full gap-3 px-1 py-3.5 text-left transition-colors hover:text-highlighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      :data-testid="`registration-progress-${props.section.id}`"
      @click="emit('navigate', props.section)"
    >
      <span
        class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border"
        :class="{
          'border-success bg-success text-white': props.section.state === 'complete',
          'border-error bg-error/10 text-error': props.section.state === 'error',
          'border-black/25 text-muted dark:border-white/25': props.section.state === 'incomplete'
        }"
      >
        <AppIcon
          :name="props.section.state === 'complete'
            ? 'i-lucide-check'
            : props.section.state === 'error'
              ? 'i-lucide-triangle-alert'
              : 'i-lucide-circle'"
          class="size-3"
        />
      </span>

      <span class="min-w-0 flex-1">
        <span class="block text-[13px] font-medium text-highlighted">
          {{ props.section.title }}
        </span>
        <span class="mt-0.5 block text-[11px] leading-4 text-muted">
          {{ props.section.summary }}
        </span>
      </span>

      <AppIcon
        name="i-lucide-chevron-right"
        class="mt-1 size-3.5 shrink-0 text-muted"
      />
    </button>
  </li>
</template>
