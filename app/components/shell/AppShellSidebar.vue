<script setup lang="ts">
import AppShellNavigation from '~/components/shell/AppShellNavigation.vue'
import {
  appShellSidebarCollapsedStateKey,
  appShellSidebarCollapseStorageKey,
  getAppShellSidebarPanelClass,
  getAppShellSidebarRailClass
} from '~/utils/shell-sidebar'

import type { ShellNavigationGroup } from '~/composables/useShellNavigation'

const props = defineProps<{
  groups: ShellNavigationGroup[]
  accountHackathonNavigationMode?: 'participant' | 'admin'
}>()

const isSidebarCollapsed = useState<boolean>(appShellSidebarCollapsedStateKey, () => false)

function toggleSidebarCollapse() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

onMounted(() => {
  try {
    isSidebarCollapsed.value = localStorage.getItem(appShellSidebarCollapseStorageKey) === 'true'
  } catch {
    // Ignore storage access failures and keep default collapsed state.
  }
})

watch(isSidebarCollapsed, (nextValue) => {
  try {
    localStorage.setItem(appShellSidebarCollapseStorageKey, nextValue ? 'true' : 'false')
  } catch {
    // Ignore storage access failures and keep runtime state.
  }
})
</script>

<template>
  <aside
    class="shrink-0 text-neutral-600 transition-[width] duration-200 dark:text-[#A3A3A3]"
    :class="getAppShellSidebarRailClass(isSidebarCollapsed)"
  >
    <div
      class="fixed left-0 top-[4.5rem] z-30 flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden border-r border-black/8 bg-white/70 px-3 pb-4 pt-3 backdrop-blur-md dark:border-white/[0.08] dark:bg-black/70"
      :class="getAppShellSidebarPanelClass(isSidebarCollapsed)"
    >
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-y-none">
        <AppShellNavigation
          :groups="props.groups"
          :collapsed="isSidebarCollapsed"
          :account-hackathon-navigation-mode="props.accountHackathonNavigationMode"
        />
      </div>

      <button
        type="button"
        class="mt-3 inline-flex size-8 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-black/6 hover:text-highlighted focus-visible:ring-2 focus-visible:ring-black/12 focus-visible:outline-none dark:text-[#8C8C8C] dark:hover:bg-[#1A1A1A] dark:hover:text-white dark:focus-visible:ring-white/[0.24]"
        :class="isSidebarCollapsed ? 'self-center' : 'self-start'"
        :aria-label="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :title="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleSidebarCollapse"
      >
        <AppIcon
          :name="isSidebarCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
          class="size-4"
        />
      </button>
    </div>
  </aside>
</template>
