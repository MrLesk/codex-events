<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

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

const rootClass = computed(() =>
  cn(
    'rounded-[1.5rem] border border-default/70 bg-elevated/90 text-foreground shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)]',
    props.variant === 'subtle' ? 'bg-elevated/82 backdrop-blur' : '',
    props.ui.root,
    props.class
  )
)
</script>

<template>
  <UiCard :class="rootClass">
    <slot />
  </UiCard>
</template>
