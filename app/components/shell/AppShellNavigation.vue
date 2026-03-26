<script setup lang="ts">
import type { ShellNavigationGroup } from '~/composables/useShellNavigation'

const props = defineProps<{
  groups: ShellNavigationGroup[]
  collapsed?: boolean
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
  <nav
    class="text-[#A3A3A3]"
    :class="props.collapsed ? 'space-y-4' : 'space-y-7'"
  >
    <section
      v-for="group in props.groups"
      :key="group.label"
      :class="props.collapsed ? 'space-y-1.5' : 'space-y-2'"
    >
      <p
        v-if="!props.collapsed"
        class="px-3 text-[11px] font-semibold tracking-[0.02em] text-[#8C8C8C] uppercase"
      >
        {{ group.label }}
      </p>
      <div
        v-else
        class="px-2 py-1.5"
      >
        <div class="h-px bg-white/[0.08]" />
        <span class="sr-only">{{ group.label }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <NuxtLink
          v-for="item in group.items"
          :key="item.id"
          :to="item.to"
          class="inline-flex items-center rounded-md text-[14px] transition-colors"
          :class="[
            props.collapsed ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-[6px]',
            isActiveLink(item.to)
              ? 'bg-[#282828] text-white'
              : 'text-[#ECECEC] hover:bg-[#1A1A1A] hover:text-white'
          ]"
          :title="props.collapsed ? item.label : undefined"
        >
          <AppIcon
            :name="item.icon"
            class="size-4 shrink-0"
          />
          <span
            v-if="!props.collapsed"
            class="truncate"
          >
            {{ item.label }}
          </span>
          <span
            v-else
            class="sr-only"
          >
            {{ item.label }}
          </span>
        </NuxtLink>
      </div>
    </section>
  </nav>
</template>
