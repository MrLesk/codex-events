<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description: string
  backTo?: string
  backLabel?: string
  stateLabel?: string
  stateClass?: string
  summary?: string
}>()
</script>

<template>
  <div class="space-y-2 pb-4">
    <NuxtLink
      v-if="backTo"
      :to="backTo"
      class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-600 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
    >
      <AppIcon
        name="i-lucide-arrow-left"
        class="size-4"
      />
      {{ backLabel ?? 'Back' }}
    </NuxtLink>

    <p
      v-if="eyebrow"
      class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
    >
      {{ eyebrow }}
    </p>

    <div class="min-w-0 flex flex-wrap items-center gap-3">
      <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
        {{ title }}
      </h1>
      <span
        v-if="stateLabel"
        class="rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider"
        :class="stateClass"
      >
        {{ stateLabel }}
      </span>
    </div>

    <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
      {{ description }}
    </p>

    <p
      v-if="summary"
      class="text-[13px] text-neutral-600 dark:text-[#A3A3A3]"
    >
      {{ summary }}
    </p>
  </div>
</template>
