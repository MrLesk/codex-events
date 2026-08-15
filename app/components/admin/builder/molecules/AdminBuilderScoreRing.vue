<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: number
  tone: 'success' | 'info' | 'warning' | 'error'
  /** Ring diameter in pixels. */
  size?: number
}>(), {
  size: 96
})

const strokeWidth = 7
const radius = computed(() => (props.size - strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() =>
  circumference.value * (1 - Math.max(0, Math.min(100, props.value)) / 100))

const strokeClass = computed(() => {
  switch (props.tone) {
    case 'success':
      return 'stroke-emerald-500'
    case 'info':
      return 'stroke-sky-500'
    case 'warning':
      return 'stroke-amber-500'
    default:
      return 'stroke-rose-500'
  }
})
</script>

<template>
  <div
    class="relative inline-flex items-center justify-center"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      class="-rotate-90"
      aria-hidden="true"
    >
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        class="stroke-black/8 dark:stroke-white/[0.08]"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :class="strokeClass"
        class="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span
        class="text-2xl font-semibold leading-none tabular-nums text-highlighted"
        data-testid="event-builder-balance-score"
      >{{ value }}</span>
      <span class="text-[10px] text-dimmed">/ 100</span>
    </div>
  </div>
</template>
