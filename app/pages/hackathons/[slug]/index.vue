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
import { shouldShowPublicRegistrationEntry } from '~/utils/participant-application'
import { normalizeTabQueryValue, resolveTabQueryValue } from '~/utils/tab-query'
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
  { data: prizesResponse }
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
const hasPublishedPrizes = computed(() => prizes.value.length > 0)
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
const detailBackgroundImageStyle = computed(() => detailBackgroundImageUrl.value
  ? { backgroundImage: `url(${JSON.stringify(detailBackgroundImageUrl.value)})` }
  : undefined)
const detailSummary = computed(() => [
  formatHackathonWindow(hackathon.value.registrationOpensAt, hackathon.value.submissionClosesAt),
  hackathon.value.city,
  formatMaxTeamMembers(hackathon.value.maxTeamMembers)
].join(' • '))
const sortedAgendaItems = computed(() =>
  [...(hackathon.value.agendaItems ?? [])]
    .sort((left, right) => left.displayOrder - right.displayOrder || left.startsAt.localeCompare(right.startsAt))
)
const showAgendaDayContext = computed(() => shouldShowAgendaDayContext(sortedAgendaItems.value))
const agendaEntries = computed(() =>
  sortedAgendaItems.value.map(item => ({
    ...item,
    presentation: getAgendaItemPresentation(item, showAgendaDayContext.value)
  }))
)
const showRegisterCta = computed(() => shouldShowPublicRegistrationEntry(hackathon.value.state))
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

const publicSectionTabs = ['overview', 'prizes', 'details'] as const
type PublicSectionTab = (typeof publicSectionTabs)[number]
const activePublicSection = computed<PublicSectionTab>(() =>
  resolveTabQueryValue(route.query.tab, publicSectionTabs, 'overview')
)

async function selectPublicSection(nextSection: PublicSectionTab) {
  if (normalizeTabQueryValue(route.query.tab) === nextSection) {
    return
  }

  await navigateTo({
    path: route.path,
    query: {
      ...route.query,
      tab: nextSection
    },
    hash: route.hash
  })
}

watchEffect(() => {
  if (activePublicSection.value !== 'prizes' || hasPublishedPrizes.value) {
    return
  }

  void navigateTo({
    path: route.path,
    query: {
      ...route.query,
      tab: 'overview'
    },
    hash: route.hash
  }, { replace: true })
})

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
              @click="void selectPublicSection('overview')"
            >
              Overview
            </button>
            <button
              v-if="hasPublishedPrizes"
              id="public-tab-prizes"
              type="button"
              role="tab"
              :aria-selected="activePublicSection === 'prizes'"
              aria-controls="public-tab-panel-prizes"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activePublicSection === 'prizes' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="void selectPublicSection('prizes')"
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
              @click="void selectPublicSection('details')"
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
          class="rounded-xl border border-black/8 bg-[#F7F7F8]/80 p-6 dark:border-white/[0.08] dark:bg-[#111111]/80"
        >
          <div
            class="hackathon-markdown"
            v-html="descriptionHtml"
          />
        </section>

        <section
          v-else
          class="rounded-xl border border-dashed border-black/10 bg-white/80 p-8 text-center dark:border-white/[0.08] dark:bg-[#111111]/80"
        >
          <p class="text-[15px] font-medium text-highlighted dark:text-white">
            Overview will appear here once published.
          </p>
        </section>
      </section>

      <section
        v-else-if="hasPublishedPrizes && activePublicSection === 'prizes'"
        id="public-tab-panel-prizes"
        role="tabpanel"
        aria-labelledby="public-tab-prizes"
      >
        <HackathonPrizeList
          :prizes="prizes"
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
          v-if="agendaEntries.length > 0"
          class="relative overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/72 p-5 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#101010]/78 sm:p-7"
        >
          <div
            class="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"
            aria-hidden="true"
          />
          <div
            class="pointer-events-none absolute -right-10 top-6 size-28 rounded-full bg-amber-500/12 blur-3xl"
            aria-hidden="true"
          />

          <div class="relative mb-5 flex flex-col gap-4 border-b border-black/8 pb-5 dark:border-white/[0.08] sm:flex-row sm:items-end sm:justify-between">
            <div class="space-y-3">
              <div class="inline-flex items-center gap-3">
                <span class="flex size-8 items-center justify-center rounded-full border border-black/8 bg-white/80 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-amber-300">
                  <AppIcon
                    name="i-lucide-calendar-range"
                    class="size-4"
                  />
                </span>
                <div>
                  <h2 class="text-xl font-semibold tracking-[-0.03em] text-highlighted dark:text-white">
                    Agenda
                  </h2>
                  <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                    Published schedule for this hackathon.
                  </p>
                </div>
              </div>
            </div>

            <div class="inline-flex w-fit items-center rounded-full border border-black/8 bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#B8B8B8]">
              {{ agendaEntries.length }} items
            </div>
          </div>

          <ol class="space-y-3.5">
            <li
              v-for="item in agendaEntries"
              :key="item.id"
              class="group relative overflow-hidden rounded-[1.35rem] border border-black/8 bg-white/74 p-4 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[1px] hover:border-black/15 active:translate-y-px dark:border-white/[0.08] dark:bg-[#161616]/84 dark:hover:border-white/[0.14] sm:p-5"
            >
              <div class="grid gap-4 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-6">
                <div class="flex flex-col gap-2 md:items-end md:text-right">
                  <div
                    v-if="item.presentation.dayLabel"
                    class="space-y-0.5"
                  >
                    <p class="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700/80 dark:text-amber-300/75">
                      {{ item.presentation.dayLabel }}
                    </p>
                    <p class="text-sm font-semibold text-highlighted dark:text-white">
                      {{ item.presentation.dateLabel }}
                    </p>
                  </div>
                  <p
                    class="whitespace-nowrap font-mono text-[13px] font-medium text-neutral-600 dark:text-[#BBBBBB]"
                    :title="item.presentation.metaLabel"
                  >
                    {{ item.presentation.timeLabel }}
                  </p>
                </div>

                <div class="relative min-w-0 border-t border-black/8 pt-4 dark:border-white/[0.08] md:border-t-0 md:border-l md:pl-6 md:pt-0">
                  <span
                    class="absolute -top-1.5 left-0 hidden size-3 rounded-full border border-amber-500/35 bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.72)] dark:bg-[#121212] dark:shadow-[0_0_0_6px_rgba(18,18,18,0.82)] md:block"
                    aria-hidden="true"
                  />
                  <p class="text-[17px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                    {{ item.title }}
                  </p>
                  <p
                    v-if="item.details"
                    class="mt-2 max-w-[62ch] text-sm leading-6 text-neutral-600 dark:text-[#AFAFAF]"
                  >
                    {{ item.details }}
                  </p>
                </div>
              </div>
            </li>
          </ol>
        </section>
      </section>
    </AppContainer>
  </div>
</template>
