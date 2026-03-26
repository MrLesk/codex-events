<script setup lang="ts">
import type { ShellNavigationGroup } from '~/composables/useShellNavigation'

const props = defineProps<{
  groups: ShellNavigationGroup[]
}>()

const route = useRoute()

function isActiveLink(to: string) {
  if (to === '/') {
    return route.path === '/'
  }

  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <nav class="space-y-7 text-[#A3A3A3]">
    <section
      v-for="group in props.groups"
      :key="group.label"
      class="space-y-2"
    >
      <p class="px-3 text-[11px] font-semibold tracking-[0.02em] text-[#8C8C8C] uppercase">
        {{ group.label }}
      </p>

      <div class="flex flex-col gap-0.5">
        <NuxtLink
          v-for="item in group.items"
          :key="item.id"
          :to="item.to"
          class="rounded-md px-3 py-[5px] text-[14px] transition-colors"
          :class="isActiveLink(item.to)
            ? 'bg-[#282828] text-white'
            : 'text-[#ECECEC] hover:bg-[#1A1A1A] hover:text-white'"
        >
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </section>
  </nav>
</template>
