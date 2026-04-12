<script setup lang="ts">
import { cn } from '~/lib/utils'

defineOptions({
  inheritAttrs: false
})

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
    sm: 'min-h-[38px] px-3 py-2 pr-10 text-sm',
    md: 'min-h-[46px] px-4 py-3 pr-10 text-sm',
    lg: 'min-h-[46px] px-4 py-3 pr-10 text-sm',
    xl: 'min-h-[46px] px-4 py-3 pr-10 text-sm'
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
  <div class="relative">
    <select
      v-model="normalizedValue"
      v-bind="$attrs"
      :disabled="props.disabled"
      :class="cn('w-full appearance-none rounded-lg border border-black/8 bg-white text-highlighted outline-none transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25]', sizeClasses)"
    >
      <slot />
    </select>
    <AppIcon
      name="i-lucide-chevron-down"
      class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
    />
  </div>
</template>
