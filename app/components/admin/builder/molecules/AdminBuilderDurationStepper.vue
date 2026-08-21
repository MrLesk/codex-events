<script setup lang="ts">
import {
  eventBuilderMaxBlockDurationMinutes,
  eventBuilderMinBlockDurationMinutes,
  getNextEventBuilderDurationMinutes
} from '~/domains/events/builder'

const props = defineProps<{
  blockId: string
}>()

const model = defineModel<number>({ required: true })

const decreaseValue = computed(() => getNextEventBuilderDurationMinutes(model.value, -1))
const increaseValue = computed(() => getNextEventBuilderDurationMinutes(model.value, 1))

function step(direction: -1 | 1) {
  model.value = direction === -1 ? decreaseValue.value : increaseValue.value
}

function setManualDuration(raw: string) {
  const parsed = Number(raw)

  if (!Number.isFinite(parsed)) {
    return
  }

  model.value = Math.min(
    eventBuilderMaxBlockDurationMinutes,
    Math.max(eventBuilderMinBlockDurationMinutes, Math.round(parsed))
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
      :aria-label="`Shorten by ${model - decreaseValue} ${model - decreaseValue === 1 ? 'minute' : 'minutes'}`"
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
    <label class="inline-flex min-w-11 items-center justify-center text-xs font-medium tabular-nums text-highlighted">
      <span class="sr-only">Duration in minutes</span>
      <input
        type="number"
        inputmode="numeric"
        :min="eventBuilderMinBlockDurationMinutes"
        :max="eventBuilderMaxBlockDurationMinutes"
        step="1"
        :value="model"
        :aria-label="`Duration for block in minutes, currently ${formatted}`"
        :data-testid="`event-builder-duration-input-${props.blockId}`"
        class="w-8 bg-transparent text-right text-xs font-medium tabular-nums text-highlighted outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        @input="event => setManualDuration((event.target as HTMLInputElement).value)"
      >
      <span aria-hidden="true">m</span>
    </label>
    <button
      type="button"
      :aria-label="`Extend by ${increaseValue - model} ${increaseValue - model === 1 ? 'minute' : 'minutes'}`"
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
