<script setup lang="ts">
const props = withDefaults(defineProps<{
  itemId: string
  index: number
  title: string
  active?: boolean
  testIdPrefix?: string
  itemIdAttribute?: string
  rowAttribute?: string
  sortHandleAttribute?: string
  reorderDisabled?: boolean
}>(), {
  testIdPrefix: 'event-builder-block',
  itemIdAttribute: 'data-builder-block-id',
  rowAttribute: 'data-builder-block-row',
  sortHandleAttribute: 'data-builder-block-sort-handle',
  reorderDisabled: false
})

const emit = defineEmits<{
  move: [direction: -1 | 1]
}>()

function onGripKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    emit('move', -1)
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    emit('move', 1)
  }
}

const rowAttributes = computed(() => ({
  [props.itemIdAttribute]: props.itemId,
  [props.rowAttribute]: ''
}))

const sortHandleAttributes = computed(() => ({
  [props.sortHandleAttribute]: ''
}))
</script>

<template>
  <article
    :data-testid="`${props.testIdPrefix}-row-${index}`"
    v-bind="rowAttributes"
    class="rounded-xl border bg-white/88 p-2 pl-1.5 transition-all dark:bg-[#111111]"
    :class="active
      ? 'border-black/16 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.55)] dark:border-white/[0.16]'
      : 'border-black/8 dark:border-white/[0.08]'"
  >
    <div class="flex min-w-0 items-center gap-1.5">
      <button
        type="button"
        v-bind="sortHandleAttributes"
        :data-testid="`${props.testIdPrefix}-grip-${index}`"
        :aria-label="`Reorder ${title}: drag, or press the arrow keys`"
        :disabled="props.reorderDisabled"
        class="inline-flex h-9 w-6 shrink-0 cursor-grab items-center justify-center rounded-lg text-dimmed transition hover:bg-black/5 hover:text-highlighted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black/30 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/[0.06] dark:focus-visible:outline-white/40"
        @keydown="onGripKeydown"
      >
        <AppIcon
          name="i-lucide-grip-vertical"
          class="size-4"
        />
      </button>

      <div class="min-w-0 flex-1">
        <slot />
      </div>
    </div>
  </article>
</template>
