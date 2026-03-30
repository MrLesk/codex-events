<script setup lang="ts">
const props = withDefaults(defineProps<{
  contentClass?: string
  controlsClass?: string
  actionsClass?: string
}>(), {
  contentClass: '',
  controlsClass: 'flex flex-wrap items-center justify-center gap-3 sm:flex-col sm:self-center',
  actionsClass: 'flex items-center justify-center sm:self-center'
})
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-[4.25rem_minmax(0,1fr)_4.25rem] sm:items-stretch sm:gap-0">
    <div
      :class="[
        'sm:flex sm:border-r sm:border-black/8 sm:pr-4 sm:dark:border-white/[0.08]',
        props.controlsClass
      ]"
    >
      <slot name="controls" />
    </div>

    <div
      :class="[
        'grid gap-3 py-3 sm:min-w-0 sm:px-4 sm:py-0',
        props.contentClass
      ]"
    >
      <slot />
    </div>

    <div
      :class="[
        'sm:flex sm:border-l sm:border-black/8 sm:pl-4 sm:dark:border-white/[0.08]',
        props.actionsClass
      ]"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
