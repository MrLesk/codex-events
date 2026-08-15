<script setup lang="ts">
// One slider controls both judging weights: blind + pitch always sum to 100,
// so the classic invariant cannot be violated from the builder.
const blind = defineModel<number>('blind', { required: true })
const pitch = defineModel<number>('pitch', { required: true })

function onInput(event: Event) {
  const value = Number.parseInt((event.target as HTMLInputElement).value, 10)

  blind.value = value
  pitch.value = 100 - value
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between text-xs font-medium tabular-nums text-toned">
      <span>Blind {{ blind }}%</span>
      <span>Pitch {{ pitch }}%</span>
    </div>
    <input
      type="range"
      :value="blind"
      min="0"
      max="100"
      step="5"
      aria-label="Blind versus pitch score weight"
      data-testid="event-builder-judging-weight"
      class="h-2 w-full cursor-pointer appearance-none rounded-full bg-black/8 accent-black dark:bg-white/[0.1] dark:accent-white"
      @input="onInput"
    >
    <div class="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-dimmed">
      <span>Submissions decide</span>
      <span>The stage decides</span>
    </div>
  </div>
</template>
