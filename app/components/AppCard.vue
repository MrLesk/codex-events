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

const rootClass = computed(() =>
  cn(
    'rounded-xl border border-black/8 bg-white/70 py-0 text-foreground shadow-none dark:border-white/[0.08] dark:bg-black/36',
    props.variant === 'subtle' ? 'bg-white/62 dark:bg-black/28' : '',
    props.ui.root,
    props.class
  )
)

const bodyClass = computed(() =>
  cn(
    slots.header ? 'px-6 pb-6 pt-4' : 'p-6',
    props.ui.body
  )
)
</script>

<template>
  <UiCard :class="rootClass">
    <div
      v-if="$slots.header"
      class="px-6 pt-6"
    >
      <slot name="header" />
    </div>
    <div :class="bodyClass">
      <slot />
    </div>
  </UiCard>
</template>
