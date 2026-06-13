<script setup lang="ts">
import type { WinnerEntry } from '~/domains/outcomes/published-outcomes'

import EventProjectShowcase from './EventProjectShowcase.vue'
import {
  formatPrizeRank,
  formatPrizeReward
} from '~/domains/events/presentation'

const props = withDefaults(defineProps<{
  winners: WinnerEntry[]
  title?: string
  description?: string
  emptyTitle?: string
  emptyDescription?: string
}>(), {
  title: 'Winning projects',
  description: 'See the final projects, prizes, and team members for the completed event.',
  emptyTitle: 'No winner projects published',
  emptyDescription: 'This completed event does not have any published winner projects yet.'
})

function formatPrizeRewardSummary(prize: WinnerEntry['prizes'][number]) {
  return `${formatPrizeRank(prize)} · ${formatPrizeReward(prize)}`
}

const showcaseItems = computed(() => props.winners.map(winner => ({
  ...winner,
  eyebrow: 'Winning project',
  badges: [
    {
      id: `${winner.submissionId}-rank`,
      label: `#${winner.finalRank}`,
      color: 'warning' as const,
      class: 'uppercase tracking-[0.16em]'
    },
    ...winner.prizes.map(prize => ({
      id: prize.id,
      label: prize.name,
      color: 'success' as const,
      class: ''
    }))
  ],
  showRewardSummaries: true,
  rewardSummaries: winner.prizes.map(prize => ({
    id: `${winner.submissionId}-${prize.id}-reward`,
    label: formatPrizeRewardSummary(prize)
  })),
  emptySummaryDescription: 'No project description is available for this winner yet.',
  emptyTeamMembersDescription: 'No team members are published for this winner.'
})))
</script>

<template>
  <EventProjectShowcase
    :items="showcaseItems"
    section-test-id="event-winners-showcase"
    item-test-id-prefix="event-winner"
    :title="props.title"
    :description="props.description"
    :empty-title="props.emptyTitle"
    :empty-description="props.emptyDescription"
  />
</template>
