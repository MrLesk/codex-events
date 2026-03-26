<script setup lang="ts">
import { buildAuthLoginHref } from '~/utils/auth-navigation'

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

  return `/api/account/profile-icon?v=${encodeURIComponent(version)}`
})
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-40 border-b border-black/8 bg-white/96 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-black/96">
    <div class="flex h-[4.5rem] items-center gap-4 px-6">
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
          :avatar-src="profileAvatarSrc"
          :avatar-alt="profileName"
        />

        <AppButton
          v-else
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
