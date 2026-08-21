<script setup lang="ts">
const modelValue = defineModel<string | undefined>()

const props = withDefaults(defineProps<{
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  pickerAriaLabel?: string
}>(), {
  disabled: false,
  size: 'md',
  pickerAriaLabel: 'Open date and time picker'
})
</script>

<template>
  <AppDateTimePicker
    v-model="modelValue"
    :disabled="props.disabled"
    :size="props.size"
    :picker-aria-label="props.pickerAriaLabel"
  />
</template>
