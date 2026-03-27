<script setup lang="ts">
import type {
  PublicApiDataResponse,
  PublicApiListResponse,
  PublicHackathon,
  PublicPrize
} from '~/composables/useHackathonPresentation'

import HackathonPrizeList from '~/components/public/hackathons/HackathonPrizeList.vue'
import HackathonTimeline from '~/components/public/hackathons/HackathonTimeline.vue'
import { renderMarkdown } from '~/utils/markdown'
import {
  buildAccountSettingsHref,
  buildAuthLoginHref
} from '~/utils/auth-navigation'

definePageMeta({
  layout: 'public'
})

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())
const { actor: accountActor } = await useAccountLifecycleActor()

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const [
  { data: hackathonResponse, error: hackathonError },
  { data: criteriaResponse },
  { data: prizesResponse, error: prizesError }
] = await Promise.all([
  useFetch<PublicApiDataResponse<PublicHackathon>>(() => `/api/public/hackathons/${slug.value}`, {
    key: () => `public-hackathon-detail:${slug.value}`
  }),
  useFetch<PublicApiListResponse<{ name: string }>>(() => `/api/public/hackathons/${slug.value}/evaluation-criteria`, {
    key: () => `public-hackathon-criteria:${slug.value}`
  }),
  useFetch<PublicApiListResponse<PublicPrize>>(() => `/api/public/hackathons/${slug.value}/prizes`, {
    key: () => `public-hackathon-prizes:${slug.value}`
  })
])

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
const criteria = computed(() => criteriaResponse.value?.data ?? [])
const prizes = computed(() => prizesResponse.value?.data ?? [])
const prizesErrorMessage = computed(() => prizesError.value ? 'Published awards could not be loaded right now.' : undefined)
const registerRouteHref = computed(() => `/hackathons/${slug.value}/register`)
const registerEntryHref = computed(() => buildAuthLoginHref(registerRouteHref.value))

const headerStateLabel = computed(() => formatHackathonStateLabel(hackathon.value.state).toUpperCase())
const headerStateClass = computed(() => {
  if (hackathon.value.state === 'submission_open') {
    return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
  }

  if (hackathon.value.state === 'registration_open') {
    return 'border border-sky-600/35 bg-sky-500/16 text-sky-800 dark:border-sky-400/35 dark:bg-sky-500/14 dark:text-sky-300'
  }

  if (hackathon.value.state === 'winners_announced') {
    return 'bg-green-500/10 text-green-400 border border-green-500/20'
  }

  return 'bg-white/[0.05] text-[#A3A3A3] border border-white/[0.08]'
})
const criteriaCount = computed(() => criteria.value.length)
const detailBackgroundImageUrl = computed(() => {
  const backgroundImageUrl = hackathon.value.backgroundImageUrl?.trim()

  if (backgroundImageUrl) {
    return backgroundImageUrl
  }

  const bannerImageUrl = hackathon.value.bannerImageUrl?.trim()
  return bannerImageUrl || null
})
const detailSummary = computed(() => [
  formatHackathonWindow(hackathon.value.registrationOpensAt, hackathon.value.submissionClosesAt),
  hackathon.value.city,
  formatMaxTeamMembers(hackathon.value.maxTeamMembers)
].join(' • '))
const sortedAgendaItems = computed(() =>
  [...(hackathon.value.agendaItems ?? [])]
    .sort((left, right) => left.displayOrder - right.displayOrder || left.startsAt.localeCompare(right.startsAt))
)
const showRegisterCta = computed(() => true)
const descriptionMarkdown = computed(() => hackathon.value.description?.trim() ?? '')
const descriptionHtml = computed(() => descriptionMarkdown.value ? renderMarkdown(descriptionMarkdown.value) : '')
const seoDescription = computed(() => hackathon.value.description
  .replace(/`([^`]+)`/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/[*_#>-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim())
const isRegisterHrefExternal = computed(() => accountActor.value?.kind === 'anonymous')
const registerHref = computed(() => {
  if (accountActor.value?.kind === 'anonymous') {
    return registerEntryHref.value
  }

  if (accountActor.value?.kind === 'authenticated_identity') {
    return buildAccountSettingsHref(registerRouteHref.value)
  }

  return registerRouteHref.value
})

const activePublicSection = ref<'overview' | 'prizes' | 'details'>('overview')

const agendaDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

function formatAgendaWindow(startsAt: string, endsAt: string | null) {
  const startLabel = agendaDateTimeFormatter.format(new Date(startsAt))

  if (!endsAt) {
    return startLabel
  }

  const endLabel = agendaDateTimeFormatter.format(new Date(endsAt))
  return `${startLabel} - ${endLabel}`
}

useSeoMeta({
  title: () => `${hackathon.value.name} | Codex Hackathons`,
  description: () => seoDescription.value
})
</script>

<template>
  <div class="relative isolate pb-24">
    <div
      v-if="detailBackgroundImageUrl"
      class="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <img
        :src="detailBackgroundImageUrl"
        :alt="`${hackathon.name} background`"
        class="h-full w-full scale-110 object-cover opacity-55 blur-md saturate-125 contrast-105"
      >
      <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/68 dark:from-black/35 dark:via-black/55 dark:to-black/76" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.22),transparent_46%)] dark:bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.10),transparent_48%)]" />
    </div>

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

        <div class="mt-3 border-b border-black/8 pb-0 dark:border-white/[0.08]">
          <div class="space-y-2 pb-4">
            <div class="flex items-start justify-between gap-6">
              <div class="min-w-0 flex flex-wrap items-center gap-3">
                <h1
                  data-testid="public-hackathon-detail-title"
                  class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white"
                >
                  {{ hackathon.name }}
                </h1>
                <span
                  class="rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider"
                  :class="headerStateClass"
                >
                  {{ headerStateLabel }}
                </span>
              </div>

              <div
                v-if="showRegisterCta"
                class="shrink-0 pt-0.5"
              >
                <AppButton
                  :to="registerHref"
                  :external="isRegisterHrefExternal"
                  color="neutral"
                  variant="solid"
                  class="h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                >
                  Register
                  <template #trailing>
                    <AppIcon
                      name="i-lucide-arrow-up-right"
                      class="size-3.5"
                    />
                  </template>
                </AppButton>
              </div>
            </div>

            <p class="text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              {{ detailSummary }}
            </p>
          </div>

          <nav
            aria-label="Hackathon detail sections"
            role="tablist"
            class="flex items-center gap-5 overflow-x-auto"
          >
            <button
              id="public-tab-overview"
              type="button"
              role="tab"
              :aria-selected="activePublicSection === 'overview'"
              aria-controls="public-tab-panel-overview"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activePublicSection === 'overview' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="activePublicSection = 'overview'"
            >
              Overview
            </button>
            <button
              id="public-tab-prizes"
              type="button"
              role="tab"
              :aria-selected="activePublicSection === 'prizes'"
              aria-controls="public-tab-panel-prizes"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activePublicSection === 'prizes' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="activePublicSection = 'prizes'"
            >
              Prizes
            </button>
            <button
              id="public-tab-details"
              type="button"
              role="tab"
              :aria-selected="activePublicSection === 'details'"
              aria-controls="public-tab-panel-details"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activePublicSection === 'details' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="activePublicSection = 'details'"
            >
              Details
            </button>
          </nav>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="relative z-10 max-w-[68rem] pt-6">
      <section
        v-if="activePublicSection === 'overview'"
        id="public-tab-panel-overview"
        role="tabpanel"
        aria-labelledby="public-tab-overview"
        class="space-y-7"
      >
        <section
          v-if="descriptionHtml"
          class="rounded-xl border border-black/8 bg-[#F7F7F8]/90 p-6 dark:border-white/[0.08] dark:bg-[#111111]/86"
        >
          <div
            class="hackathon-markdown"
            v-html="descriptionHtml"
          />
        </section>

        <section
          v-else
          class="rounded-xl border border-dashed border-black/10 bg-white p-8 text-center dark:border-white/[0.08] dark:bg-[#111111]"
        >
          <p class="text-[15px] font-medium text-highlighted dark:text-white">
            Overview will appear here once published.
          </p>
        </section>
      </section>

      <section
        v-else-if="activePublicSection === 'prizes'"
        id="public-tab-panel-prizes"
        role="tabpanel"
        aria-labelledby="public-tab-prizes"
      >
        <HackathonPrizeList
          :prizes="prizes"
          :error-message="prizesErrorMessage"
        />
      </section>

      <section
        v-else
        id="public-tab-panel-details"
        role="tabpanel"
        aria-labelledby="public-tab-details"
        class="space-y-7"
      >
        <HackathonTimeline
          :hackathon="hackathon"
          :criteria-count="criteriaCount"
        />

        <section
          v-if="sortedAgendaItems.length > 0"
          class="rounded-xl border border-black/8 bg-white/70 p-6 dark:border-white/[0.08] dark:bg-black/36"
        >
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-highlighted dark:text-white">
              Agenda
            </h2>
            <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
              Event schedule maintained as structured agenda items.
            </p>
          </div>

          <ol class="space-y-3">
            <li
              v-for="item in sortedAgendaItems"
              :key="item.id"
              class="rounded-lg border border-black/8 bg-white/80 p-4 dark:border-white/[0.08] dark:bg-black/28"
            >
              <p class="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-[#8C8C8C]">
                {{ formatAgendaWindow(item.startsAt, item.endsAt) }}
              </p>
              <p class="mt-1 text-base font-medium text-highlighted dark:text-white">
                {{ item.title }}
              </p>
              <p
                v-if="item.details"
                class="mt-1 text-sm text-neutral-600 dark:text-[#A3A3A3]"
              >
                {{ item.details }}
              </p>
            </li>
          </ol>
        </section>
      </section>
    </AppContainer>
  </div>
</template>
