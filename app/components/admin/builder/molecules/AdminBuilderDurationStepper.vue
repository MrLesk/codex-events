<script setup lang="ts">
import {
  eventBuilderMaxBlockDurationMinutes,
  eventBuilderMinBlockDurationMinutes,
  getNextEventBuilderDurationMinutes,
  parseEventBuilderDurationMinutes
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
  const parsed = parseEventBuilderDurationMinutes(raw)

  if (parsed === null) {
    return
  }

  model.value = parsed
}

function restoreManualDuration(event: FocusEvent) {
  if (event.currentTarget instanceof HTMLInputElement) {
    event.currentTarget.value = String(model.value)
  }
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
    class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-black/8 bg-white p-1 transition focus-within:border-black/25 dark:border-white/[0.08] dark:bg-[#151515] dark:focus-within:border-white/[0.25]"
    role="group"
    aria-label="Block duration"
  >
    <button
      type="button"
      :aria-label="`Shorten by ${model - decreaseValue} ${model - decreaseValue === 1 ? 'minute' : 'minutes'}`"
      :data-testid="`event-builder-duration-down-${props.blockId}`"
      :disabled="model <= eventBuilderMinBlockDurationMinutes"
      class="inline-flex size-7 items-center justify-center rounded-md text-toned transition hover:bg-black/5 hover:text-highlighted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black/30 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/[0.06] dark:focus-visible:outline-white/40"
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
        @blur="restoreManualDuration"
      >
      <span aria-hidden="true">m</span>
    </label>
    <button
      type="button"
      :aria-label="`Extend by ${increaseValue - model} ${increaseValue - model === 1 ? 'minute' : 'minutes'}`"
      :data-testid="`event-builder-duration-up-${props.blockId}`"
      :disabled="model >= eventBuilderMaxBlockDurationMinutes"
      class="inline-flex size-7 items-center justify-center rounded-md text-toned transition hover:bg-black/5 hover:text-highlighted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black/30 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/[0.06] dark:focus-visible:outline-white/40"
      @click="step(1)"
    >
      <AppIcon
        name="i-lucide-plus"
        class="size-3.5"
      />
    </button>
  </div>
</template>
