<script setup lang="ts">
const props = defineProps<{
  name?: string
  label?: string
  description?: string
}>()
</script>

<template>
  <div class="space-y-2">
    <div class="space-y-1">
      <label
        v-if="props.label"
        :for="props.name"
        class="text-sm font-medium text-highlighted"
      >
        {{ props.label }}
      </label>
      <p
        v-if="props.description"
        class="text-sm text-muted"
      >
        {{ props.description }}
      </p>
    </div>
    <slot />
  </div>
</template>
