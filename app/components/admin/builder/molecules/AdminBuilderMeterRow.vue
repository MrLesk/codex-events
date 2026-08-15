<script setup lang="ts">
const props = withDefaults(defineProps<{
  icon: string
  label: string
  value: number
  tone: 'neutral' | 'success' | 'warning' | 'error' | 'info'
  valueText?: string
  /** Overrides the derived one-word verdict. */
  verdict?: string
  /** Hover explanation: what the meter measures and why it matters. */
  description?: string
}>(), {
  valueText: undefined,
  verdict: undefined,
  description: undefined
})

const verdictLabel = computed(() => {
  if (props.verdict) {
    return props.verdict
  }

  if (props.value >= 80) {
    return 'Great'
  }

  if (props.value >= 60) {
    return 'Good'
  }

  return props.value >= 40 ? 'Fair' : 'Low'
})

const verdictClass = computed(() => {
  switch (props.tone) {
    case 'success':
      return 'text-emerald-500'
    case 'info':
      return 'text-sky-500'
    case 'warning':
      return 'text-amber-500'
    case 'error':
      return 'text-rose-500'
    default:
      return 'text-muted'
  }
})
</script>

<template>
  <AppTooltip
    :text="description"
    side="left"
  >
    <div
      class="flex items-center gap-2.5"
      :class="description ? 'cursor-help' : ''"
    >
      <span class="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-black/5 text-toned dark:bg-white/[0.06]">
        <AppIcon
          :name="icon"
          class="size-3.5"
        />
      </span>
      <div class="min-w-0 flex-1 space-y-1">
        <div class="flex items-baseline justify-between gap-2">
          <span class="truncate text-xs font-medium text-toned">{{ label }}</span>
          <span class="shrink-0 text-[11px] tabular-nums text-dimmed">
            {{ valueText || `${value} / 100` }}
            <span
              class="ml-1 font-medium"
              :class="verdictClass"
            >{{ verdictLabel }}</span>
          </span>
        </div>
        <AppMeter
          :value="value"
          :tone="tone"
          size="sm"
        />
      </div>
    </div>
  </AppTooltip>
</template>
