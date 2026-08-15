<script setup lang="ts">
import type { EventType } from '~/domains/events/records'

const props = defineProps<{
  /** null = nothing chosen yet — no pill renders as selected. */
  modelValue: EventType | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  select: [eventType: EventType]
}>()

const options: Array<{ value: EventType, label: string, blurb: string, icon: string }> = [
  { value: 'hackathon', label: 'Hackathon', blurb: 'Teams, submissions, judging, prizes.', icon: 'i-lucide-trophy' },
  { value: 'build', label: 'Build', blurb: 'Registration-only build event.', icon: 'i-lucide-hammer' },
  { value: 'meetup', label: 'Meetup', blurb: 'Registration-only community event.', icon: 'i-lucide-users' }
]
</script>

<template>
  <div
    id="event-builder-event-type"
    role="radiogroup"
    aria-label="Event type"
    data-testid="event-builder-event-type"
    tabindex="-1"
    class="inline-grid w-full grid-cols-3 gap-1 rounded-xl border border-black/8 bg-white/78 p-1 sm:w-auto sm:min-w-[26rem] dark:border-white/[0.08] dark:bg-white/[0.03]"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="props.modelValue === option.value"
      :disabled="disabled"
      :data-testid="`event-builder-event-type-${option.value}`"
      :title="option.blurb"
      class="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      :class="props.modelValue === option.value
        ? 'bg-primary text-primary-foreground shadow-[0_8px_20px_-14px_rgba(15,23,42,0.6)]'
        : 'text-muted hover:bg-black/4 hover:text-highlighted dark:hover:bg-white/[0.05]'"
      @click="emit('select', option.value)"
    >
      <AppIcon
        :name="option.icon"
        class="size-4 shrink-0"
      />
      {{ option.label }}
    </button>
  </div>
</template>
