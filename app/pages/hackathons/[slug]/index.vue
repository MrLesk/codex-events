<script setup lang="ts">
import type {
  PublicApiDataResponse,
  PublicApiListResponse,
  PublicHackathon,
  PublicPrize
} from '~/composables/useHackathonPresentation'

import HackathonPrizeList from '~/components/public/hackathons/HackathonPrizeList.vue'
import HackathonOverviewPanel from '~/components/public/hackathons/HackathonOverviewPanel.vue'
import HackathonAgendaPanel from '~/components/public/hackathons/HackathonAgendaPanel.vue'
import HackathonTimeline from '~/components/public/hackathons/HackathonTimeline.vue'
import { resolvePublicHackathonPrimaryAction } from '~/utils/participant-application'
import { normalizeTabQueryValue, resolveTabQueryValue } from '~/utils/tab-query'

definePageMeta({
  layout: 'public'
})

interface AccountHackathonAccessRecord {
  slug: string
}

interface AccountHackathonsResponse {
  data: {
    current: AccountHackathonAccessRecord[]
    past: AccountHackathonAccessRecord[]
  }
}

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
const requestFetch = import.meta.server ? useRequestFetch() : $fetch
const hasHackathonWorkspaceAccess = ref(false)

if (accountActor.value.kind === 'platform_user' && accountActor.value.hasAcceptedCurrentPlatformDocuments) {
  try {
    const accountHackathonsResponse = await requestFetch<AccountHackathonsResponse>('/api/account/hackathons')
    const accessibleHackathons = [
      ...accountHackathonsResponse.data.current,
      ...accountHackathonsResponse.data.past
    ]

    hasHackathonWorkspaceAccess.value = accessibleHackathons.some(record => record.slug === slug.value)
  } catch {
    hasHackathonWorkspaceAccess.value = false
  }
}

const headerStatePresentation = computed(() => getPublicHackathonStatePresentation(hackathon.value))
const headerStateLabel = computed(() => headerStatePresentation.value.label.toUpperCase())
const headerStateClass = computed(() => resolvePublicHackathonHeaderStateClass(hackathon.value))
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
  formatHackathonDateWithWeekday(getHackathonEarliestStartAt(hackathon.value)),
  formatHackathonLocation(hackathon.value)
].filter(Boolean).join(' - '))
const primaryAction = computed(() =>
  resolvePublicHackathonPrimaryAction({
    actorKind: accountActor.value.kind,
    hasAcceptedCurrentPlatformDocuments: accountActor.value.hasAcceptedCurrentPlatformDocuments,
    hackathonSlug: slug.value,
    hackathonState: hackathon.value.state,
    registrationOpensAt: hackathon.value.registrationOpensAt,
    registrationClosesAt: hackathon.value.registrationClosesAt,
    hasHackathonWorkspaceAccess: hasHackathonWorkspaceAccess.value
  })
)
const showPrimaryAction = computed(() => Boolean(primaryAction.value))
const primaryActionHref = computed(() => primaryAction.value?.to ?? '')
const isPrimaryActionExternal = computed(() => primaryAction.value?.external ?? false)
const primaryActionLabel = computed(() => primaryAction.value?.label ?? '')
const seoDescription = computed(() => hackathon.value.description
  .replace(/`([^`]+)`/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/[*_#>-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim())

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
                v-if="showPrimaryAction"
                class="shrink-0 pt-0.5"
              >
                <AppButton
                  data-testid="public-hackathon-primary-action"
                  :to="primaryActionHref"
                  :external="isPrimaryActionExternal"
                  color="neutral"
                  variant="solid"
                  class="h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                >
                  {{ primaryActionLabel }}
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
        <HackathonOverviewPanel :description="hackathon.description" />
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

        <HackathonAgendaPanel :agenda-items="hackathon.agendaItems" />
      </section>
    </AppContainer>
  </div>
</template>
