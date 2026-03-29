<script setup lang="ts">
import type { HackathonParticipationRecord } from '~/utils/hackathon-participation'

import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'
import {
  formatParticipationStageLabel,
  formatParticipationStatusLabel,
  getParticipationStageColor,
  getParticipationStatusColor,
} from '~/utils/hackathon-participation'
import { formatHackathonDateWithWeekday, formatHackathonLocation } from '~/composables/useHackathonPresentation'

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
const hackathonMetaLabel = computed(() => [
  formatHackathonDateWithWeekday(props.record.hackathon.startsAt),
  formatHackathonLocation(props.record.hackathon)
].filter(Boolean).join(' - '))
const participationStageLabel = computed(() => formatParticipationStageLabel(props.record))
const participationStageColor = computed(() => getParticipationStageColor(props.record))
const participationStatusLabel = computed(() => formatParticipationStatusLabel(props.record))
const participationStatusColor = computed(() => getParticipationStatusColor(props.record))
const showParticipationStageBadge = computed(() =>
  Boolean(participationStageLabel.value) && participationStageLabel.value !== participationStatusLabel.value
)
</script>

<template>
  <article
    :data-testid="`hackathon-participation-${props.record.hackathon.slug}`"
    class="app-surface-panel overflow-hidden rounded-xl"
  >
    <div class="space-y-5 p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-2">
          <h2 class="text-[24px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
            {{ props.record.hackathon.name }}
          </h2>
          <p class="text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
            {{ hackathonMetaLabel }}
          </p>
        </div>

        <HackathonStateBadge
          :state="props.record.hackathon.state"
          :registration-opens-at="props.record.hackathon.registrationOpensAt"
          :registration-closes-at="props.record.hackathon.registrationClosesAt"
        />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div class="flex flex-wrap items-center gap-2">
          <AppBadge
            v-if="showParticipationStageBadge"
            :color="participationStageColor"
            variant="subtle"
            class="rounded-full px-3 py-1 font-semibold tracking-[0.16em] uppercase"
          >
            {{ participationStageLabel }}
          </AppBadge>

          <AppBadge
            :color="participationStatusColor"
            variant="soft"
            class="rounded-full px-3 py-1 font-semibold tracking-[0.16em] uppercase"
          >
            {{ participationStatusLabel }}
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
