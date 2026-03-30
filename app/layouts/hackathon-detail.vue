<script setup lang="ts">
import AppShellFooter from '~/components/shell/AppShellFooter.vue'
import AppShellHeader from '~/components/shell/AppShellHeader.vue'
import AppShellSidebar from '~/components/shell/AppShellSidebar.vue'

const { sidebarGroups } = useShellNavigation()
const route = useRoute()

const isAccountRoute = computed(() =>
  route.path === '/account' || route.path.startsWith('/account/')
)
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-foreground">
    <AppShellHeader />

    <div class="app-shell-scroll-region min-h-0 flex flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-none">
      <div class="relative flex items-stretch">
        <AppShellSidebar
          v-if="isAccountRoute"
          :groups="sidebarGroups"
        />

        <main class="relative min-w-0 flex-1">
          <slot />
        </main>
      </div>

      <AppShellFooter class="mt-auto" />
    </div>
  </div>
</template>
