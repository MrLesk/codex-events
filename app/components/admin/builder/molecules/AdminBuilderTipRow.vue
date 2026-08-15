<script setup lang="ts">
import type { EventBalanceTip } from '#shared/domains/events/builder-scoring'

defineProps<{
  tip: EventBalanceTip
}>()
</script>

<template>
  <li class="flex items-start gap-2.5 text-sm">
    <AppIcon
      :name="tip.tone === 'boost' ? 'i-lucide-lightbulb' : 'i-lucide-triangle-alert'"
      class="mt-0.5 size-4 shrink-0"
      :class="tip.tone === 'boost' ? 'text-emerald-500' : 'text-amber-500'"
    />
    <span class="text-toned">{{ tip.message }}</span>
  </li>
</template>
