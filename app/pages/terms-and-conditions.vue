<script setup lang="ts">
const { platformTermsDocument, status: documentsStatus } = useCurrentPlatformDocuments()
const { settings } = usePlatformLegalSettings()

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

const lastUpdatedLabel = computed(() => formatLegalDate(platformTermsDocument.value?.publishedAt))

useSeoMeta({
  title: 'Terms and Conditions | Codex Events',
  description: 'Read the rules for using Codex Events.'
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
              Terms and Conditions
            </h1>
            <p class="text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              These terms define the baseline rules for using the Codex Events platform and explain how platform-level rules interact with event-specific documents.
            </p>
            <div class="flex flex-wrap items-center gap-3 text-[13px] text-neutral-600 dark:text-[#A3A3A3]">
              <span v-if="lastUpdatedLabel">Last updated {{ lastUpdatedLabel }}</span>
              <span
                v-if="lastUpdatedLabel && settings?.supportEmail"
                class="hidden sm:inline"
              >•</span>
              <a
                v-if="settings?.supportEmail"
                :href="`mailto:${settings.supportEmail}`"
                class="transition-colors hover:text-highlighted dark:hover:text-white"
              >
                {{ settings.supportEmail }}
              </a>
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
        title="Loading Platform Terms"
        description="Fetching the current published Platform Terms."
      />

      <AppAlert
        v-else-if="!platformTermsDocument"
        color="warning"
        variant="soft"
        title="Platform Terms unavailable"
        description="The platform operator has not published current Platform Terms for this deployment."
      />

      <section
        v-if="platformTermsDocument"
        class="rounded-xl border border-black/8 bg-[#F7F7F8]/80 p-6 dark:border-white/[0.08] dark:bg-[#111111]/80"
      >
        <AppMarkdownRenderer
          :source="platformTermsDocument.content"
          normalize-escaped-newlines
        />
      </section>
    </AppContainer>
  </div>
</template>
