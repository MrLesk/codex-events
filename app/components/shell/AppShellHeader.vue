<script setup lang="ts">
import { buildAuthLoginHref } from '#shared/domains/accounts/auth-navigation'
import { buildProfileIconHref } from '~/domains/accounts/profile-icon'

const route = useRoute()
const user = useUser()
const { actor } = useSessionActor()

const authEntryHref = computed(() => buildAuthLoginHref(route.fullPath || '/'))
const profileName = computed(() => {
  if (actor.value.kind === 'platform_user') {
    return actor.value.platformUser.displayName
  }

  return user.value?.name ?? null
})

const profileAvatarSrc = computed(() => {
  if (actor.value.kind !== 'platform_user') {
    return undefined
  }

  const version = actor.value.platformUser.profileIconUpdatedAt

  if (!version) {
    return undefined
  }

  return buildProfileIconHref(actor.value.platformUser.id, version)
})
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-40 border-b border-black/8 bg-white/70 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-black/70">
    <div class="flex h-[4.5rem] items-center gap-3 px-4 sm:gap-4 sm:px-6">
      <NuxtLink
        to="/"
        class="group flex min-w-0 flex-1 items-center gap-3"
      >
        <img
          src="/android-chrome-192x192.png"
          srcset="/favicon-32x32.png 32w, /android-chrome-192x192.png 192w"
          sizes="(min-width: 640px) 44px, 36px"
          alt=""
          aria-hidden="true"
          class="size-9 shrink-0 rounded-xl sm:size-11"
        >
        <div class="min-w-0">
          <p class="truncate text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500 dark:text-[#8C8C8C]">
            Codex Community
          </p>
          <p class="truncate text-[17px] font-semibold tracking-[-0.01em] text-highlighted dark:text-white">
            Event Platform
          </p>
        </div>
      </NuxtLink>

      <div class="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
        <AppColorModeButton />

        <AppUserMenu
          v-if="user"
          :name="profileName"
          :email="user.email"
          :avatar-src="profileAvatarSrc"
          :avatar-alt="profileName"
        />

        <AppButton
          v-if="!user"
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
    aria-hidden="true"
    class="h-[4.5rem] shrink-0"
  />
</template>
