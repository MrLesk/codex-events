<script setup lang="ts">
const modelValue = defineModel<boolean>({
  default: false
})

const props = defineProps<{
  label?: string
  disabled?: boolean
}>()
</script>

<template>
  <label class="flex items-start gap-3 text-sm text-toned">
    <input
      v-model="modelValue"
      type="checkbox"
      :disabled="props.disabled"
      class="mt-0.5 size-4 rounded border-default text-primary accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
    >
    <span>
      <slot>{{ props.label }}</slot>
    </span>
  </label>
</template>
