<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** Values on a 0–100 scale; callers convert (e.g. focus spend as % of budget). */
  values: readonly number[]
  labels?: readonly string[]
  /** Accessible description of the whole chart. */
  label: string
  heightClass?: string
  tone?: 'energy' | 'focus'
  /** Draw a dashed guide line at this 0–100 level. */
  threshold?: number | null
  /** 'line' draws a curve with dots; 'bars' draws one bar per value. */
  variant?: 'line' | 'bars'
}>(), {
  labels: () => [],
  heightClass: 'h-10',
  tone: 'energy',
  threshold: null,
  variant: 'line'
})

// Internal drawing coordinates; the SVG stretches to the container.
const chartWidth = 100
const chartHeight = 40

const points = computed(() => props.values.map((value, index) => {
  const clamped = Math.max(0, Math.min(100, value))

  return {
    x: props.values.length === 1
      ? chartWidth / 2
      : (index / (props.values.length - 1)) * chartWidth,
    y: chartHeight - (clamped / 100) * chartHeight,
    value: Math.round(value)
  }
}))

const linePath = computed(() =>
  points.value.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
)

const areaPath = computed(() => {
  if (points.value.length < 2) {
    return ''
  }

  const first = points.value[0]!
  const last = points.value[points.value.length - 1]!

  return `${linePath.value} L${last.x},${chartHeight} L${first.x},${chartHeight} Z`
})

const thresholdY = computed(() => props.threshold === null
  ? null
  : chartHeight - (Math.max(0, Math.min(100, props.threshold)) / 100) * chartHeight)

// The stroke is a gradient with one stop per point, so the line itself shifts
// through the same severity colors as the dots instead of staying one tone.
const gradientId = useId()

function pointHex(value: number) {
  if (props.tone === 'focus') {
    if (value <= 0) {
      return '#f43f5e'
    }

    return value <= 15 ? '#f59e0b' : '#0ea5e9'
  }

  if (value >= 60) {
    return '#10b981'
  }

  return value >= 35 ? '#f59e0b' : '#f43f5e'
}

const gradientStops = computed(() => points.value.map(point => ({
  offset: point.x / chartWidth,
  color: pointHex(point.value)
})))

function dotColor(value: number) {
  // Focus plots the remaining budget, so low is the danger zone.
  if (props.tone === 'focus') {
    if (value <= 0) {
      return 'bg-rose-500'
    }

    return value <= 15 ? 'bg-amber-500' : 'bg-sky-500'
  }

  if (value >= 60) {
    return 'bg-emerald-500'
  }

  return value >= 35 ? 'bg-amber-500' : 'bg-rose-500'
}

function barColor(value: number) {
  if (props.tone === 'focus') {
    if (value <= 0) {
      return 'bg-rose-500/70'
    }

    return value <= 15 ? 'bg-amber-500/70' : 'bg-sky-500/70'
  }

  if (value >= 60) {
    return 'bg-emerald-500/70'
  }

  return value >= 35 ? 'bg-amber-500/70' : 'bg-rose-500/70'
}

// Hover identification: instant, names the block behind the point or bar.
const hoveredIndex = ref<number | null>(null)

const hoveredLabel = computed(() => {
  if (hoveredIndex.value === null) {
    return ''
  }

  const name = props.labels[hoveredIndex.value] ?? `Block ${hoveredIndex.value + 1}`
  const value = Math.round(props.values[hoveredIndex.value] ?? 0)

  return `${hoveredIndex.value + 1}. ${name} · ${value}`
})

function hoverPositionClass(x: number) {
  if (x < 15) {
    return 'translate-x-0'
  }

  return x > 85 ? '-translate-x-full' : '-translate-x-1/2'
}
</script>

<template>
  <div
    v-if="variant === 'bars'"
    class="relative flex items-end gap-1 border-b border-black/8 dark:border-white/[0.08]"
    :class="heightClass"
    role="img"
    :aria-label="label"
    @mouseleave="hoveredIndex = null"
  >
    <div
      v-for="(point, index) in points"
      :key="index"
      class="min-w-1 flex-1 rounded-t-sm transition-[height] duration-300 motion-reduce:transition-none"
      :class="barColor(point.value)"
      :style="{ height: `${Math.max(6, Math.min(100, point.value))}%` }"
      @mouseenter="hoveredIndex = index"
    />
    <div
      v-if="threshold !== null"
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 border-t border-dashed border-rose-500/40"
      :style="{ bottom: `${threshold}%` }"
    />
    <div
      v-if="hoveredIndex !== null"
      aria-hidden="true"
      class="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md border border-black/10 bg-white px-2 py-0.5 text-[11px] tabular-nums text-toned shadow-sm dark:border-white/[0.12] dark:bg-[#161616]"
      :class="hoverPositionClass(points[hoveredIndex]?.x ?? 50)"
      :style="{ left: `${((hoveredIndex + 0.5) / points.length) * 100}%` }"
    >
      {{ hoveredLabel }}
    </div>
  </div>

  <div
    v-else
    class="relative border-b border-black/8 dark:border-white/[0.08]"
    :class="heightClass"
    role="img"
    :aria-label="label"
    @mouseleave="hoveredIndex = null"
  >
    <svg
      v-if="points.length >= 2"
      class="absolute inset-0 size-full"
      :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          :id="gradientId"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          :x2="chartWidth"
          y2="0"
        >
          <stop
            v-for="(stop, index) in gradientStops"
            :key="index"
            :offset="stop.offset"
            :stop-color="stop.color"
          />
        </linearGradient>
      </defs>
      <path
        :d="areaPath"
        :fill="`url(#${gradientId})`"
        fill-opacity="0.12"
      />
      <line
        v-if="thresholdY !== null"
        x1="0"
        :x2="chartWidth"
        :y1="thresholdY"
        :y2="thresholdY"
        class="stroke-rose-500/40"
        stroke-width="1"
        stroke-dasharray="3 3"
        vector-effect="non-scaling-stroke"
      />
      <path
        :d="linePath"
        fill="none"
        :stroke="`url(#${gradientId})`"
        stroke-opacity="0.85"
        stroke-width="1.5"
        stroke-linejoin="round"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>
    <span
      v-for="(point, index) in points"
      :key="index"
      class="absolute flex size-3.5 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full"
      :style="{ left: `${point.x}%`, bottom: `${Math.max(0, Math.min(100, point.value))}%` }"
      @mouseenter="hoveredIndex = index"
    >
      <span
        class="size-1.5 rounded-full transition-transform"
        :class="[dotColor(point.value), hoveredIndex === index ? 'scale-150' : '']"
      />
    </span>
    <div
      v-if="hoveredIndex !== null"
      aria-hidden="true"
      class="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-black/10 bg-white px-2 py-0.5 text-[11px] tabular-nums text-toned shadow-sm dark:border-white/[0.12] dark:bg-[#161616]"
      :class="hoverPositionClass(points[hoveredIndex]?.x ?? 50)"
      :style="{
        left: `${points[hoveredIndex]?.x ?? 50}%`,
        bottom: `calc(${Math.max(0, Math.min(100, points[hoveredIndex]?.value ?? 0))}% + 12px)`
      }"
    >
      {{ hoveredLabel }}
    </div>
  </div>
</template>
