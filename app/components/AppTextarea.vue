<script setup lang="ts">
import { cn } from '~/lib/utils'

const [modelValue, modelModifiers] = defineModel<string | number | undefined>()

const props = withDefaults(defineProps<{
  rows?: number | string
  disabled?: boolean
  placeholder?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>(), {
  rows: 4,
  disabled: false,
  placeholder: undefined,
  size: 'md'
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'px-3 py-2 text-sm leading-6',
    md: 'px-4 py-3 text-sm leading-6',
    lg: 'px-4 py-3 text-sm leading-6',
    xl: 'px-4 py-3 text-sm leading-6'
  }

  return sizes[props.size]
})

const minHeightClass = computed(() => {
  const normalizedRows = typeof props.rows === 'string'
    ? Number.parseInt(props.rows, 10)
    : props.rows

  return normalizedRows <= 1 ? 'min-h-10' : 'min-h-32'
})

const normalizedValue = computed({
  get() {
    return modelValue.value ?? ''
  },
  set(value: string) {
    modelValue.value = modelModifiers.trim ? value.trim() : value
  }
})
</script>

<template>
  <textarea
    v-model="normalizedValue"
    :rows="props.rows"
    :disabled="props.disabled"
    :placeholder="props.placeholder"
    :class="cn('w-full resize-y rounded-lg border border-black/8 bg-white text-highlighted outline-none transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25]', minHeightClass, sizeClasses)"
  />
</template>
