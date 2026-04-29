<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'
import type {
  ParticipantApiDataResponse,
  ParticipantApplicationTermsDocument,
  ParticipantCurrentTermsResponse,
  VisibleHackathonRecord
} from '~/domains/applications/participant-application'

import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'
import { normalizeParticipantApiError, shouldShowPublicRegistrationEntry } from '~/domains/applications/participant-application'

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
  data: hackathonData,
  error: hackathonError
} = await useApiResponse<PublicHackathon>(() => `public-hackathon-application-terms:${slug.value}`, () => `/api/public/hackathons/${slug.value}`, {
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
const detailSummary = computed(() => [
  formatHackathonWindow(hackathon.value.registrationOpensAt, hackathon.value.submissionClosesAt),
  formatHackathonLocation(hackathon.value),
  formatMaxTeamMembers(hackathon.value.maxTeamMembers)
].join(' • '))

const accountActorCacheKey = computed(() => {
  if (accountActor.value.kind !== 'platform_user') {
    return accountActor.value.kind
  }

  return `${accountActor.value.platformUser.id}:${accountActor.value.hasAcceptedCurrentPlatformDocuments ? 'accepted' : 'unaccepted'}`
})
const applicationTermsState = await useApiData<{
  currentApplicationTerms: ParticipantApplicationTermsDocument | null
  workspaceErrorMessage: string
}>(
  () => `public-hackathon-application-terms-document:${slug.value}:${accountActorCacheKey.value}`,
  async ({ apiFetch, signal }) => {
    if (accountActor.value.kind !== 'platform_user' || !accountActor.value.hasAcceptedCurrentPlatformDocuments) {
      return {
        currentApplicationTerms: null,
        workspaceErrorMessage: ''
      }
    }

    try {
      const visibleHackathonResponse = await apiFetch<ParticipantApiDataResponse<VisibleHackathonRecord>>(
        `/api/hackathons/slug/${slug.value}`,
        {
          signal
        }
      )
      const currentTermsResponse = await apiFetch<ParticipantApiDataResponse<ParticipantCurrentTermsResponse>>(
        `/api/hackathons/${visibleHackathonResponse.data.id}/terms/current`,
        {
          signal
        }
      )

      return {
        currentApplicationTerms: currentTermsResponse.data.application_terms,
        workspaceErrorMessage: ''
      }
    } catch (error) {
      return {
        currentApplicationTerms: null,
        workspaceErrorMessage: normalizeParticipantApiError(error).message
      }
    }
  },
  {
    default: () => ({
      currentApplicationTerms: null,
      workspaceErrorMessage: ''
    }),
    watch: [slug, accountActorCacheKey]
  }
)
const currentApplicationTerms = computed(() => applicationTermsState.data.value.currentApplicationTerms)
const workspaceErrorMessage = computed(() => applicationTermsState.data.value.workspaceErrorMessage)

const applicationTermsMarkdown = computed(() => {
  const content = currentApplicationTerms.value?.content?.trim() ?? ''
  return content.replaceAll('\\n', '\n')
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
  title: () => `Application Terms | ${hackathon.value.name} | Codex Hackathons`,
  description: () => `Read the application terms for ${hackathon.value.name}.`
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

        <AppMarkdownRenderer
          :source="applicationTermsMarkdown"
          strip-leading-heading
        />
      </section>
    </AppContainer>
  </div>
</template>
