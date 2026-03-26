<script setup lang="ts">
import { Toaster as UiSonner } from '~/components/ui/sonner'
import AppShellNavigation from '~/components/shell/AppShellNavigation.vue'

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const route = useRoute()
const user = useUser()
const { actor, authEntryHref, hasPlatformAccount, sidebarGroups } = useShellNavigation()
const title = 'Codex Hackathons'
const description = 'The internal platform for running Codex community hackathons with Auth0-backed platform authentication.'
const isHomepage = computed(() => route.path === '/')
const isPublicHackathonDetailRoute = computed(() => /^\/hackathons\/[^/]+\/?$/.test(route.path))
const isAuthAccessRoute = computed(() => route.path === '/auth/access')
const usesPublicShell = computed(() =>
  isHomepage.value
  || isPublicHackathonDetailRoute.value
  || isAuthAccessRoute.value
  || route.path === '/privacy-policy'
)
const showWorkspaceSidebar = computed(() => hasPlatformAccount.value && !usesPublicShell.value)
const showIdentityAlert = computed(() => actor.value.kind === 'authenticated_identity' && !usesPublicShell.value)
const profileName = computed(() => {
  if (actor.value.kind === 'platform_user') {
    return actor.value.platformUser.displayName
  }

  return user.value?.name ?? null
})
const pageContainerClass = computed(() => {
  if (isPublicHackathonDetailRoute.value) {
    return 'pt-0 pb-6 lg:pb-8'
  }

  return 'py-0'
})

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <NuxtLoadingIndicator color="var(--primary)" />

  <div class="min-h-screen overflow-x-hidden text-foreground">
    <header
      class="sticky top-0 z-40 border-b bg-white/96 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-black/96"
      :class="usesPublicShell ? 'border-black/8' : 'border-black/8 dark:border-white/[0.08]'"
    >
      <div class="flex items-center gap-4 px-6 py-4">
        <NuxtLink
          to="/"
          class="group flex items-center"
        >
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500 dark:text-[#8C8C8C]">
              Codex Community
            </p>
            <p class="text-[17px] font-semibold tracking-[-0.01em] text-highlighted dark:text-white">
              Hackathon Platform
            </p>
          </div>
        </NuxtLink>

        <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
          <AppColorModeButton />

          <AppUserMenu
            v-if="user"
            :name="profileName"
            :email="user.email"
          />

          <AppButton
            v-else-if="!isAuthAccessRoute"
            :to="authEntryHref"
            external
            label="Sign in"
            color="neutral"
            variant="soft"
            class="rounded-full"
          />
        </div>
      </div>
    </header>

    <div
      v-if="usesPublicShell"
      class="relative"
    >
      <AppContainer :class="pageContainerClass">
        <NuxtPage />
      </AppContainer>
    </div>

    <div
      v-else
      class="relative flex"
    >
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
                  {{ actor.kind === 'platform_user' ? actor.platformUser.displayName : user?.name }}
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
        <AppContainer class="pt-6 lg:pt-8">
          <AppAlert
            v-if="showIdentityAlert"
            color="info"
            variant="soft"
            icon="i-lucide-id-card"
            class="mb-6 rounded-xl border border-info/20 bg-info/6"
            title="Finish your platform account before entering participant workflows"
            description="Your Auth0 session is active, but the platform still needs the canonical platform-account record and exact-version document acceptance before protected workflow access expands."
          />

          <NuxtPage />
        </AppContainer>
      </main>
    </div>

    <footer
      class="border-t bg-white dark:border-white/[0.08] dark:bg-black"
      :class="usesPublicShell ? 'border-black/8' : 'border-black/8 dark:border-white/[0.08]'"
    >
      <AppContainer class="flex items-center justify-end py-6 text-sm text-neutral-700 dark:text-[#A3A3A3]">
        <NuxtLink
          to="/privacy-policy"
          class="transition-colors hover:text-highlighted dark:hover:text-white"
        >
          Privacy Policy
        </NuxtLink>
      </AppContainer>
    </footer>
  </div>

  <UiSonner
    position="top-right"
    rich-colors
    close-button
  />
</template>
