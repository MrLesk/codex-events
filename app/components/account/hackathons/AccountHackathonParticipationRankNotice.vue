<script setup lang="ts">
import type { PublicHackathonState } from '~/domains/hackathons/presentation'
import type { HackathonParticipationRankSummary } from '~/domains/hackathons/participation'

import { getHackathonParticipationRankNotice } from '~/domains/hackathons/participation'

const props = defineProps<{
  hackathonState: PublicHackathonState
  teamName?: string | null
  rankSummary: HackathonParticipationRankSummary | null
}>()

const notice = computed(() =>
  getHackathonParticipationRankNotice({
    hackathonState: props.hackathonState,
    teamName: props.teamName,
    rankSummary: props.rankSummary
  })
)
</script>

<template>
  <AppAlert
    v-if="notice"
    :color="notice.color"
    variant="soft"
    :title="notice.title"
    :description="notice.description"
  />
</template>
