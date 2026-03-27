<script setup lang="ts">
import type { PublicApiListResponse, PublicHackathon } from '~/composables/useHackathonPresentation'

import HackathonCard from '~/components/public/hackathons/HackathonCard.vue'

const publicHackathonsPageSize = 4
const currentPage = ref(1)
const hackathons = ref<PublicHackathon[]>([])
const total = ref(0)
const isLoadingMore = ref(false)
const loadMoreError = ref<string>()
const activeTab = ref<'active' | 'past'>('active')

const { data: initialResponse, error } = await useAsyncData('public-hackathons-homepage:page-1', async () =>
  await $fetch<PublicApiListResponse<PublicHackathon>>('/api/public/hackathons', {
    query: {
      page: 1,
      page_size: publicHackathonsPageSize
    }
  })
)
const { data: pastCountResponse } = await useAsyncData('public-hackathons-homepage:past-count', async () =>
  await $fetch<PublicApiListResponse<PublicHackathon>>('/api/public/hackathons', {
    query: {
      page: 1,
      page_size: 1,
      state: 'completed'
    }
  })
)

hackathons.value = initialResponse.value?.data ?? []
total.value = initialResponse.value?.meta?.total ?? hackathons.value.length
const pastTotal = ref(
  pastCountResponse.value?.meta?.total
  ?? hackathons.value.filter(hackathon => hackathon.state === 'completed').length
)

const hasMoreHackathons = computed(() => hackathons.value.length < total.value)
const filteredHackathons = computed(() => hackathons.value.filter((hackathon) => {
  const isPast = hackathon.state === 'completed'

  return activeTab.value === 'past' ? isPast : !isPast
}))
const currentFilterTotal = computed(() => {
  if (activeTab.value === 'past') {
    return pastTotal.value
  }

  return Math.max(total.value - pastTotal.value, 0)
})
const canLoadMoreForCurrentFilter = computed(() => {
  if (!hasMoreHackathons.value) {
    return false
  }

  return filteredHackathons.value.length < currentFilterTotal.value
})
const visibleHackathonCount = computed(() => filteredHackathons.value.length)
const loadMoreSummary = computed(() => {
  return `Showing ${visibleHackathonCount.value} out of ${currentFilterTotal.value} ${activeTab.value} hackathons.`
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
  title: 'Codex Hackathons',
  description: 'Discover current Codex hackathon programs, lifecycle timing, public evaluation criteria, prize structures, and current terms references.'
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
      class="border-black/8 bg-white text-foreground dark:border-white/[0.08] dark:bg-[#111111] dark:text-[#ECECEC]"
    />

    <template v-else>
      <div class="flex flex-col gap-4 rounded-xl border border-black/8 bg-neutral-100/80 p-2 dark:border-white/[0.08] dark:bg-[#111111]">
        <div class="flex min-w-0 flex-wrap items-center gap-1">
          <button
            class="px-4 py-1.5 text-[13px] rounded-lg transition-colors"
            :class="activeTab === 'active' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'text-neutral-700 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
            @click="activeTab = 'active'"
          >
            Active
          </button>
          <button
            class="px-4 py-1.5 text-[13px] rounded-lg transition-colors"
            :class="activeTab === 'past' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'text-neutral-700 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
            @click="activeTab = 'past'"
          >
            Past
          </button>
          <span class="ml-4 border-l border-black/8 pl-4 text-[13px] text-neutral-700 dark:border-white/[0.08] dark:text-[#8C8C8C]">
            {{ currentFilterTotal }} hackathons
          </span>
        </div>
      </div>

      <div
        v-if="hackathons.length === 0"
        class="rounded-xl border border-dashed border-black/10 bg-white p-10 text-center dark:border-white/[0.08] dark:bg-[#111111]"
      >
        <p class="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-[#8C8C8C]">
          No visible programs
        </p>
        <p class="mt-3 text-lg font-semibold text-highlighted dark:text-white">
          There are no public hackathons available right now.
        </p>
      </div>

      <div
        v-else-if="filteredHackathons.length === 0"
        class="rounded-xl border border-dashed border-black/10 bg-white p-10 text-center dark:border-white/[0.08] dark:bg-[#111111]"
      >
        <p class="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-[#8C8C8C]">
          No programs in this view
        </p>
        <p class="mt-3 text-lg font-semibold text-highlighted dark:text-white">
          There are no {{ activeTab }} hackathons in the currently loaded results.
        </p>
      </div>

      <div
        v-else
        class="relative space-y-16 pt-6"
      >
        <div class="absolute bottom-0 left-0 top-0 hidden w-1 bg-black/16 dark:bg-white/[0.2] lg:block" />
        <HackathonCard
          v-for="hackathon in filteredHackathons"
          :key="hackathon.slug"
          :hackathon="hackathon"
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
        class="border border-black/8 bg-white text-highlighted hover:bg-neutral-100 dark:border-white/[0.08] dark:bg-[#111111] dark:text-white dark:hover:bg-[#181818]"
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
      class="border-black/8 bg-white text-foreground dark:border-white/[0.08] dark:bg-[#111111] dark:text-[#ECECEC]"
    />
  </div>
</template>
