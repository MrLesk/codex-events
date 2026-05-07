<script setup lang="ts">
import AccountEventOrganizerRosterPanel from '~/components/account/AccountEventOrganizerRosterPanel.vue'

definePageMeta({
  middleware: ['require-platform-admin']
})

useSeoMeta({
  title: 'Event Organizers | Codex Hackathons',
  description: 'Review the current event organizers and grant hackathon creation access.'
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
              Event organizers
            </h1>
            <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              Grant hackathon creation access without granting platform-wide admin visibility.
            </p>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] pt-6">
      <AccountEventOrganizerRosterPanel />
    </AppContainer>
  </div>
</template>
