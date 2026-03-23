<script setup lang="ts">
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

const user = useUser()
const { actor, hasPlatformAccount, headerLinks, isResolvingActor, loginHref, roleChips, sidebarGroups } = useShellNavigation()
const title = 'Codex Hackathons'
const description = 'The internal platform for running Codex community hackathons with Auth0-backed platform authentication.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator color="var(--ui-primary)" />

    <div class="relative min-h-screen overflow-x-hidden">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,20,34,0.08),transparent_28%),radial-gradient(circle_at_70%_0%,rgba(79,91,112,0.12),transparent_28%)]" />

      <header class="sticky top-0 z-40 border-b border-default/70 bg-bg/75 backdrop-blur-2xl">
        <UContainer class="flex flex-wrap items-center gap-4 py-4">
          <NuxtLink
            to="/"
            class="group flex items-center gap-3"
          >
            <div class="flex size-11 items-center justify-center rounded-2xl border border-default/70 bg-elevated/90 shadow-[0_18px_48px_-34px_rgba(15,20,34,0.65)]">
              <span class="text-sm font-semibold tracking-[0.3em] text-highlighted">CH</span>
            </div>

            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Codex Community
              </p>
              <p class="text-base font-semibold tracking-[-0.03em] text-highlighted">
                Hackathon Platform
              </p>
            </div>
          </NuxtLink>

          <nav class="hidden min-w-0 flex-1 items-center justify-center gap-2 lg:flex">
            <UButton
              v-for="item in headerLinks"
              :key="item.id"
              :to="item.to"
              color="neutral"
              variant="ghost"
              class="rounded-full"
            >
              <template #leading>
                <UIcon
                  :name="item.icon"
                  class="size-4"
                />
              </template>
              {{ item.label }}
            </UButton>
          </nav>

          <nav class="flex w-full gap-2 overflow-x-auto pb-1 lg:hidden">
            <UButton
              v-for="item in headerLinks"
              :key="`${item.id}-mobile`"
              :to="item.to"
              color="neutral"
              variant="soft"
              size="sm"
              class="shrink-0 rounded-full"
            >
              <template #leading>
                <UIcon
                  :name="item.icon"
                  class="size-4"
                />
              </template>
              {{ item.label }}
            </UButton>
          </nav>

          <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
            <UBadge
              v-for="chip in roleChips"
              :key="chip"
              color="neutral"
              variant="soft"
              class="rounded-full px-3 py-1"
            >
              {{ chip }}
            </UBadge>

            <UBadge
              v-if="isResolvingActor"
              color="primary"
              variant="soft"
              class="rounded-full px-3 py-1"
            >
              Resolving workspace
            </UBadge>

            <UColorModeButton />

            <UButton
              v-if="user"
              to="/auth/logout"
              label="Sign out"
              color="primary"
              class="rounded-full"
            />
            <UButton
              v-else
              :to="loginHref"
              label="Sign in"
              color="primary"
              class="rounded-full"
            />
          </div>
        </UContainer>
      </header>

      <div class="relative">
        <UContainer class="py-6 lg:py-8">
          <UAlert
            v-if="actor.kind === 'authenticated_identity'"
            color="info"
            variant="soft"
            icon="i-lucide-id-card"
            class="mb-6 rounded-[1.5rem] border border-info/20 bg-info/6"
            title="Finish your platform account before entering participant workflows"
            description="Your Auth0 session is active, but the platform still needs the canonical platform-account record and exact-version document acceptance before protected workflow access expands."
          />

          <div class="flex gap-8">
            <aside
              v-if="hasPlatformAccount"
              class="hidden w-80 shrink-0 xl:block"
            >
              <div class="sticky top-[6.5rem] space-y-4">
                <AppShellNavigation :groups="sidebarGroups" />

                <UCard
                  variant="subtle"
                  :ui="{ root: 'rounded-[1.75rem] border border-default/70 bg-elevated/80 shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)] backdrop-blur' }"
                >
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Active identity
                  </p>
                  <div class="mt-4 flex items-center gap-3">
                    <UAvatar
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
                </UCard>
              </div>
            </aside>

            <main class="min-w-0 flex-1">
              <NuxtPage />
            </main>
          </div>
        </UContainer>
      </div>

      <footer class="border-t border-default/70 bg-bg/60 backdrop-blur-xl">
        <UContainer class="flex flex-col gap-4 py-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <p>
            Canonical shell for public discovery, participant entry, judging, administration, and redemption workflows.
          </p>

          <div class="flex items-center gap-3">
            <UAvatar
              v-if="user"
              :src="user.picture"
              :alt="user.name"
              size="sm"
            />
            <span>{{ user?.email ?? 'Signed out' }}</span>
          </div>
        </UContainer>
      </footer>
    </div>
  </UApp>
</template>
