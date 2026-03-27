<script setup lang="ts">
import { renderMarkdown } from '~/utils/markdown'

const privacyMarkdown = `
## What the platform stores

Depending on your role and activity, the platform may store account details, hackathon applications, team membership, submissions, judging activity, and prize redemption records.

## Why the platform stores it

This information is used to operate hackathon programs, enforce workflow permissions, preserve auditability, and keep an exact record of document acceptance tied to platform and hackathon workflows.

## Current policy documents

The exact privacy-policy document accepted for platform use is managed inside the product and referenced from the Auth0 signup experience.
`.trim()

const privacyHtml = computed(() => renderMarkdown(privacyMarkdown))

useSeoMeta({
  title: 'Privacy Policy',
  description: 'Overview of how the Codex Hackathons platform handles participant and program data.'
})
</script>

<template>
  <div class="relative isolate pb-24">
    <section class="relative z-10 border-b border-black/8 bg-white/52 backdrop-blur-lg dark:border-white/[0.08] dark:bg-black/56">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-600 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
        >
          <AppIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          Back to hackathons
        </NuxtLink>

        <div class="mt-3 border-b border-black/8 pb-4 dark:border-white/[0.08]">
          <div class="space-y-2">
            <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              Privacy Policy
            </h1>
            <p class="text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              This platform processes the information needed to run Codex community hackathons, manage participation, support judging, and administer prize redemption workflows.
            </p>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="relative z-10 max-w-[68rem] space-y-6 pb-10 pt-6 sm:pb-14">
      <section class="rounded-xl border border-black/8 bg-[#F7F7F8]/80 p-6 dark:border-white/[0.08] dark:bg-[#111111]/80">
        <div
          class="hackathon-markdown"
          v-html="privacyHtml"
        />
      </section>
    </AppContainer>
  </div>
</template>
