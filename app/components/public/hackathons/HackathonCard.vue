<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'

import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'

const props = defineProps<{
  hackathon: PublicHackathon
}>()

const heroImage = computed(() => props.hackathon.bannerImageUrl ?? props.hackathon.backgroundImageUrl)
const requiredProfiles = computed(() => listRequiredProfiles(props.hackathon))
const registrationStatus = computed(() => describeWindowStatus(props.hackathon.state, 'registration'))
const submissionStatus = computed(() => describeWindowStatus(props.hackathon.state, 'submission'))
</script>

<template>
  <NuxtLink
    :to="`/hackathons/${hackathon.slug}`"
    class="group block h-full"
    :data-testid="`public-hackathon-card-${hackathon.slug}`"
  >
    <AppCard
      variant="subtle"
      :ui="{
        root: 'h-full border border-default/80 bg-elevated/85 shadow-[0_28px_70px_-46px_rgba(15,20,34,0.55)] backdrop-blur',
        body: 'p-0'
      }"
      class="h-full overflow-hidden transition-transform duration-300 group-hover:-translate-y-1"
    >
      <div class="relative border-b border-default/80">
        <img
          v-if="heroImage"
          :src="heroImage"
          :alt="hackathon.name"
          class="h-56 w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        >
        <div
          v-else
          class="h-56 w-full bg-[radial-gradient(circle_at_top_left,rgba(79,91,112,0.35),transparent_36%),linear-gradient(135deg,rgba(15,20,34,0.95),rgba(34,42,57,0.88)_44%,rgba(102,115,139,0.78))]"
        />

        <div class="absolute inset-0 bg-gradient-to-t from-codex-950/85 via-codex-950/10 to-transparent" />

        <div class="absolute inset-x-0 bottom-0 space-y-3 p-6 text-inverted">
          <HackathonStateBadge :state="hackathon.state" />

          <div class="space-y-2">
            <h2 class="text-3xl font-semibold tracking-[-0.03em] text-white">
              {{ hackathon.name }}
            </h2>
            <p class="text-sm text-white/78">
              {{ hackathon.city }} · {{ hackathon.address }}
            </p>
          </div>
        </div>
      </div>

      <div class="space-y-6 p-6">
        <p class="text-sm leading-7 text-toned">
          {{ hackathon.description }}
        </p>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border border-default/80 bg-default/65 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Registration window
            </p>
            <p class="mt-3 text-sm font-medium text-highlighted">
              {{ formatHackathonWindow(hackathon.registrationOpensAt, hackathon.registrationClosesAt) }}
            </p>
            <p class="mt-2 text-sm text-muted">
              {{ registrationStatus }}
            </p>
          </div>

          <div class="rounded-2xl border border-default/80 bg-default/65 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Submission window
            </p>
            <p class="mt-3 text-sm font-medium text-highlighted">
              {{ formatHackathonWindow(hackathon.submissionOpensAt, hackathon.submissionClosesAt) }}
            </p>
            <p class="mt-2 text-sm text-muted">
              {{ submissionStatus }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <AppBadge
            color="neutral"
            variant="outline"
            class="rounded-full px-3 py-1.5"
          >
            {{ formatMaxTeamMembers(hackathon.maxTeamMembers) }}
          </AppBadge>

          <AppBadge
            v-if="requiredProfiles.length === 0"
            color="neutral"
            variant="outline"
            class="rounded-full px-3 py-1.5"
          >
            No required profile links
          </AppBadge>

          <AppBadge
            v-for="profile in requiredProfiles"
            :key="profile"
            color="primary"
            variant="soft"
            class="rounded-full px-3 py-1.5"
          >
            {{ profile }} required
          </AppBadge>
        </div>

        <div class="flex items-center justify-between border-t border-default/80 pt-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Open public detail
          </p>

          <div class="inline-flex items-center gap-2 text-sm font-semibold text-highlighted">
            Explore program
            <AppIcon
              name="i-lucide-arrow-up-right"
              class="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </div>
        </div>
      </div>
    </AppCard>
  </NuxtLink>
</template>
