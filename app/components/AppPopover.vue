<script setup lang="ts">
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'

withDefaults(defineProps<{
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  contentClass?: string
}>(), {
  side: 'bottom',
  align: 'center',
  contentClass: undefined
})
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <slot name="trigger" />
    </PopoverTrigger>
    <PopoverContent
      :side="side"
      :align="align"
      :class="contentClass"
    >
      <slot />
    </PopoverContent>
  </Popover>
</template>
