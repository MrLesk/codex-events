<script setup lang="ts">
withDefaults(defineProps<{
  actionWidthClass?: string
}>(), {
  actionWidthClass: 'w-24'
})
</script>

<template>
  <div
    class="min-h-[4.75rem] flex flex-col gap-3 rounded-lg border border-black/8 bg-white/85 px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-white/[0.08] dark:bg-[#111111]"
    aria-hidden="true"
  >
    <div class="space-y-1.5">
      <div class="h-5 w-36 animate-pulse rounded-full bg-black/8 dark:bg-white/[0.08]" />
      <div class="h-4 w-52 animate-pulse rounded-full bg-black/6 dark:bg-white/[0.06]" />
    </div>

    <div :class="['h-8 rounded-lg bg-black/6 animate-pulse dark:bg-white/[0.06] md:self-auto', actionWidthClass]" />
  </div>
</template>
