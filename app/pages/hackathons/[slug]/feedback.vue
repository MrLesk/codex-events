<script setup lang="ts">
import {
  formatHackathonLocation,
  formatHackathonWindow,
  formatMaxTeamMembers,
  type PublicHackathon
} from '~/domains/hackathons/presentation'

import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'
import HackathonFeedbackForm from '~/components/public/hackathons/HackathonFeedbackForm.vue'

definePageMeta({
  layout: 'public'
})

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const {
  data: hackathonData,
  error: hackathonError
} = await useApiResponse<PublicHackathon>(() => `public-hackathon-feedback:${slug.value}`, () => `/api/public/hackathons/${slug.value}`, {
  watch: [slug]
})

if (hackathonError.value) {
  throw createError({
    statusCode: hackathonError.value.statusCode ?? hackathonError.value.status ?? 500,
    statusMessage: hackathonError.value.statusMessage ?? 'Unable to load the requested hackathon.'
  })
}

if (!hackathonData.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const hackathon = computed(() => hackathonData.value!)

if (hackathon.value.state !== 'completed') {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon feedback unavailable.'
  })
}

const detailBackgroundImageUrl = computed(() => {
  const backgroundImageUrl = hackathon.value.backgroundImageUrl?.trim()

  if (backgroundImageUrl) {
    return backgroundImageUrl
  }

  const bannerImageUrl = hackathon.value.bannerImageUrl?.trim()
  return bannerImageUrl || null
})
const detailBackgroundImageStyle = computed(() => detailBackgroundImageUrl.value
  ? { backgroundImage: `url(${JSON.stringify(detailBackgroundImageUrl.value)})` }
  : undefined)
const detailSummary = computed(() => [
  formatHackathonWindow(hackathon.value.registrationOpensAt, hackathon.value.submissionClosesAt),
  formatHackathonLocation(hackathon.value),
  formatMaxTeamMembers(hackathon.value.maxTeamMembers)
].join(' • '))

useSeoMeta({
  title: () => `Feedback | ${hackathon.value.name} | Codex Hackathons`,
  description: () => `Share post-hackathon feedback for ${hackathon.value.name}.`
})
</script>

<template>
  <div class="relative isolate pb-24">
    <div
      v-if="detailBackgroundImageUrl"
      class="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        class="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat opacity-55 blur-md saturate-125 contrast-105"
        :style="detailBackgroundImageStyle"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/68 dark:from-black/35 dark:via-black/55 dark:to-black/76" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.22),transparent_46%)] dark:bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.10),transparent_48%)]" />
    </div>

    <section class="relative z-10 border-b border-black/8 bg-white/52 backdrop-blur-lg dark:border-white/[0.08] dark:bg-black/56">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <NuxtLink
          :to="`/hackathons/${slug}`"
          class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-600 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
        >
          <AppIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          Back to hackathon
        </NuxtLink>

        <div class="mt-3 border-b border-black/8 pb-4 dark:border-white/[0.08]">
          <div class="space-y-2">
            <div class="min-w-0 flex flex-wrap items-center gap-3">
              <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                {{ hackathon.name }}
              </h1>
              <HackathonStateBadge
                :state="hackathon.state"
                :registration-opens-at="hackathon.registrationOpensAt"
                :registration-closes-at="hackathon.registrationClosesAt"
              />
            </div>

            <p class="text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              {{ detailSummary }}
            </p>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="relative z-10 max-w-[68rem] space-y-6 pt-6">
      <section class="rounded-xl border border-black/8 bg-[#F7F7F8]/85 p-6 dark:border-white/[0.08] dark:bg-[#111111]/82">
        <div class="mb-6 space-y-2 border-b border-black/8 pb-4 dark:border-white/[0.08]">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Post-Hackathon Feedback
          </p>
          <h2 class="text-[22px] font-semibold text-highlighted dark:text-white">
            Help us understand how this hackathon went
          </h2>
        </div>

        <HackathonFeedbackForm :hackathon-slug="slug" />
      </section>
    </AppContainer>
  </div>
</template>
