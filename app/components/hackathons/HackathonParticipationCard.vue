<script setup lang="ts">
import type { HackathonParticipationRecord } from '~/domains/hackathons/participation'

import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'
import {
  formatParticipationStageLabel,
  formatParticipationStatusLabel,
  getHackathonParticipationPrimaryAction,
  getParticipationStageColor,
  getParticipationStatusColor
} from '~/domains/hackathons/participation'
import { formatHackathonDateWithWeekday, formatHackathonLocation } from '~/domains/hackathons/presentation'

const props = defineProps<{
  record: HackathonParticipationRecord
}>()

const primaryAction = computed(() => getHackathonParticipationPrimaryAction(props.record))
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
    class="!border !border-black/8 !bg-default/80 !shadow-none dark:!border-white/[0.08] dark:!bg-default/80 overflow-hidden rounded-xl"
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
          :to="primaryAction.href"
          color="neutral"
          variant="solid"
          trailing-icon="i-lucide-arrow-up-right"
          class="rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
        >
          {{ primaryAction.label }}
        </AppButton>
      </div>
    </div>
  </article>
</template>
