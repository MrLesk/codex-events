<script setup lang="ts">
import type { EventBuilderTemplate } from '#shared/domains/events/builder-templates'
import type { EventBalanceResult } from '#shared/domains/events/builder-scoring'
import { eventBuilderBlockDefinitions } from '#shared/domains/events/builder-blocks'
import { eventBuilderBlockIcons } from '~/domains/events/builder'

const props = defineProps<{
  template: EventBuilderTemplate
  projection: EventBalanceResult
  selected: boolean
}>()

const emit = defineEmits<{
  select: [template: EventBuilderTemplate]
}>()

const totalDuration = computed(() => {
  const minutes = props.template.blocks.reduce((total, block) => total + block.durationMinutes, 0)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours === 0) {
    return `${rest}m`
  }

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
})
</script>

<template>
  <button
    type="button"
    :data-testid="`event-builder-template-${template.id}`"
    :aria-expanded="selected"
    :aria-label="`Preview template ${template.name}`"
    class="group flex w-full flex-col gap-1.5 rounded-xl border p-3 text-left transition"
    :class="selected
      ? 'border-black/25 bg-white/95 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] dark:border-white/[0.28] dark:bg-[#181818]'
      : 'border-black/8 bg-white/88 hover:border-black/20 hover:shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]'"
    @click="emit('select', props.template)"
  >
    <span class="flex w-full items-center gap-2">
      <span class="truncate text-sm font-semibold text-highlighted">{{ template.name }}</span>
      <AppBadge
        :color="projection.score >= 80 ? 'success' : projection.score >= 60 ? 'info' : 'warning'"
        variant="soft"
        size="sm"
        class="ml-auto shrink-0 tabular-nums"
        :title="`Agenda score ${projection.score} · ${projection.band.label}`"
      >
        {{ projection.score }}
      </AppBadge>
      <span class="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-toned transition group-hover:text-highlighted">
        Details
        <AppIcon
          name="i-lucide-chevron-down"
          class="size-4 transition-transform"
          :class="selected ? 'rotate-180' : ''"
        />
      </span>
    </span>

    <span class="line-clamp-2 min-h-8 text-xs text-muted">{{ template.description }}</span>

    <span class="mt-auto flex w-full items-center gap-2 text-xs text-dimmed">
      <span class="flex items-center gap-1.5 text-toned">
        <AppIcon
          v-for="(block, index) in template.blocks"
          :key="`${template.id}-${index}`"
          :name="eventBuilderBlockIcons[block.builderBlockType]"
          class="size-4.5"
          :title="`${eventBuilderBlockDefinitions[block.builderBlockType].label} · ${block.durationMinutes}m`"
        />
      </span>
      <span class="ml-auto shrink-0 tabular-nums">{{ template.blocks.length }} blocks · {{ totalDuration }}</span>
    </span>
  </button>
</template>
