<script setup lang="ts">
import type { EventBuilderChecklistItem } from '~/domains/events/builder'

const props = defineProps<{
  item: EventBuilderChecklistItem
}>()

const emit = defineEmits<{
  focusField: [item: EventBuilderChecklistItem]
}>()
</script>

<template>
  <li>
    <button
      type="button"
      class="flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left text-sm transition hover:bg-black/4 dark:hover:bg-white/[0.05]"
      :data-testid="`event-builder-checklist-${item.id}`"
      @click="emit('focusField', props.item)"
    >
      <AppIcon
        :name="item.complete ? 'i-lucide-circle-check-big' : 'i-lucide-circle'"
        class="size-4 shrink-0"
        :class="item.complete ? 'text-emerald-500' : 'text-muted'"
      />
      <span :class="item.complete ? 'text-dimmed line-through decoration-black/20 dark:decoration-white/20' : 'text-toned'">
        {{ item.label }}
      </span>
    </button>
  </li>
</template>
