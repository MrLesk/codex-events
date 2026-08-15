<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'

withDefaults(defineProps<{
  /** Tooltip body; without it the slot renders bare. */
  text?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** Milliseconds before showing; 0 = immediately. */
  delayDuration?: number
}>(), {
  text: undefined,
  side: 'top',
  delayDuration: 0
})
</script>

<template>
  <TooltipProvider
    :delay-duration="delayDuration"
    :skip-delay-duration="0"
  >
    <Tooltip>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipContent
        v-if="text"
        :side="side"
      >
        {{ text }}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
