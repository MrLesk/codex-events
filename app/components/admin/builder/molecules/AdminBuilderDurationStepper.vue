<script setup lang="ts">
import {
  eventBuilderDurationStepMinutes,
  eventBuilderMaxBlockDurationMinutes,
  eventBuilderMinBlockDurationMinutes
} from '~/domains/events/builder'

const props = defineProps<{
  blockId: string
}>()

const model = defineModel<number>({ required: true })

function step(direction: -1 | 1) {
  const next = model.value + direction * eventBuilderDurationStepMinutes

  model.value = Math.min(
    eventBuilderMaxBlockDurationMinutes,
    Math.max(eventBuilderMinBlockDurationMinutes, next)
  )
}

const formatted = computed(() => {
  const hours = Math.floor(model.value / 60)
  const minutes = model.value % 60

  if (hours === 0) {
    return `${minutes}m`
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
})
</script>

<template>
  <div
    class="inline-flex items-center gap-1 rounded-lg border border-black/8 bg-white p-1 dark:border-white/[0.08] dark:bg-[#151515]"
    role="group"
    aria-label="Block duration"
  >
    <button
      type="button"
      :aria-label="`Shorten by ${eventBuilderDurationStepMinutes} minutes`"
      :data-testid="`event-builder-duration-down-${props.blockId}`"
      :disabled="model <= eventBuilderMinBlockDurationMinutes"
      class="inline-flex size-7 items-center justify-center rounded-md text-toned transition hover:bg-black/5 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/[0.06]"
      @click="step(-1)"
    >
      <AppIcon
        name="i-lucide-minus"
        class="size-3.5"
      />
    </button>
    <span class="min-w-11 text-center text-xs font-medium tabular-nums text-highlighted">
      {{ formatted }}
    </span>
    <button
      type="button"
      :aria-label="`Extend by ${eventBuilderDurationStepMinutes} minutes`"
      :data-testid="`event-builder-duration-up-${props.blockId}`"
      :disabled="model >= eventBuilderMaxBlockDurationMinutes"
      class="inline-flex size-7 items-center justify-center rounded-md text-toned transition hover:bg-black/5 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/[0.06]"
      @click="step(1)"
    >
      <AppIcon
        name="i-lucide-plus"
        class="size-3.5"
      />
    </button>
  </div>
</template>
