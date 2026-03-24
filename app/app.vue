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
const { actor, hasPlatformAccount, loginHref, sidebarGroups } = useShellNavigation()
const title = 'Codex Hackathons'
const description = 'The internal platform for running Codex community hackathons with Auth0-backed platform authentication.'
const isHomepage = computed(() => route.path === '/')
const isPublicHackathonDetailRoute = computed(() => /^\/hackathons\/[^/]+\/?$/.test(route.path))
const usesPublicShell = computed(() => isHomepage.value || isPublicHackathonDetailRoute.value || route.path === '/privacy-policy')
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

  return 'py-6 lg:py-8'
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

  <div
    class="relative min-h-screen overflow-x-hidden"
    :class="usesPublicShell ? 'text-foreground' : ''"
  >
    <div
      v-if="!usesPublicShell"
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,20,34,0.08),transparent_28%),radial-gradient(circle_at_70%_0%,rgba(79,91,112,0.12),transparent_28%)]"
    />

    <header
      class="sticky top-0 z-40 border-b backdrop-blur-2xl"
      :class="usesPublicShell ? 'border-black/8 bg-white/96 dark:border-white/[0.08] dark:bg-black/96' : 'border-default/70 bg-bg/75'"
    >
      <AppContainer class="flex items-center gap-4 py-4">
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
            v-else
            :to="loginHref"
            external
            label="Sign in"
            color="neutral"
            variant="soft"
            class="rounded-full"
          />
        </div>
      </AppContainer>
    </header>

    <div class="relative">
      <AppContainer :class="pageContainerClass">
        <AppAlert
          v-if="showIdentityAlert"
          color="info"
          variant="soft"
          icon="i-lucide-id-card"
          class="mb-6 rounded-[1.5rem] border border-info/20 bg-info/6"
          title="Finish your platform account before entering participant workflows"
          description="Your Auth0 session is active, but the platform still needs the canonical platform-account record and exact-version document acceptance before protected workflow access expands."
        />

        <div class="flex gap-8">
          <aside
            v-if="showWorkspaceSidebar"
            class="hidden w-80 shrink-0 xl:block"
          >
            <div class="sticky top-[6.5rem] space-y-4">
              <AppShellNavigation :groups="sidebarGroups" />

              <AppCard
                variant="subtle"
                :ui="{ root: 'rounded-[1.75rem] border border-default/70 bg-elevated/80 shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)] backdrop-blur' }"
              >
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Active identity
                </p>
                <div class="mt-4 flex items-center gap-3">
                  <AppAvatar
                    :src="user?.picture"
                    :alt="user?.name"
                    size="lg"
                  />
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-highlighted">
                      {{ actor.kind === 'platform_user' ? actor.platformUser.displayName : user?.name }}
                    </p>
                    <p class="truncate text-xs text-muted">
                      {{ user?.email ?? 'Signed in' }}
                    </p>
                  </div>
                </div>
              </AppCard>
            </div>
          </aside>

          <main class="min-w-0 flex-1">
            <NuxtPage />
          </main>
        </div>
      </AppContainer>
    </div>

    <footer
      class="border-t backdrop-blur-xl"
      :class="usesPublicShell ? 'border-black/8 bg-white dark:border-white/[0.08] dark:bg-black' : 'border-default/70 bg-bg/60'"
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
