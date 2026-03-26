<script setup lang="ts">
import type {
  PublicApiDataResponse,
  PublicApiListResponse,
  PublicHackathon,
  PublicPrize
} from '~/composables/useHackathonPresentation'

import HackathonPrizeList from '~/components/public/hackathons/HackathonPrizeList.vue'
import HackathonTimeline from '~/components/public/hackathons/HackathonTimeline.vue'
import { buildAuthLoginHref } from '~/utils/auth-navigation'

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
const registerEntryHref = computed(() => buildAuthLoginHref(route.fullPath || `/hackathons/${slug.value}`))
const headerStateLabel = computed(() => formatHackathonStateLabel(hackathon.value.state).toUpperCase())
const headerStateClass = computed(() => {
  if (hackathon.value.state === 'submission_open') {
    return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
  }

  if (hackathon.value.state === 'registration_open') {
    return 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
  }

  if (hackathon.value.state === 'winners_announced') {
    return 'bg-green-500/10 text-green-400 border border-green-500/20'
  }

  return 'bg-white/[0.05] text-[#A3A3A3] border border-white/[0.08]'
})
const criteriaCount = computed(() => criteria.value.length)
const detailSummary = computed(() => [
  formatHackathonWindow(hackathon.value.registrationOpensAt, hackathon.value.submissionClosesAt),
  hackathon.value.city,
  formatMaxTeamMembers(hackathon.value.maxTeamMembers)
].join(' • '))
const showRegisterCta = computed(() => {
  if (accountActor.value?.kind === 'anonymous' || accountActor.value?.kind === 'authenticated_identity') {
    return true
  }

  return false
})
const isRegisterHrefExternal = computed(() => accountActor.value?.kind === 'anonymous')
const registerHref = computed(() => {
  if (accountActor.value?.kind === 'anonymous') {
    return registerEntryHref.value
  }

  if (accountActor.value?.kind === 'authenticated_identity') {
    return '/account/settings'
  }

  return null
})

const activePublicSection = ref<'overview' | 'prizes'>('overview')
const publicSectionTargets: Record<typeof activePublicSection.value, string> = {
  overview: 'public-overview',
  prizes: 'prizes'
}

function scrollToPublicSection(section: keyof typeof publicSectionTargets) {
  activePublicSection.value = section
  document.getElementById(publicSectionTargets[section])?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}

useSeoMeta({
  title: () => `${hackathon.value.name} | Codex Hackathons`,
  description: () => hackathon.value.description
})
</script>

<template>
  <div class="pb-24">
    <section class="border-b border-black/8 bg-white dark:border-white/[0.08] dark:bg-black">
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
                  v-if="registerHref"
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
                <AppButton
                  v-else
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
              type="button"
              role="tab"
              :aria-selected="activePublicSection === 'overview'"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activePublicSection === 'overview' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="scrollToPublicSection('overview')"
            >
              Overview
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activePublicSection === 'prizes'"
              class="inline-flex items-center gap-2 border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activePublicSection === 'prizes' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="scrollToPublicSection('prizes')"
            >
              Prizes
              <span
                v-if="prizes.length > 0"
                class="rounded-full bg-black/6 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:bg-white/[0.05] dark:text-[#8C8C8C]"
              >
                {{ prizes.length }}
              </span>
            </button>
          </nav>
        </div>
      </AppContainer>
    </section>

    <AppContainer
      id="public-overview"
      class="max-w-[68rem] space-y-7 pt-6"
    >
      <HackathonTimeline
        :hackathon="hackathon"
        :criteria-count="criteriaCount"
      />

      <section class="rounded-xl border border-black/8 bg-[#F7F7F8] p-6 dark:border-white/[0.08] dark:bg-[#111111]">
        <h2 class="mb-4 text-[16px] font-medium text-highlighted dark:text-white">
          About this Hackathon
        </h2>
        <div class="max-w-[800px] space-y-4 text-[14px] leading-relaxed text-neutral-500 dark:text-[#A3A3A3]">
          <p>{{ hackathon.description }}</p>
        </div>
      </section>

      <div
        id="prizes"
        class="border-t border-black/8 pt-8 dark:border-white/[0.08]"
      >
        <HackathonPrizeList
          :prizes="prizes"
          :error-message="prizesErrorMessage"
        />
      </div>
    </AppContainer>
  </div>
</template>
