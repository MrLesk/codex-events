<script setup lang="ts">
import { Checkbox as UiCheckbox } from '~/components/ui/checkbox'

const modelValue = defineModel<boolean>({
  default: false
})

const props = defineProps<{
  label?: string
  disabled?: boolean
}>()

function handleCheckedUpdate(value: boolean | 'indeterminate') {
  modelValue.value = value === true
}
</script>

<template>
  <label class="flex items-start gap-3 text-sm text-toned">
    <UiCheckbox
      :checked="modelValue"
      :disabled="props.disabled"
      class="mt-0.5 border-default/80 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
      @update:checked="handleCheckedUpdate"
    />
    <span>
      <slot>{{ props.label }}</slot>
    </span>
  </label>
</template>
