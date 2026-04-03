<script setup lang="ts">
import { cn } from '~/lib/utils'

const [modelValue, modelModifiers] = defineModel<string | number | undefined>()

const props = withDefaults(defineProps<{
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>(), {
  disabled: false,
  size: 'md'
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-4 py-3 text-sm',
    xl: 'px-4 py-3 text-sm'
  }

  return sizes[props.size]
})

const normalizedValue = computed({
  get() {
    return modelValue.value ?? ''
  },
  set(value: string) {
    if (modelModifiers.number) {
      if (value === '') {
        modelValue.value = undefined
        return
      }

      const parsedValue = Number(value)
      modelValue.value = Number.isNaN(parsedValue) ? value : parsedValue
      return
    }

    modelValue.value = modelModifiers.trim ? value.trim() : value
  }
})
</script>

<template>
  <select
    v-model="normalizedValue"
    :disabled="props.disabled"
    :class="cn('w-full rounded-lg border border-black/8 bg-white text-highlighted outline-none transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25]', sizeClasses)"
  >
    <slot />
  </select>
</template>
