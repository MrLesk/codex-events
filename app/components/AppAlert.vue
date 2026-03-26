<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { Alert as UiAlert, AlertDescription as UiAlertDescription, AlertTitle as UiAlertTitle } from '~/components/ui/alert'
import { cn } from '~/lib/utils'

type AlertColor = 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'error' | 'info'
type AlertVariant = 'soft' | 'subtle' | 'outline'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  icon?: string
  color?: AlertColor
  variant?: AlertVariant
  class?: HTMLAttributes['class']
}>(), {
  color: 'neutral',
  variant: 'soft'
})

const rootClass = computed(() => {
  const key = `${props.variant}:${props.color}`

  const variants: Record<string, string> = {
    'soft:primary': 'border-primary/20 bg-primary/10 text-primary',
    'soft:secondary': 'border-secondary/20 bg-secondary/15 text-secondary',
    'soft:neutral': 'border-default/80 bg-default/90 text-toned',
    'soft:success': 'border-success/20 bg-success/10 text-success',
    'soft:warning': 'border-warning/20 bg-warning/10 text-warning',
    'soft:error': 'border-error/20 bg-error/10 text-error',
    'soft:info': 'border-info/20 bg-info/10 text-info',
    'subtle:primary': 'border-transparent bg-primary/8 text-primary',
    'subtle:secondary': 'border-transparent bg-secondary/10 text-secondary',
    'subtle:neutral': 'border-transparent bg-default/70 text-toned',
    'subtle:success': 'border-transparent bg-success/8 text-success',
    'subtle:warning': 'border-transparent bg-warning/8 text-warning',
    'subtle:error': 'border-transparent bg-error/8 text-error',
    'subtle:info': 'border-transparent bg-info/8 text-info',
    'outline:primary': 'border-primary/20 bg-transparent text-primary',
    'outline:secondary': 'border-secondary/20 bg-transparent text-secondary',
    'outline:neutral': 'border-default/80 bg-transparent text-toned',
    'outline:success': 'border-success/20 bg-transparent text-success',
    'outline:warning': 'border-warning/20 bg-transparent text-warning',
    'outline:error': 'border-error/20 bg-transparent text-error',
    'outline:info': 'border-info/20 bg-transparent text-info'
  }

  return cn(
    'rounded-[1.35rem] px-4 py-3',
    props.icon ? 'grid-cols-[calc(var(--spacing)*4)_1fr] gap-x-3' : undefined,
    variants[key] ?? variants['soft:neutral'],
    props.class
  )
})
</script>

<template>
  <UiAlert
    variant="default"
    :class="rootClass"
  >
    <AppIcon
      v-if="props.icon"
      :name="props.icon"
      class="mt-0.5 size-4"
    />
    <UiAlertTitle
      v-if="props.title"
      class="font-semibold text-current"
    >
      {{ props.title }}
    </UiAlertTitle>
    <UiAlertDescription
      v-if="props.description"
      class="col-span-full col-start-1 mt-1 text-current/90"
    >
      {{ props.description }}
    </UiAlertDescription>
    <slot />
  </UiAlert>
</template>
