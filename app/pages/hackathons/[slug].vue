<script setup lang="ts">
import type {
  PublicApiDataResponse,
  PublicApiListResponse,
  PublicEvaluationCriterion,
  PublicHackathon,
  PublicPrize
} from '~/composables/useHackathonPresentation'

import HackathonCriteriaList from '~/components/public/hackathons/HackathonCriteriaList.vue'
import HackathonPrizeList from '~/components/public/hackathons/HackathonPrizeList.vue'
import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'
import HackathonTermsReferences from '~/components/public/hackathons/HackathonTermsReferences.vue'
import HackathonTimeline from '~/components/public/hackathons/HackathonTimeline.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const [
  { data: hackathonResponse, error: hackathonError },
  { data: criteriaResponse, error: criteriaError },
  { data: prizesResponse, error: prizesError }
] = await Promise.all([
  useFetch<PublicApiDataResponse<PublicHackathon>>(() => `/api/public/hackathons/${slug.value}`, {
    key: () => `public-hackathon-detail:${slug.value}`
  }),
  useFetch<PublicApiListResponse<PublicEvaluationCriterion>>(() => `/api/public/hackathons/${slug.value}/evaluation-criteria`, {
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
const requiredProfiles = computed(() => listRequiredProfiles(hackathon.value))
const heroImage = computed(() => hackathon.value.bannerImageUrl ?? hackathon.value.backgroundImageUrl)
const criteriaErrorMessage = computed(() => criteriaError.value ? 'Public scoring dimensions could not be loaded right now.' : undefined)
const prizesErrorMessage = computed(() => prizesError.value ? 'Published awards could not be loaded right now.' : undefined)

useSeoMeta({
  title: () => `${hackathon.value.name} | Codex Hackathons`,
  description: () => hackathon.value.description
})
</script>

<template>
  <div class="pb-24">
    <section class="relative isolate overflow-hidden border-b border-default/80">
      <img
        v-if="heroImage"
        :src="heroImage"
        :alt="hackathon.name"
        class="absolute inset-0 h-full w-full object-cover"
      >
      <div
        v-else
        class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,91,112,0.4),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(102,115,139,0.25),transparent_24%),linear-gradient(135deg,rgba(15,20,34,0.96),rgba(34,42,57,0.88)_44%,rgba(102,115,139,0.78))]"
      />

      <div class="absolute inset-0 bg-gradient-to-b from-codex-950/30 via-codex-950/55 to-[var(--ui-bg)]" />

      <UContainer class="relative py-18 sm:py-24">
        <NuxtLink
          to="/hackathons"
          class="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white/92 backdrop-blur transition-colors hover:bg-white/16"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          Back to hackathons
        </NuxtLink>

        <div class="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_22rem] xl:items-start">
          <div class="space-y-6 text-inverted">
            <HackathonStateBadge :state="hackathon.state" />

            <div class="space-y-4">
              <h1
                data-testid="public-hackathon-detail-title"
                class="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl"
              >
                {{ hackathon.name }}
              </h1>

              <p class="max-w-3xl text-base leading-8 text-white/82 sm:text-lg">
                {{ hackathon.description }}
              </p>
            </div>

            <div class="flex flex-wrap gap-3">
              <UBadge
                color="neutral"
                variant="outline"
                class="rounded-full border-white/22 bg-white/8 px-3 py-1.5 text-white"
              >
                {{ hackathon.city }} · {{ hackathon.address }}
              </UBadge>

              <UBadge
                color="neutral"
                variant="outline"
                class="rounded-full border-white/22 bg-white/8 px-3 py-1.5 text-white"
              >
                {{ formatMaxTeamMembers(hackathon.maxTeamMembers) }}
              </UBadge>

              <UBadge
                v-if="requiredProfiles.length === 0"
                color="neutral"
                variant="outline"
                class="rounded-full border-white/22 bg-white/8 px-3 py-1.5 text-white"
              >
                No required profile links
              </UBadge>

              <UBadge
                v-for="profile in requiredProfiles"
                :key="profile"
                color="neutral"
                variant="outline"
                class="rounded-full border-white/22 bg-white/8 px-3 py-1.5 text-white"
              >
                {{ profile }} required
              </UBadge>
            </div>
          </div>

          <UCard
            variant="subtle"
            :ui="{ root: 'border border-white/16 bg-white/10 text-white shadow-[0_28px_72px_-48px_rgba(0,0,0,0.72)] backdrop-blur' }"
          >
            <div class="space-y-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
                Public visibility
              </p>
              <p class="text-xl font-semibold tracking-[-0.03em] text-white">
                This detail page stays inside the public contract.
              </p>
              <p class="text-sm leading-7 text-white/76">
                Operational queues, team workspaces, assignment loads, and admin controls remain in their role-specific surfaces.
              </p>
            </div>
          </UCard>
        </div>
      </UContainer>
    </section>

    <UContainer class="space-y-6 pt-10">
      <HackathonTimeline :hackathon="hackathon" />

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <UCard
          variant="subtle"
          :ui="{ root: 'border border-default/80 bg-elevated/85 backdrop-blur shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)]' }"
        >
          <div class="space-y-6">
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Program snapshot
              </p>
              <h2 class="text-2xl font-semibold tracking-[-0.03em] text-highlighted">
                What participants can assess before they commit
              </h2>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="rounded-2xl border border-default/80 bg-default/60 p-5">
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Registration opens
                </p>
                <p class="mt-3 text-lg font-semibold text-highlighted">
                  {{ formatHackathonDate(hackathon.registrationOpensAt) }}
                </p>
              </div>

              <div class="rounded-2xl border border-default/80 bg-default/60 p-5">
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Submission closes
                </p>
                <p class="mt-3 text-lg font-semibold text-highlighted">
                  {{ formatHackathonDate(hackathon.submissionClosesAt) }}
                </p>
              </div>
            </div>

            <p class="text-sm leading-8 text-toned">
              Team formation, applications, judging, and redemption actions remain guarded by lifecycle rules and actor permissions. This public page is intentionally limited to the information a visitor can safely evaluate before entering those workflows.
            </p>
          </div>
        </UCard>

        <HackathonTermsReferences :hackathon="hackathon" />
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <HackathonCriteriaList
          :criteria="criteria"
          :error-message="criteriaErrorMessage"
        />

        <HackathonPrizeList
          :prizes="prizes"
          :error-message="prizesErrorMessage"
        />
      </div>
    </UContainer>
  </div>
</template>
