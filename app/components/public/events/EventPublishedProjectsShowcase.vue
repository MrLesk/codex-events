<script setup lang="ts">
import type { PublishedProjectEntry } from '~/domains/outcomes/published-outcomes'

import EventProjectShowcase from './EventProjectShowcase.vue'

const props = withDefaults(defineProps<{
  projects: PublishedProjectEntry[]
  title?: string
  description?: string
  emptyTitle?: string
  emptyDescription?: string
}>(), {
  title: 'Published projects',
  description: 'These teams chose to share their completed projects publicly. They are separate from the official winners.',
  emptyTitle: 'No additional projects published',
  emptyDescription: 'No other teams have chosen to publish their completed projects yet.'
})

const showcaseItems = computed(() => props.projects.map(project => ({
  ...project,
  eyebrow: 'Team project',
  badges: [{
    id: `${project.submissionId}-published-project`,
    label: 'Published project',
    color: 'neutral' as const,
    class: 'uppercase tracking-[0.16em]'
  }],
  showRewardSummaries: false,
  rewardSummaries: [],
  emptySummaryDescription: 'No project description is available for this published project yet.',
  emptyTeamMembersDescription: 'No team members are published for this project.'
})))
</script>

<template>
  <EventProjectShowcase
    :items="showcaseItems"
    section-test-id="event-published-projects-showcase"
    item-test-id-prefix="event-published-project"
    :title="props.title"
    :description="props.description"
    :empty-title="props.emptyTitle"
    :empty-description="props.emptyDescription"
  />
</template>
