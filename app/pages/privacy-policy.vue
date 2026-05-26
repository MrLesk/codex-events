<script setup lang="ts">
const { privacyPolicyDocument, status: documentsStatus } = useCurrentPlatformDocuments()

function formatLegalDate(value: string | undefined) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(value))
}

const lastUpdatedLabel = computed(() => formatLegalDate(privacyPolicyDocument.value?.publishedAt))

useSeoMeta({
  title: 'Privacy Policy | Codex Events',
  description: 'Read how Codex Events handles personal data.'
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
          Back to events
        </NuxtLink>

        <div class="mt-3 border-b border-black/8 pb-4 dark:border-white/[0.08]">
          <div class="space-y-3">
            <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              Privacy Policy
            </h1>
            <p class="text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              This policy explains how Codex Events processes personal data across account creation, event participation, judging, prize workflows, and support requests.
            </p>
            <div class="flex flex-wrap items-center gap-3 text-[13px] text-neutral-600 dark:text-[#A3A3A3]">
              <span v-if="lastUpdatedLabel">Last updated {{ lastUpdatedLabel }}</span>
            </div>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="relative z-10 max-w-[68rem] space-y-6 pb-10 pt-6 sm:pb-14">
      <AppAlert
        v-if="documentsStatus === 'pending'"
        color="neutral"
        variant="soft"
        title="Loading Privacy Policy"
        description="Fetching the current published Privacy Policy."
      />

      <AppAlert
        v-else-if="!privacyPolicyDocument"
        color="warning"
        variant="soft"
        title="Privacy Policy unavailable"
        description="The platform operator has not published a current Privacy Policy for this deployment."
      />

      <section
        v-if="privacyPolicyDocument"
        class="rounded-xl border border-black/8 bg-[#F7F7F8]/80 p-6 dark:border-white/[0.08] dark:bg-[#111111]/80"
      >
        <AppMarkdownRenderer
          :source="privacyPolicyDocument.content"
          normalize-escaped-newlines
        />
      </section>
    </AppContainer>
  </div>
</template>
