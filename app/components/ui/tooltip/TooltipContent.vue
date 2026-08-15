<script setup lang="ts">
import type { TooltipContentEmits, TooltipContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import {
  TooltipContent,
  TooltipPortal,
  useForwardPropsEmits
} from 'reka-ui'
import { cn } from '~/lib/utils'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<TooltipContentProps & { class?: HTMLAttributes['class'] }>(),
  {
    sideOffset: 6
  }
)
const emits = defineEmits<TooltipContentEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      data-slot="tooltip-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="cn('data-[state=delayed-open]:animate-in data-[state=instant-open]:animate-in fade-in-0 zoom-in-95 z-50 max-w-72 origin-(--reka-tooltip-content-transform-origin) rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-toned shadow-[0_12px_32px_-20px_rgba(15,23,42,0.4)] dark:border-white/[0.12] dark:bg-[#161616]', props.class)"
    >
      <slot />
    </TooltipContent>
  </TooltipPortal>
</template>
