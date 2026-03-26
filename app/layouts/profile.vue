<script setup lang="ts">
import AppShellFooter from '~/components/shell/AppShellFooter.vue'
import AppShellHeader from '~/components/shell/AppShellHeader.vue'
import AppShellNavigation from '~/components/shell/AppShellNavigation.vue'

const user = useUser()
const { actor, hasPlatformAccount, sidebarGroups } = useShellNavigation()

const showWorkspaceSidebar = computed(() => hasPlatformAccount.value)
const showIdentityAlert = computed(() => actor.value.kind === 'authenticated_identity')
const profileName = computed(() => {
  if (actor.value.kind === 'platform_user') {
    return actor.value.platformUser.displayName
  }

  return user.value?.name ?? null
})
</script>

<template>
  <div class="min-h-screen overflow-x-hidden text-foreground">
    <AppShellHeader />

    <div class="relative flex">
      <aside
        v-if="showWorkspaceSidebar"
        class="hidden w-[260px] min-w-[260px] shrink-0 xl:block"
      >
        <div class="sticky top-[4.5rem] flex min-h-[calc(100vh-5rem)] flex-col overflow-y-auto border-r border-white/[0.08] bg-black px-4 pb-6 pt-4 text-[#A3A3A3]">
          <AppShellNavigation :groups="sidebarGroups" />

          <div class="mt-auto border-t border-white/[0.08] pt-5">
            <p class="text-[11px] font-semibold tracking-[0.02em] text-[#8C8C8C] uppercase">
              Active identity
            </p>
            <div class="mt-3 flex items-center gap-3">
              <AppAvatar
                :src="user?.picture"
                :alt="user?.name"
                size="lg"
              />
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-white">
                  {{ profileName }}
                </p>
                <p class="truncate text-xs text-[#8C8C8C]">
                  {{ user?.email ?? 'Signed in' }}
                </p>
              </div>
            </div>
          </div>
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
            description="Your Auth0 session is active, but the platform still needs the canonical platform-account record and exact-version document acceptance before protected workflow access expands."
          />
        </AppContainer>

        <slot />
      </main>
    </div>

    <AppShellFooter />
  </div>
</template>
