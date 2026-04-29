<script setup lang="ts">
import type { PublicApiListResponse, PublicHackathon } from '~/domains/hackathons/presentation'

import HackathonCard from '~/components/public/hackathons/HackathonCard.vue'
import { getPublicHomepageHackathonView, type PublicHomepageTab } from '~/utils/public-homepage'
import { normalizeTabQueryValue } from '~/utils/tab-query'

const publicHackathonsPageSize = 4
const route = useRoute()
const currentPage = ref(1)
const hackathons = ref<PublicHackathon[]>([])
const total = ref(0)
const isLoadingMore = ref(false)
const loadMoreError = ref<string>()
const homepageTabs = ['active', 'past'] as const
const requestedTab = computed<PublicHomepageTab | null>(() => {
  const normalizedTab = normalizeTabQueryValue(route.query.tab)

  return normalizedTab && homepageTabs.includes(normalizedTab as PublicHomepageTab)
    ? normalizedTab as PublicHomepageTab
    : null
})

async function selectHomepageTab(nextTab: PublicHomepageTab) {
  if (selectedTab.value === nextTab) {
    return
  }

  await navigateTo({
    path: route.path,
    query: {
      ...route.query,
      tab: nextTab
    },
    hash: route.hash
  })
}

const { data: initialResponse, error } = await useFetch<PublicApiListResponse<PublicHackathon>>('/api/public/hackathons', {
  key: 'public-hackathons-homepage:page-1',
  query: {
    page: 1,
    page_size: publicHackathonsPageSize
  }
})
const { data: pastCountResponse } = await useFetch<PublicApiListResponse<PublicHackathon>>('/api/public/hackathons', {
  key: 'public-hackathons-homepage:past-count',
  query: {
    page: 1,
    page_size: 1,
    state: 'completed'
  }
})

hackathons.value = initialResponse.value?.data ?? []
total.value = initialResponse.value?.meta?.total ?? hackathons.value.length
const pastTotal = ref(
  pastCountResponse.value?.meta?.total
  ?? hackathons.value.filter(hackathon => hackathon.state === 'completed').length
)

const hasMoreHackathons = computed(() => hackathons.value.length < total.value)
const loadedHackathonCount = computed(() => hackathons.value.length)
const homepageHackathonView = computed(() =>
  getPublicHomepageHackathonView(
    requestedTab.value,
    total.value,
    pastTotal.value,
    loadedHackathonCount.value
  )
)
const selectedTab = computed<PublicHomepageTab>(() => homepageHackathonView.value.effectiveTab)
const filteredHackathons = computed(() => hackathons.value.filter((hackathon) => {
  const isPast = hackathon.state === 'completed'

  return homepageHackathonView.value.effectiveTab === 'past' ? isPast : !isPast
}))
const currentFilterTotal = computed(() => {
  if (homepageHackathonView.value.effectiveTab === 'past') {
    return pastTotal.value
  }

  return homepageHackathonView.value.activeHackathonCount
})
const homepageFilterCounts = computed(() => ({
  active: homepageHackathonView.value.activeHackathonCount,
  past: pastTotal.value
}))
const canLoadMoreForCurrentFilter = computed(() => {
  if (!hasMoreHackathons.value) {
    return false
  }

  return filteredHackathons.value.length < currentFilterTotal.value
})
const visibleHackathonCount = computed(() => filteredHackathons.value.length)
const loadMoreSummary = computed(() => {
  return `Showing ${visibleHackathonCount.value} out of ${currentFilterTotal.value} ${homepageHackathonView.value.effectiveTab} hackathons.`
})

async function loadMoreHackathons() {
  if (isLoadingMore.value || !hasMoreHackathons.value) {
    return
  }

  isLoadingMore.value = true
  loadMoreError.value = undefined

  try {
    const nextPage = currentPage.value + 1
    const response = await $fetch<PublicApiListResponse<PublicHackathon>>('/api/public/hackathons', {
      query: {
        page: nextPage,
        page_size: publicHackathonsPageSize
      }
    })

    const nextHackathons = response.data.filter(candidate =>
      !hackathons.value.some(existing => existing.slug === candidate.slug)
    )

    hackathons.value = [...hackathons.value, ...nextHackathons]
    total.value = response.meta?.total ?? total.value
    currentPage.value = nextPage
  } catch {
    loadMoreError.value = 'More public hackathons could not be loaded right now.'
  } finally {
    isLoadingMore.value = false
  }
}

useSeoMeta({
  title: 'Find a Hackathon | Codex Hackathons',
  description: 'Browse current and past Codex community hackathons and find the ones you want to join.'
})
</script>

<template>
  <div class="mx-auto max-w-[1000px] space-y-8 px-4 pb-24 pt-4 text-foreground sm:px-6 lg:px-8">
    <section class="space-y-5">
      <div class="flex flex-col gap-4">
        <div class="space-y-3">
          <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
            Hackathons
          </h1>
          <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
            Discover and join hackathon programs running across the Codex community.
          </p>
        </div>
      </div>
    </section>

    <AppAlert
      v-if="error"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Hackathons are temporarily unavailable"
      description="We couldn't load the latest hackathons. Please refresh the page or try again in a moment."
      class="!border !border-black/8 !bg-default/80 !shadow-none dark:!border-white/[0.08] dark:!bg-default/80 text-foreground dark:text-[#ECECEC]"
    />

    <template v-else>
      <div
        v-if="homepageHackathonView.showFilters"
        class="!border !border-black/8 !bg-default/80 !shadow-none dark:!border-white/[0.08] dark:!bg-default/80 flex flex-col gap-4 rounded-xl p-2"
      >
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <button
            class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
            :class="selectedTab === 'active' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
            @click="void selectHomepageTab('active')"
          >
            <span>Active</span>
            <span
              class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
              :class="selectedTab === 'active' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
            >
              {{ homepageFilterCounts.active }}
            </span>
          </button>
          <button
            class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
            :class="selectedTab === 'past' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
            @click="void selectHomepageTab('past')"
          >
            <span>Past</span>
            <span
              class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
              :class="selectedTab === 'past' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
            >
              {{ homepageFilterCounts.past }}
            </span>
          </button>
        </div>
      </div>

      <div
        v-if="hackathons.length === 0"
        class="!border !border-dashed !border-black/10 !bg-default/80 !shadow-none dark:!border-white/[0.08] dark:!bg-default/80 rounded-xl p-10 text-center"
      >
        <p class="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-[#8C8C8C]">
          0 hackathons configured
        </p>
        <p class="mt-3 text-lg font-semibold text-highlighted dark:text-white">
          There are currently no public hackathons configured. Check again later.
        </p>
      </div>

      <div
        v-else-if="filteredHackathons.length === 0"
        class="!border !border-dashed !border-black/10 !bg-default/80 !shadow-none dark:!border-white/[0.08] dark:!bg-default/80 rounded-xl p-10 text-center"
      >
        <p class="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-[#8C8C8C]">
          No programs in this view
        </p>
        <p class="mt-3 text-lg font-semibold text-highlighted dark:text-white">
          There are no {{ homepageHackathonView.effectiveTab }} hackathons in the currently loaded results.
        </p>
      </div>

      <div
        v-else
        class="relative space-y-16 pt-6"
      >
        <div
          v-if="!homepageHackathonView.useSingleHackathonLayout"
          class="absolute bottom-0 left-0 top-0 hidden w-1 bg-black/16 dark:bg-white/[0.2] lg:block"
        />
        <HackathonCard
          v-for="hackathon in filteredHackathons"
          :key="hackathon.slug"
          :hackathon="hackathon"
          :show-timeline-rail="!homepageHackathonView.useSingleHackathonLayout"
        />
      </div>
    </template>

    <div
      v-if="!error && canLoadMoreForCurrentFilter"
      class="flex flex-col items-center gap-4 pt-2"
    >
      <AppButton
        color="neutral"
        variant="solid"
        :loading="isLoadingMore"
        data-testid="public-hackathons-load-more"
        class="border border-black/8 bg-default/92 text-highlighted hover:bg-default dark:border-white/[0.08] dark:bg-default/92 dark:text-white dark:hover:bg-elevated/92"
        @click="loadMoreHackathons"
      >
        Load more hackathons
      </AppButton>

      <p class="text-sm text-neutral-500 dark:text-[#8C8C8C]">
        {{ loadMoreSummary }}
      </p>
    </div>

    <AppAlert
      v-if="loadMoreError"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="More hackathons unavailable"
      :description="loadMoreError"
      class="!border !border-black/8 !bg-default/80 !shadow-none dark:!border-white/[0.08] dark:!bg-default/80 text-foreground dark:text-[#ECECEC]"
    />
  </div>
</template>
