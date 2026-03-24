<script setup lang="ts">
import type { PublicApiListResponse, PublicHackathon } from '~/composables/useHackathonPresentation'

import HackathonCard from '~/components/public/hackathons/HackathonCard.vue'

const publicHackathonsPageSize = 4
const currentPage = ref(1)
const hackathons = ref<PublicHackathon[]>([])
const total = ref(0)
const isLoadingMore = ref(false)
const loadMoreError = ref<string>()

const { data: initialResponse, error } = await useAsyncData('public-hackathons-list:page-1', async () =>
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
  title: 'Hackathons | Codex Hackathons',
  description: 'Discover current Codex hackathon programs, lifecycle timing, public evaluation criteria, prize structures, and current terms references.'
})
</script>

<template>
  <div class="pb-24">
    <PageHero
      title="Discover the programs running across the Codex hackathon platform."
      description="This public surface shows the programs that are currently visible outside restricted operator, judge, and team workspaces. Each program detail page stays inside the canonical public contract: lifecycle timing, criteria, prizes, and current terms references."
      orientation="horizontal"
    >
      <template #headline>
        <AppBadge
          color="primary"
          variant="subtle"
          class="rounded-full px-4 py-1.5 font-semibold tracking-[0.16em] uppercase"
        >
          Public program discovery
        </AppBadge>
      </template>

      <template #body>
        <div class="grid gap-4 sm:grid-cols-2">
          <AppCard
            variant="subtle"
            :ui="{ root: 'border border-default/80 bg-elevated/80 backdrop-blur shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)]' }"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Visible now
            </p>
            <p class="mt-3 text-4xl font-semibold tracking-[-0.04em] text-highlighted">
              {{ total }}
            </p>
            <p class="mt-2 text-sm leading-7 text-toned">
              This surface is loaded from the canonical public discovery contract, so privileged sessions see the same public-safe result set.
            </p>
          </AppCard>

          <AppCard
            variant="subtle"
            :ui="{ root: 'border border-default/80 bg-elevated/80 backdrop-blur shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)]' }"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              What is visible
            </p>
            <p class="mt-3 text-lg font-semibold text-highlighted">
              Program overview, timing, criteria, prizes, and terms references
            </p>
            <p class="mt-2 text-sm leading-7 text-toned">
              Team operations, judging assignments, and admin controls remain restricted to their role-specific workspaces.
            </p>
          </AppCard>
        </div>
      </template>
    </PageHero>

    <AppContainer class="space-y-10">
      <div class="flex flex-col gap-4 border-b border-default/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Visible programs
          </p>
          <h1 class="mt-3 text-3xl font-semibold tracking-[-0.04em] text-highlighted">
            Hackathons
          </h1>
        </div>

        <p class="max-w-xl text-sm leading-7 text-toned">
          Browse each program's public contract before entering participant, judge, winner, or admin workflows.
        </p>
      </div>

      <AppAlert
        v-if="error"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Hackathons unavailable"
        description="The public discovery surface could not load visible hackathons right now."
      />

      <div
        v-else-if="hackathons.length === 0"
        class="rounded-[2rem] border border-dashed border-default/80 bg-elevated/65 p-10 text-center shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)]"
      >
        <p class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          No visible programs
        </p>
        <p class="mt-3 text-lg font-semibold text-highlighted">
          There are no public hackathons available right now.
        </p>
      </div>

      <div
        v-else
        class="grid gap-6 xl:grid-cols-2"
      >
        <HackathonCard
          v-for="hackathon in hackathons"
          :key="hackathon.slug"
          :hackathon="hackathon"
        />
      </div>

      <div
        v-if="!error && hasMoreHackathons"
        class="flex flex-col items-center gap-4"
      >
        <AppButton
          color="neutral"
          variant="outline"
          :loading="isLoadingMore"
          data-testid="public-hackathons-load-more"
          @click="loadMoreHackathons"
        >
          Load more hackathons
        </AppButton>

        <p class="text-sm text-muted">
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
      />
    </AppContainer>
  </div>
</template>
