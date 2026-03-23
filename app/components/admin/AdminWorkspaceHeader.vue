<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description: string
}>()
</script>

<template>
  <div class="space-y-3">
    <p
      v-if="eyebrow"
      class="text-xs font-semibold uppercase tracking-[0.24em] text-muted"
    >
      {{ eyebrow }}
    </p>
    <div class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-[-0.04em] text-highlighted sm:text-4xl">
        {{ title }}
      </h1>
      <p class="max-w-3xl text-sm leading-6 text-toned sm:text-base">
        {{ description }}
      </p>
    </div>
  </div>
</template>
