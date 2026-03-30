<script setup lang="ts">
import AppShellFooter from '~/components/shell/AppShellFooter.vue'
import AppShellHeader from '~/components/shell/AppShellHeader.vue'
import AppShellNavigation from '~/components/shell/AppShellNavigation.vue'
import { accountRegisterHref } from '~/utils/auth-navigation'

const { actor, hasPlatformAccount, sidebarGroups } = useShellNavigation()
const route = useRoute()

const sidebarCollapseStorageKey = 'codex-hackathons-sidebar-collapsed'
const isSidebarCollapsed = ref(false)

const showWorkspaceSidebar = computed(() =>
  hasPlatformAccount.value
)
const showIdentityAlert = computed(() => actor.value.kind === 'authenticated_identity')

function toggleSidebarCollapse() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

onMounted(() => {
  try {
    isSidebarCollapsed.value = localStorage.getItem(sidebarCollapseStorageKey) === 'true'
  } catch {
    // Ignore storage access failures and keep default collapsed state.
  }
})

watch(isSidebarCollapsed, (nextValue) => {
  try {
    localStorage.setItem(sidebarCollapseStorageKey, nextValue ? 'true' : 'false')
  } catch {
    // Ignore storage access failures and keep runtime state.
  }
})
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-foreground">
    <AppShellHeader />

    <div class="app-shell-scroll-region min-h-0 flex flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-none">
      <div class="relative flex items-start">
        <aside
          v-if="showWorkspaceSidebar"
          class="hidden shrink-0 self-stretch border-r border-black/8 bg-white/70 text-neutral-600 transition-[width] duration-200 dark:border-white/[0.08] dark:bg-black/70 dark:text-[#A3A3A3] lg:block"
          :class="[
            isSidebarCollapsed ? 'w-[68px] min-w-[68px]' : 'w-[260px] min-w-[260px]'
          ]"
        >
          <div
            class="sticky top-0 z-30 flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden px-3 pb-4 pt-3 backdrop-blur-md"
            :class="isSidebarCollapsed ? 'w-[68px]' : 'w-[260px]'"
          >
            <div class="min-h-0 flex-1 overflow-y-auto overscroll-y-none">
              <AppShellNavigation
                :groups="sidebarGroups"
                :collapsed="isSidebarCollapsed"
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

        <main class="min-w-0 flex-1 pb-10 lg:pb-14">
          <AppContainer
            v-if="showIdentityAlert && route.path !== accountRegisterHref"
            class="pt-6 lg:pt-8"
          >
            <AppAlert
              color="info"
              variant="soft"
              icon="i-lucide-id-card"
              class="mb-6 rounded-xl border border-info/20 bg-info/6"
              title="Finish your platform account before entering participant workflows"
              description="Accept the current platform Privacy Policy and Platform Terms to continue into account and participant workspaces."
            />
          </AppContainer>

          <slot />
        </main>
      </div>

      <AppShellFooter class="mt-auto" />
    </div>
  </div>
</template>
