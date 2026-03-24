<script setup lang="ts">
import type { InputTypeHTMLAttribute } from 'vue'

import { Input as UiInput } from '~/components/ui/input'
import { cn } from '~/lib/utils'

const modelValue = defineModel<string | number | undefined>()

const props = withDefaults(defineProps<{
  type?: InputTypeHTMLAttribute
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>(), {
  type: 'text' as InputTypeHTMLAttribute,
  placeholder: undefined,
  disabled: false,
  size: 'md'
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'h-8 rounded-lg px-3 text-sm',
    md: 'h-9 rounded-xl px-3 text-sm',
    lg: 'h-10 rounded-xl px-4 text-base',
    xl: 'h-11 rounded-2xl px-4 text-base'
  }

  return sizes[props.size]
})
</script>

<template>
  <UiInput
    v-model="modelValue"
    :type="props.type"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :class="cn('border-default/80 bg-default/70 focus-visible:ring-ring/60', sizeClasses)"
  />
</template>
