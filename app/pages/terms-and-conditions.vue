<script setup lang="ts">
import { renderMarkdown } from '~/utils/markdown'
import {
  platformLegalLastUpdatedLabel,
  platformSupportEmail,
  platformTermsMarkdown
} from '#platform-legal'

const termsHtml = computed(() => renderMarkdown(platformTermsMarkdown))

useSeoMeta({
  title: 'Terms and Conditions',
  description: 'Terms and Conditions for using the Codex Hackathons platform.'
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
          <div class="space-y-3">
            <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              Terms and Conditions
            </h1>
            <p class="text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              These terms define the baseline rules for using the Codex Hackathons platform and explain how platform-level rules interact with hackathon-specific documents.
            </p>
            <div class="flex flex-wrap items-center gap-3 text-[13px] text-neutral-600 dark:text-[#A3A3A3]">
              <span>Last updated {{ platformLegalLastUpdatedLabel }}</span>
              <span class="hidden sm:inline">•</span>
              <a
                :href="`mailto:${platformSupportEmail}`"
                class="transition-colors hover:text-highlighted dark:hover:text-white"
              >
                {{ platformSupportEmail }}
              </a>
            </div>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="relative z-10 max-w-[68rem] space-y-6 pb-10 pt-6 sm:pb-14">
      <section class="rounded-xl border border-black/8 bg-[#F7F7F8]/80 p-6 dark:border-white/[0.08] dark:bg-[#111111]/80">
        <div
          class="hackathon-markdown"
          v-html="termsHtml"
        />
      </section>
    </AppContainer>
  </div>
</template>
