<script setup lang="ts">
type DropdownItem = {
  label: string
  to?: string
  color?: 'primary' | 'neutral' | 'success' | 'warning' | 'error' | 'info'
  checked?: boolean
  type?: 'checkbox'
}

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<{
  items?: DropdownItem[]
}>(), {
  items: () => []
})

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function toggleOpen() {
  open.value = !open.value
}

function closeMenu() {
  open.value = false
}

function handlePointerDown(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown)
})
</script>

<template>
  <div
    ref="root"
    class="relative inline-flex"
  >
    <div @click="toggleOpen">
      <slot :open="open" />
    </div>

    <div
      v-if="open"
      class="absolute left-0 top-full z-50 mt-2 min-w-48 overflow-hidden rounded-xl border border-default/80 bg-elevated/95 p-1 shadow-[0_24px_60px_-46px_rgba(15,20,34,0.7)] backdrop-blur"
    >
      <component
        :is="item.to ? 'a' : 'button'"
        v-for="item in props.items"
        :key="`${item.label}-${item.to ?? 'action'}`"
        :href="item.to"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-toned transition-colors hover:bg-default hover:text-highlighted"
        @click="closeMenu"
      >
        <span
          v-if="item.type === 'checkbox'"
          class="inline-flex size-4 items-center justify-center rounded border border-default/80 bg-default text-xs text-highlighted"
        >
          {{ item.checked ? '✓' : '' }}
        </span>
        <span>{{ item.label }}</span>
      </component>
    </div>
  </div>
</template>
