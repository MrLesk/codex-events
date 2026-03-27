<script setup lang="ts">
import type { HackathonParticipationRecord } from '~/utils/hackathon-participation'

import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'
import {
  formatParticipationDate,
  formatParticipationStatusLabel,
  getParticipationStatusColor,
  summarizeParticipationRecord
} from '~/utils/hackathon-participation'
import { formatHackathonWindow } from '~/composables/useHackathonPresentation'
import { formatTeamSubmissionStatus } from '~/utils/team-submission'

const props = defineProps<{
  record: HackathonParticipationRecord
}>()

const hackathonHref = computed(() => `/hackathons/${props.record.hackathon.slug}`)
const accountHackathonHref = computed(() => `/account/hackathons/${props.record.hackathon.slug}`)
const teamsHref = computed(() => `${hackathonHref.value}/teams`)
const teamWorkspaceHref = computed(() =>
  props.record.activeTeam ? `${teamsHref.value}/${props.record.activeTeam.id}` : null
)
const primaryActionHref = computed(() => {
  if (teamWorkspaceHref.value) {
    return teamWorkspaceHref.value
  }

  return accountHackathonHref.value
})
const primaryActionLabel = computed(() => {
  if (teamWorkspaceHref.value) {
    return 'Open team workspace'
  }

  return 'Open workspace'
})
const displayedTeam = computed(() => props.record.activeTeam ?? props.record.latestTeam)
const participationStatusLabel = computed(() => formatParticipationStatusLabel(props.record))
const participationStatusColor = computed(() => getParticipationStatusColor(props.record))
const participationSummary = computed(() => summarizeParticipationRecord(props.record))
</script>

<template>
  <article
    :data-testid="`hackathon-participation-${props.record.hackathon.slug}`"
    class="overflow-hidden rounded-xl border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111]"
  >
    <div class="space-y-5 p-6">
      <div class="flex flex-wrap items-start justify-between gap-4 border-b border-black/8 pb-5 dark:border-white/[0.08]">
        <div class="space-y-2">
          <p class="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
            {{ props.record.hackathon.city }}
          </p>
          <h2 class="text-[24px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
            {{ props.record.hackathon.name }}
          </h2>
          <p class="text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
            {{ formatHackathonWindow(props.record.hackathon.registrationOpensAt, props.record.hackathon.submissionClosesAt) }}
          </p>
        </div>

        <HackathonStateBadge :state="props.record.hackathon.state" />
      </div>

      <p class="text-[14px] leading-relaxed text-neutral-500 dark:text-[#A3A3A3]">
        {{ participationSummary }}
      </p>

      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-black/8 bg-[#F7F7F8] px-4 py-4 dark:border-white/[0.08] dark:bg-[#171717]">
          <p class="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
            Team
          </p>
          <p class="mt-2 text-[14px] text-highlighted dark:text-white">
            {{ displayedTeam?.name ?? 'No team yet' }}
          </p>
          <p
            v-if="displayedTeam"
            class="mt-1 text-[12px] text-neutral-500 dark:text-[#8C8C8C]"
          >
            {{ displayedTeam.membershipRole }} • {{ displayedTeam.activeMemberCount }} active members
          </p>
        </div>

        <div class="rounded-xl border border-black/8 bg-[#F7F7F8] px-4 py-4 dark:border-white/[0.08] dark:bg-[#171717]">
          <p class="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
            Participation
          </p>
          <p class="mt-2 text-[14px] text-highlighted dark:text-white">
            {{ participationStatusLabel }}
          </p>
        </div>

        <div class="rounded-xl border border-black/8 bg-[#F7F7F8] px-4 py-4 dark:border-white/[0.08] dark:bg-[#171717]">
          <p class="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
            Last activity
          </p>
          <p class="mt-2 text-[14px] text-highlighted dark:text-white">
            {{ formatParticipationDate(props.record.lastActivityAt) }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 pt-4 dark:border-white/[0.08]">
        <div class="flex flex-wrap items-center gap-2">
          <AppBadge
            :color="participationStatusColor"
            variant="soft"
            class="rounded-full px-3 py-1 font-semibold tracking-[0.16em] uppercase"
          >
            {{ participationStatusLabel }}
          </AppBadge>

          <AppBadge
            v-if="props.record.latestSubmission"
            color="neutral"
            variant="subtle"
            class="rounded-full px-3 py-1 font-medium"
          >
            {{ formatTeamSubmissionStatus(props.record.latestSubmission.status) }}
          </AppBadge>
        </div>

        <AppButton
          :to="primaryActionHref"
          color="neutral"
          variant="solid"
          trailing-icon="i-lucide-arrow-up-right"
          class="rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
        >
          {{ primaryActionLabel }}
        </AppButton>
      </div>
    </div>
  </article>
</template>
