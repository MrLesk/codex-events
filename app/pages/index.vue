<script setup lang="ts">
import type { PublicApiListResponse, PublicHackathon } from '~/composables/useHackathonPresentation'

import HackathonCard from '~/components/public/hackathons/HackathonCard.vue'

const publicHackathonsPageSize = 4
const currentPage = ref(1)
const hackathons = ref<PublicHackathon[]>([])
const total = ref(0)
const isLoadingMore = ref(false)
const loadMoreError = ref<string>()
const activeTab = ref<'all' | 'active' | 'past'>('all')

const { data: initialResponse, error } = await useAsyncData('public-hackathons-homepage:page-1', async () =>
  await $fetch<PublicApiListResponse<PublicHackathon>>('/api/public/hackathons', {
    query: {
      page: 1,
      page_size: publicHackathonsPageSize
    }
  })
)

hackathons.value = initialResponse.value?.data ?? []
total.value = initialResponse.value?.meta?.total ?? hackathons.value.length

const hasMoreHackathons = computed(() => hackathons.value.length < total.value)
const filteredHackathons = computed(() => hackathons.value.filter((hackathon) => {
  if (activeTab.value === 'all') {
    return true
  }

  const isPast = hackathon.state === 'completed'

  return activeTab.value === 'past' ? isPast : !isPast
}))

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
  <div class="mx-auto max-w-[1000px] space-y-8 px-4 pb-24 pt-4 text-[#ECECEC] sm:px-6 lg:px-8">
    <section class="space-y-5">
      <div class="flex flex-col gap-4">
        <div class="space-y-3">
          <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-white">
            Hackathons
          </h1>
          <p class="max-w-3xl text-[15px] text-[#A3A3A3]">
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
      title="Hackathons unavailable"
      description="The public discovery surface could not load visible hackathons right now."
      class="border-white/[0.08] bg-[#111111] text-[#ECECEC]"
    />

    <div
      v-else-if="filteredHackathons.length === 0"
      class="rounded-xl border border-dashed border-white/[0.08] bg-[#111111] p-10 text-center"
    >
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-[#8C8C8C]">
        No visible programs
      </p>
      <p class="mt-3 text-lg font-semibold text-white">
        There are no public hackathons available right now.
      </p>
    </div>

    <template v-else>
      <div class="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#111111] p-2 md:flex-row md:items-center md:justify-between">
        <div class="flex min-w-0 flex-wrap items-center gap-1">
          <button
            class="px-4 py-1.5 text-[13px] rounded-lg transition-colors"
            :class="activeTab === 'all' ? 'bg-white text-black font-medium' : 'text-[#A3A3A3] hover:text-white'"
            @click="activeTab = 'all'"
          >
            All
          </button>
          <button
            class="px-4 py-1.5 text-[13px] rounded-lg transition-colors"
            :class="activeTab === 'active' ? 'bg-white text-black font-medium' : 'text-[#A3A3A3] hover:text-white'"
            @click="activeTab = 'active'"
          >
            Active
          </button>
          <button
            class="px-4 py-1.5 text-[13px] rounded-lg transition-colors"
            :class="activeTab === 'past' ? 'bg-white text-black font-medium' : 'text-[#A3A3A3] hover:text-white'"
            @click="activeTab = 'past'"
          >
            Past
          </button>
          <span class="ml-4 border-l border-white/[0.08] pl-4 text-[13px] text-[#8C8C8C]">
            {{ filteredHackathons.length }} hackathons
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button class="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#212121] px-3 py-1.5 text-[13px] text-[#A3A3A3] transition-colors hover:border-white/[0.2]">
            Status
            <AppIcon
              name="i-lucide-chevron-down"
              class="size-3.5"
            />
          </button>
          <button class="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#212121] px-3 py-1.5 text-[13px] text-[#A3A3A3] transition-colors hover:border-white/[0.2]">
            Date
            <AppIcon
              name="i-lucide-chevron-down"
              class="size-3.5"
            />
          </button>
        </div>
      </div>

      <div class="space-y-16 pt-6">
        <HackathonCard
          v-for="hackathon in filteredHackathons"
          :key="hackathon.slug"
          :hackathon="hackathon"
        />
      </div>
    </template>

    <div
      v-if="!error && hasMoreHackathons"
      class="flex flex-col items-center gap-4 pt-2"
    >
      <AppButton
        color="neutral"
        variant="solid"
        :loading="isLoadingMore"
        data-testid="public-hackathons-load-more"
        class="border border-white/[0.08] bg-[#111111] text-white hover:bg-[#181818]"
        @click="loadMoreHackathons"
      >
        Load more hackathons
      </AppButton>

      <p class="text-sm text-[#8C8C8C]">
        Showing {{ hackathons.length }} of {{ total }} visible hackathons.
      </p>
    </div>

    <AppAlert
      v-if="loadMoreError"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="More hackathons unavailable"
      :description="loadMoreError"
      class="border-white/[0.08] bg-[#111111] text-[#ECECEC]"
    />
  </div>
</template>
