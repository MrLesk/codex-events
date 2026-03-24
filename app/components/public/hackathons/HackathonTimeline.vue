<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'

const props = defineProps<{
  hackathon: PublicHackathon
  criteriaCount?: number
}>()

function getWindowProgress(state: PublicHackathon['state'], window: 'registration' | 'submission') {
  if (window === 'registration') {
    if (state === 'draft') {
      return 8
    }

    if (state === 'registration_open') {
      return 100
    }

    return 100
  }

  if (state === 'submission_open') {
    return 42
  }

  if (['judging_preparation', 'judge_review', 'shortlist', 'winners_announced', 'completed'].includes(state)) {
    return 100
  }

  return 10
}

function getWindowAccent(window: 'registration' | 'submission') {
  return window === 'registration' ? 'bg-green-500' : 'bg-violet-500'
}

function getWindowNote(state: PublicHackathon['state'], window: 'registration' | 'submission') {
  if (window === 'registration') {
    if (state === 'draft') {
      return 'Registration upcoming'
    }

    if (state === 'registration_open') {
      return 'Registration open'
    }

    return 'Registration closed'
  }

  if (state === 'submission_open') {
    return 'Submission open'
  }

  if (['judging_preparation', 'judge_review', 'shortlist', 'winners_announced', 'completed'].includes(state)) {
    return 'Submission closed'
  }

  return 'Submission upcoming'
}

const criteriaSummary = computed(() => {
  const count = props.criteriaCount ?? 0

  return count === 1 ? '1 Dimension' : `${count} Dimensions`
})

const timelineEntries = computed(() => [
  {
    id: 'registration',
    eyebrow: 'Registration Window',
    title: formatHackathonWindow(props.hackathon.registrationOpensAt, props.hackathon.registrationClosesAt),
    status: describeWindowStatus(props.hackathon.state, 'registration'),
    note: getWindowNote(props.hackathon.state, 'registration'),
    progress: getWindowProgress(props.hackathon.state, 'registration'),
    accent: getWindowAccent('registration')
  },
  {
    id: 'submission',
    eyebrow: 'Submission Window',
    title: formatHackathonWindow(props.hackathon.submissionOpensAt, props.hackathon.submissionClosesAt),
    status: describeWindowStatus(props.hackathon.state, 'submission'),
    note: getWindowNote(props.hackathon.state, 'submission'),
    progress: getWindowProgress(props.hackathon.state, 'submission'),
    accent: getWindowAccent('submission')
  },
  {
    id: 'details',
    eyebrow: 'Judging Details',
    title: null,
    rows: [
      {
        label: 'Format',
        value: 'Blind Evaluation'
      },
      {
        label: 'Criteria',
        value: criteriaSummary.value
      },
      {
        label: 'Lifecycle',
        value: formatHackathonStateLabel(props.hackathon.state)
      }
    ]
  }
])
</script>

<template>
  <section
    data-testid="public-hackathon-timeline"
    class="grid grid-cols-1 gap-6 md:grid-cols-3"
  >
    <div
      v-for="entry in timelineEntries"
      :key="entry.id"
      class="rounded-xl border border-black/8 bg-[#F7F7F8] p-6 dark:border-white/[0.08] dark:bg-[#111111]"
    >
      <template v-if="entry.id !== 'details'">
        <h3 class="mb-4 text-[14px] font-medium text-neutral-500 dark:text-[#A3A3A3]">
          {{ entry.eyebrow }}
        </h3>
        <div class="text-[16px] text-highlighted dark:text-white">
          {{ entry.title }}
        </div>
        <div class="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-black/6 dark:bg-white/[0.05]">
          <div
            class="h-full"
            :class="entry.accent"
            :style="{ width: `${entry.progress}%` }"
          />
        </div>
        <p class="mt-2 text-[12px] text-neutral-500 dark:text-[#8C8C8C]">
          {{ entry.note }}
        </p>
      </template>

      <template v-else>
        <h3 class="mb-4 text-[14px] font-medium text-neutral-500 dark:text-[#A3A3A3]">
          {{ entry.eyebrow }}
        </h3>
        <div class="space-y-3">
          <div
            v-for="row in entry.rows"
            :key="row.label"
            class="flex justify-between text-[13px]"
          >
            <span class="text-neutral-500 dark:text-[#8C8C8C]">
              {{ row.label }}
            </span>
            <span class="text-highlighted dark:text-white">
              {{ row.value }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
