<script setup lang="ts">
import { cn } from '~/lib/utils'

defineOptions({
  inheritAttrs: false
})

const [modelValue] = defineModel<string | undefined>()

const props = withDefaults(defineProps<{
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  pickerAriaLabel?: string
}>(), {
  placeholder: undefined,
  disabled: false,
  size: 'md',
  pickerAriaLabel: 'Open date and time picker'
})

const attrs = useAttrs()
const inputRef = ref<HTMLInputElement | null>(null)

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
    modelValue.value = value
  }
})

function openPicker() {
  if (props.disabled) {
    return
  }

  const input = inputRef.value

  if (!input) {
    return
  }

  if (typeof input.showPicker === 'function') {
    input.showPicker()
    return
  }

  input.focus()
}
</script>

<template>
  <div class="relative">
    <input
      ref="inputRef"
      v-model="normalizedValue"
      v-bind="attrs"
      type="datetime-local"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :class="cn('w-full rounded-lg border border-black/8 bg-white pr-11 text-highlighted outline-none transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25]', sizeClasses)"
    >

    <button
      type="button"
      class="absolute inset-y-0 right-2 inline-flex items-center justify-center rounded-md px-1 text-muted transition hover:text-highlighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-white/[0.14]"
      :disabled="props.disabled"
      :aria-label="props.pickerAriaLabel"
      @click="openPicker"
    >
      <AppIcon
        name="i-lucide-calendar-range"
        class="size-4"
      />
    </button>
  </div>
</template>
