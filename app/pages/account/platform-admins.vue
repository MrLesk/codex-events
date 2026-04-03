<script setup lang="ts">
import AccountPlatformAdminRosterPanel from '~/components/account/AccountPlatformAdminRosterPanel.vue'

definePageMeta({
  layout: 'profile',
  middleware: ['require-platform-admin']
})

useSeoMeta({
  title: 'Platform Admins | Codex Hackathons',
  description: 'Review the current platform admins and grant platform-wide admin access.'
})
</script>

<template>
  <div class="pb-14">
    <section class="border-b border-black/8 dark:border-white/[0.08]">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <div class="space-y-3 pb-4">
          <NuxtLink
            to="/account/admin"
            class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-700 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
          >
            <AppIcon
              name="i-lucide-chevron-left"
              class="size-4"
            />
            <span>Back to Admin dashboard</span>
          </NuxtLink>

          <div class="space-y-2">
            <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              Platform admins
            </h1>
            <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              Keep the platform-admin roster current and grant platform-wide access from one account workspace surface.
            </p>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] pt-6">
      <AccountPlatformAdminRosterPanel />
    </AppContainer>
  </div>
</template>
