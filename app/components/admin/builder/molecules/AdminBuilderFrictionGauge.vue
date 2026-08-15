<script setup lang="ts">
const props = defineProps<{
  requiredCount: number
  visibleCount: number
}>()

const tone = computed(() => {
  if (props.requiredCount > 6) {
    return 'error' as const
  }

  return props.requiredCount > 3 ? 'warning' as const : 'success' as const
})

const stateLabel = computed(() => {
  if (props.requiredCount > 6) {
    return 'Heavy: every extra required field costs sign-ups.'
  }

  return props.requiredCount > 3
    ? 'Moderate: keep only what you will actually read.'
    : 'Lean: easy to apply.'
})
</script>

<template>
  <div class="space-y-1.5">
    <AppMeter
      label="Application friction"
      :value="requiredCount"
      :max="10"
      :tone="tone"
      size="sm"
      :value-text="`${requiredCount} required · ${visibleCount} visible`"
    />
    <p class="text-[11px] text-dimmed">
      {{ stateLabel }}
    </p>
  </div>
</template>
