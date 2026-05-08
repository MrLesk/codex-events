<script setup lang="ts">
import type { PublicEventState } from '~/domains/events/presentation'
import type { EventParticipationRankSummary } from '~/domains/events/participation'

import { getEventParticipationRankNotice } from '~/domains/events/participation'

const props = defineProps<{
  eventState: PublicEventState
  teamName?: string | null
  rankSummary: EventParticipationRankSummary | null
}>()

const notice = computed(() =>
  getEventParticipationRankNotice({
    eventState: props.eventState,
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
