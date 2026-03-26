<script setup lang="ts">
import AppShellFooter from '~/components/shell/AppShellFooter.vue'
import AppShellHeader from '~/components/shell/AppShellHeader.vue'
import AppShellNavigation from '~/components/shell/AppShellNavigation.vue'

const { actor, hasPlatformAccount, sidebarGroups } = useShellNavigation()

const sidebarCollapseStorageKey = 'codex-hackathons-sidebar-collapsed'
const isSidebarCollapsed = ref(false)

const showWorkspaceSidebar = computed(() => hasPlatformAccount.value)
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

    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div class="relative flex items-stretch">
        <aside
          v-if="showWorkspaceSidebar"
          class="hidden shrink-0 text-[#A3A3A3] transition-[width] duration-200 xl:block"
          :class="isSidebarCollapsed ? 'w-[68px] min-w-[68px]' : 'w-[260px] min-w-[260px]'"
        >
          <div
            class="fixed left-0 top-[4.5rem] z-30 flex h-[calc(100vh-4.5rem)] flex-col border-r border-white/[0.08] bg-black px-3 pb-4 pt-3"
            :class="isSidebarCollapsed ? 'w-[68px]' : 'w-[260px]'"
          >
            <div class="min-h-0 flex-1 overflow-y-auto">
              <AppShellNavigation
                :groups="sidebarGroups"
                :collapsed="isSidebarCollapsed"
              />
            </div>

            <button
              type="button"
              class="mt-3 inline-flex size-8 items-center justify-center rounded-md text-[#8C8C8C] transition-colors hover:bg-[#1A1A1A] hover:text-white focus-visible:ring-2 focus-visible:ring-white/[0.24] focus-visible:outline-none"
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
            v-if="showIdentityAlert"
            class="pt-6 lg:pt-8"
          >
            <AppAlert
              color="info"
              variant="soft"
              icon="i-lucide-id-card"
              class="mb-6 rounded-xl border border-info/20 bg-info/6"
              title="Finish your platform account before entering participant workflows"
              description="Your Auth0 session is active, but the platform account record is missing. Sign out and sign back in to trigger automatic account provisioning from Auth0 consent claims."
            />
          </AppContainer>

          <slot />
        </main>
      </div>

      <AppShellFooter />
    </div>
  </div>
</template>
