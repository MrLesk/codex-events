<script setup lang="ts">
import type {
  PublicApiDataResponse,
  PublicHackathon
} from '~/composables/useHackathonPresentation'
import type { ApiDataResponse, HackathonRecord } from '~/utils/admin-workspace'
import type {
  ParticipantApiDataResponse,
  ParticipantApplicationTermsDocument,
  ParticipantCurrentTermsResponse
} from '~/utils/participant-application'

import { renderMarkdown } from '~/utils/markdown'
import { normalizeParticipantApiError, shouldShowPublicRegistrationEntry } from '~/utils/participant-application'

definePageMeta({
  layout: 'hackathon-detail',
  middleware: ['require-auth']
})

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())
const { actor: accountActor, status: accountActorStatus } = await useAccountLifecycleActor()

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const {
  data: hackathonResponse,
  error: hackathonError
} = await useFetch<PublicApiDataResponse<PublicHackathon>>(() => `/api/public/hackathons/${slug.value}`, {
  key: () => `public-hackathon-application-terms:${slug.value}`
})

if (hackathonError.value) {
  throw createError({
    statusCode: hackathonError.value.statusCode ?? hackathonError.value.status ?? 500,
    statusMessage: hackathonError.value.statusMessage ?? 'Unable to load the requested hackathon.'
  })
}

if (!hackathonResponse.value?.data) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const hackathon = computed(() => hackathonResponse.value!.data)
const registerHref = computed(() => `/hackathons/${slug.value}/register`)
const backHref = computed(() =>
  shouldShowPublicRegistrationEntry(
    hackathon.value.state,
    hackathon.value.registrationOpensAt,
    hackathon.value.registrationClosesAt
  )
    ? registerHref.value
    : `/hackathons/${slug.value}`
)
const backLabel = computed(() =>
  shouldShowPublicRegistrationEntry(
    hackathon.value.state,
    hackathon.value.registrationOpensAt,
    hackathon.value.registrationClosesAt
  )
    ? 'Back to registration'
    : 'Back to hackathon'
)
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
const headerStatePresentation = computed(() => getPublicHackathonStatePresentation(hackathon.value))
const headerStateLabel = computed(() => headerStatePresentation.value.label.toUpperCase())
const headerStateClass = computed(() => resolvePublicHackathonHeaderStateClass(hackathon.value))
const detailSummary = computed(() => [
  formatHackathonWindow(hackathon.value.registrationOpensAt, hackathon.value.submissionClosesAt),
  formatHackathonLocation(hackathon.value),
  formatMaxTeamMembers(hackathon.value.maxTeamMembers)
].join(' • '))

const workspaceErrorMessage = ref('')
const currentApplicationTerms = ref<ParticipantApplicationTermsDocument | null>(null)

if (accountActor.value?.kind === 'platform_user') {
  const requestFetch = import.meta.server ? useRequestFetch() : $fetch

  try {
    const visibleHackathonResponse = await requestFetch<ApiDataResponse<HackathonRecord>>(`/api/hackathons/slug/${slug.value}`)
    const currentTermsResponse = await requestFetch<ParticipantApiDataResponse<ParticipantCurrentTermsResponse>>(
      `/api/hackathons/${visibleHackathonResponse.data.id}/terms/current`
    )
    currentApplicationTerms.value = currentTermsResponse.data.application_terms
  } catch (error) {
    workspaceErrorMessage.value = normalizeParticipantApiError(error).message
  }
}

const applicationTermsHtml = computed(() => {
  const content = currentApplicationTerms.value?.content?.trim() ?? ''

  if (!content) {
    return ''
  }

  const normalizedMarkdown = content.replaceAll('\\n', '\n')
  return renderMarkdown(normalizedMarkdown, {
    stripLeadingHeading: true
  })
})
const termsPublishedLabel = computed(() => {
  if (!currentApplicationTerms.value) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(currentApplicationTerms.value.publishedAt))
})

useSeoMeta({
  title: () => `${hackathon.value.name} Application Terms | Codex Hackathons`,
  description: () => `Application terms for ${hackathon.value.name}.`
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
        class="hackathon-detail-background-media"
        :style="detailBackgroundImageStyle"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/68 dark:from-black/35 dark:via-black/55 dark:to-black/76" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.22),transparent_46%)] dark:bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.10),transparent_48%)]" />
    </div>

    <section class="relative z-10 border-b border-black/8 bg-white/52 backdrop-blur-lg dark:border-white/[0.08] dark:bg-black/56">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <NuxtLink
          :to="backHref"
          class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-600 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
        >
          <AppIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          {{ backLabel }}
        </NuxtLink>

        <div class="mt-3 border-b border-black/8 pb-4 dark:border-white/[0.08]">
          <div class="space-y-2">
            <div class="min-w-0 flex flex-wrap items-center gap-3">
              <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                {{ hackathon.name }}
              </h1>
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider"
                :class="headerStateClass"
              >
                {{ headerStateLabel }}
              </span>
            </div>

            <p class="text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              {{ detailSummary }}
            </p>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="relative z-10 max-w-[68rem] space-y-6 pb-10 pt-6 sm:pb-14">
      <AppAlert
        v-if="accountActorStatus === 'pending'"
        color="neutral"
        variant="soft"
        title="Loading application terms"
        description="Resolving your account and the current terms document."
      />

      <AppAlert
        v-else-if="workspaceErrorMessage"
        color="error"
        variant="soft"
        title="Application terms unavailable"
        :description="workspaceErrorMessage"
      />

      <AppAlert
        v-else-if="!currentApplicationTerms"
        color="warning"
        variant="soft"
        title="Application terms unavailable"
        description="Current application terms are not published for this hackathon."
      />

      <section
        v-else
        class="rounded-xl border border-black/8 bg-[#F7F7F8]/80 p-6 dark:border-white/[0.08] dark:bg-[#111111]/80"
      >
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-black/8 pb-4 dark:border-white/[0.08]">
          <div class="space-y-1">
            <h2 class="text-[20px] font-semibold text-highlighted dark:text-white">
              {{ currentApplicationTerms.title }}
            </h2>
            <p class="text-[12px] text-neutral-500 dark:text-[#8C8C8C]">
              Version {{ currentApplicationTerms.version }} · Published {{ termsPublishedLabel }}
            </p>
          </div>
        </div>

        <div
          class="hackathon-markdown"
          v-html="applicationTermsHtml"
        />
      </section>
    </AppContainer>
  </div>
</template>
