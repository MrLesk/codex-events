<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'

import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'

const props = defineProps<{
  hackathon: PublicHackathon
}>()

const timelineEntries = computed(() => [
  {
    id: 'registration',
    eyebrow: 'Registration',
    title: formatHackathonWindow(props.hackathon.registrationOpensAt, props.hackathon.registrationClosesAt),
    status: describeWindowStatus(props.hackathon.state, 'registration'),
    description: 'Applications and review readiness start here.'
  },
  {
    id: 'submission',
    eyebrow: 'Submission',
    title: formatHackathonWindow(props.hackathon.submissionOpensAt, props.hackathon.submissionClosesAt),
    status: describeWindowStatus(props.hackathon.state, 'submission'),
    description: 'Approved participants can form teams and submit projects during this window.'
  },
  {
    id: 'lifecycle',
    eyebrow: 'Current lifecycle',
    title: formatHackathonStateLabel(props.hackathon.state),
    status: null,
    description: summarizeHackathonState(props.hackathon.state)
  }
])
</script>

<template>
  <section
    data-testid="public-hackathon-timeline"
    class="grid gap-4 xl:grid-cols-3"
  >
    <AppCard
      v-for="entry in timelineEntries"
      :key="entry.id"
      variant="subtle"
      :ui="{ root: 'border border-default/80 bg-elevated/85 backdrop-blur shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)]' }"
    >
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {{ entry.eyebrow }}
            </p>
            <h2 class="mt-3 text-xl font-semibold tracking-[-0.02em] text-highlighted">
              {{ entry.title }}
            </h2>
          </div>

          <HackathonStateBadge
            v-if="entry.id === 'lifecycle'"
            :state="hackathon.state"
          />
          <AppBadge
            v-else
            color="neutral"
            variant="outline"
            class="rounded-full px-3 py-1.5"
          >
            {{ entry.status }}
          </AppBadge>
        </div>

        <p class="text-sm leading-7 text-toned">
          {{ entry.description }}
        </p>
      </div>
    </AppCard>
  </section>
</template>
