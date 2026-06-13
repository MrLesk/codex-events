<script setup lang="ts">
withDefaults(defineProps<{
  displayName: string
  email: string
  nameClass?: string
}>(), {
  nameClass: ''
})
</script>

<template>
  <div class="min-h-[4.75rem] flex flex-col gap-3 rounded-lg border border-black/8 bg-white/85 px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-white/[0.08] dark:bg-[#111111]">
    <div class="min-w-0 flex-1 space-y-0.5">
      <div class="flex flex-wrap items-center gap-2">
        <p :class="['font-semibold text-highlighted', nameClass]">
          {{ displayName }}
        </p>
        <slot name="badges" />
      </div>
      <p class="text-sm text-muted">
        {{ email }}
      </p>
    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-2 self-start md:self-auto">
      <slot name="actions" />
    </div>
  </div>
</template>
