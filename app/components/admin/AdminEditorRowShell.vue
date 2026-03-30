<script setup lang="ts">
const slots = useSlots()

const props = withDefaults(defineProps<{
  columnsClass?: string
  contentClass?: string
  controlsClass?: string
  actionsClass?: string
}>(), {
  columnsClass: 'sm:grid-cols-[4.25rem_minmax(0,1fr)_4.25rem]',
  contentClass: '',
  controlsClass: 'flex flex-wrap items-center justify-center gap-3 sm:flex-col sm:self-center',
  actionsClass: 'flex items-center justify-center sm:self-center'
})
</script>

<template>
  <div :class="['grid gap-3 sm:items-stretch sm:gap-0', props.columnsClass]">
    <div
      :class="[
        'relative sm:flex sm:pr-4',
        props.controlsClass
      ]"
    >
      <div
        class="pointer-events-none absolute bottom-[10%] right-0 top-[10%] hidden w-px bg-black/8 sm:block sm:dark:bg-white/[0.08]"
      />
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
      v-if="slots.actions"
      :class="[
        'relative sm:flex sm:pl-4',
        props.actionsClass
      ]"
    >
      <div
        class="pointer-events-none absolute bottom-[10%] left-0 top-[10%] hidden w-px bg-black/8 sm:block sm:dark:bg-white/[0.08]"
      />
      <slot name="actions" />
    </div>
  </div>
</template>
