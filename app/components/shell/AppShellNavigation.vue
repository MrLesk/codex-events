<script setup lang="ts">
import type { ShellNavigationGroup } from '~/composables/useShellNavigation'
import { isShellNavigationLinkActive } from '~/domains/accounts/shell-navigation'

const props = defineProps<{
  groups: ShellNavigationGroup[]
  collapsed?: boolean
  accountEventNavigationMode?: 'participant' | 'staff' | 'admin'
}>()

const route = useRoute()
</script>

<template>
  <nav class="space-y-7 text-neutral-600 dark:text-[#A3A3A3]">
    <section
      v-for="(group, groupIndex) in props.groups"
      :key="`${group.label || 'group'}-${groupIndex}`"
      class="space-y-2"
    >
      <p
        v-if="group.label"
        class="px-3 text-[11px] font-semibold tracking-[0.02em] text-neutral-500 uppercase transition-opacity duration-150 dark:text-[#8C8C8C]"
        :class="props.collapsed ? 'opacity-0' : 'opacity-100'"
      >
        {{ group.label }}
      </p>
      <div
        v-else-if="groupIndex > 0"
        class="px-2 py-1.5"
      >
        <div class="h-px bg-black/8 dark:bg-white/[0.08]" />
      </div>

      <div class="flex flex-col gap-1">
        <NuxtLink
          v-for="item in group.items"
          :key="item.id"
          :to="item.to"
          class="inline-flex w-full items-center rounded-md px-3 py-[6px] text-[14px] transition-colors"
          :class="[
            'justify-start',
            isShellNavigationLinkActive(route.path, route.query.tab, item.to, {
              accountEventNavigationMode: props.accountEventNavigationMode
            })
              ? 'bg-black/8 text-highlighted dark:bg-[#282828] dark:text-white'
              : 'text-neutral-700 hover:bg-black/6 hover:text-highlighted dark:text-[#ECECEC] dark:hover:bg-[#1A1A1A] dark:hover:text-white'
          ]"
          :title="props.collapsed ? item.label : undefined"
        >
          <AppIcon
            :name="item.icon"
            class="size-4 shrink-0"
          />
          <span
            aria-hidden="true"
            class="overflow-hidden whitespace-nowrap text-left transition-[max-width,opacity,margin] duration-200"
            :class="props.collapsed ? 'ml-0 max-w-0 opacity-0' : 'ml-2 max-w-[12rem] opacity-100'"
          >
            {{ item.label }}
          </span>
          <span class="sr-only">
            {{ item.label }}
          </span>
        </NuxtLink>
      </div>
    </section>
  </nav>
</template>
