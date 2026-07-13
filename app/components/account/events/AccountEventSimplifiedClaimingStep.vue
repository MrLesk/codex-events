<script setup lang="ts">
defineProps<{
  number: number
  title: string
}>()
</script>

<template>
  <section class="grid gap-3 py-5 sm:grid-cols-[2rem_minmax(0,1fr)] sm:gap-4">
    <div class="flex size-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
      {{ number }}
    </div>

    <div class="min-w-0 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h4 class="text-sm font-semibold text-highlighted">
          {{ title }}
        </h4>
        <slot name="status" />
      </div>
      <slot />
    </div>
  </section>
</template>
