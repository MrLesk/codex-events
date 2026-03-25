<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { Badge as UiBadge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'

defineOptions({
  inheritAttrs: false
})

type BadgeColor = 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'error' | 'info'
type BadgeVariant = 'solid' | 'soft' | 'subtle' | 'outline'
type BadgeSize = 'sm' | 'md'

const props = withDefaults(defineProps<{
  color?: BadgeColor
  variant?: BadgeVariant
  size?: BadgeSize
  class?: HTMLAttributes['class']
}>(), {
  color: 'primary',
  variant: 'soft',
  size: 'md'
})

const rootClass = computed(() => {
  const key = `${props.variant}:${props.color}`

  const variants: Record<string, string> = {
    'solid:primary': 'border-transparent bg-primary text-primary-foreground',
    'solid:secondary': 'border-transparent bg-secondary text-secondary-foreground',
    'solid:neutral': 'border-transparent bg-elevated text-highlighted',
    'solid:success': 'border-transparent bg-success text-white',
    'solid:warning': 'border-transparent bg-warning text-white',
    'solid:error': 'border-transparent bg-error text-white',
    'solid:info': 'border-transparent bg-info text-white',
    'soft:primary': 'border-primary/20 bg-primary/10 text-primary',
    'soft:secondary': 'border-secondary/20 bg-secondary/15 text-secondary',
    'soft:neutral': 'border-default/80 bg-default text-toned',
    'soft:success': 'border-success/20 bg-success/10 text-success',
    'soft:warning': 'border-warning/20 bg-warning/10 text-warning',
    'soft:error': 'border-error/20 bg-error/10 text-error',
    'soft:info': 'border-info/20 bg-info/10 text-info',
    'subtle:primary': 'border-transparent bg-primary/8 text-primary',
    'subtle:secondary': 'border-transparent bg-secondary/10 text-secondary',
    'subtle:neutral': 'border-transparent bg-default/70 text-muted',
    'subtle:success': 'border-transparent bg-success/8 text-success',
    'subtle:warning': 'border-transparent bg-warning/8 text-warning',
    'subtle:error': 'border-transparent bg-error/8 text-error',
    'subtle:info': 'border-transparent bg-info/8 text-info',
    'outline:primary': 'border-primary/20 bg-transparent text-primary',
    'outline:secondary': 'border-secondary/20 bg-transparent text-secondary',
    'outline:neutral': 'border-default/80 bg-transparent text-highlighted',
    'outline:success': 'border-success/20 bg-transparent text-success',
    'outline:warning': 'border-warning/20 bg-transparent text-warning',
    'outline:error': 'border-error/20 bg-transparent text-error',
    'outline:info': 'border-info/20 bg-transparent text-info'
  }

  return cn(
    props.size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
    variants[key] ?? variants['soft:primary'],
    props.class
  )
})

const attrs = useAttrs()
</script>

<template>
  <UiBadge
    variant="outline"
    :class="rootClass"
    v-bind="attrs"
  >
    <slot />
  </UiBadge>
</template>
