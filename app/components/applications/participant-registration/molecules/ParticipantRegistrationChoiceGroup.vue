<script setup lang="ts">
export interface ParticipantRegistrationChoice {
  value: string
  label: string
  icon?: string
}

const props = defineProps<{
  fieldId: string
  modelValue: string
  options: ParticipantRegistrationChoice[]
  disabled?: boolean
  error?: string
}>()

const emit = defineEmits<{
  updateModelValue: [value: string]
}>()
</script>

<template>
  <div
    class="space-y-2"
    :data-registration-field="props.fieldId"
  >
    <div class="grid gap-2 sm:grid-cols-3">
      <button
        v-for="option in props.options"
        :key="option.value"
        type="button"
        class="flex min-h-10 items-center justify-between rounded-lg border px-3 py-2 text-left text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        :class="props.modelValue === option.value
          ? 'border-black/25 bg-black/6 text-highlighted dark:border-white/25 dark:bg-white/[0.08]'
          : 'border-black/8 text-toned hover:border-black/20 dark:border-white/[0.08] dark:hover:border-white/20'"
        :aria-pressed="props.modelValue === option.value"
        :disabled="props.disabled"
        @click="emit('updateModelValue', option.value)"
      >
        <span class="inline-flex items-center gap-2">
          <AppIcon
            v-if="option.icon"
            :name="option.icon"
            class="size-3.5"
          />
          {{ option.label }}
        </span>
        <AppIcon
          v-if="props.modelValue === option.value"
          name="i-lucide-check"
          class="size-3.5"
        />
      </button>
    </div>

    <p
      v-if="props.error"
      class="text-[11px] text-error"
      role="alert"
    >
      {{ props.error }}
    </p>
  </div>
</template>
