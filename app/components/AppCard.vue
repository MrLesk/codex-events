<script setup lang="ts">
import { useSlots, type HTMLAttributes } from 'vue'

import { Card as UiCard } from '~/components/ui/card'
import { cn } from '~/lib/utils'

const props = withDefaults(defineProps<{
  variant?: 'solid' | 'subtle'
  ui?: {
    root?: HTMLAttributes['class']
    body?: HTMLAttributes['class']
  }
  class?: HTMLAttributes['class']
}>(), {
  variant: 'solid',
  ui: () => ({})
})

const slots = useSlots()
const hasHeaderSlot = computed(() => Boolean(slots.header))
const hasDefaultSlot = computed(() => Boolean(slots.default))

const rootClass = computed(() =>
  cn(
    'app-surface-panel rounded-xl py-0 text-foreground',
    props.variant === 'subtle' ? 'bg-default/72 dark:bg-default/72' : '',
    props.ui.root,
    props.class
  )
)

const bodyClass = computed(() =>
  cn(
    hasHeaderSlot.value ? 'px-6 pb-6 pt-4' : 'p-6',
    props.ui.body
  )
)
</script>

<template>
  <UiCard :class="rootClass">
    <div
      v-if="hasHeaderSlot"
      class="px-6 pt-6"
      :class="hasDefaultSlot ? 'border-b border-black/8 pb-3 dark:border-white/[0.08]' : 'pb-6'"
    >
      <slot name="header" />
    </div>
    <div
      v-if="hasDefaultSlot"
      :class="bodyClass"
    >
      <slot />
    </div>
  </UiCard>
</template>
