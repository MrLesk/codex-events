<script setup lang="ts">
import type { PublicHackathonState } from '~/composables/useHackathonPresentation'
import type { ApiDataResponse } from '~/utils/admin-workspace'
import type {
  HackathonFeedbackQuestionSummary,
  HackathonFeedbackSummary
} from '#shared/hackathon-feedback'

import {
  hackathonFeedbackNotApplicableLabel,
  hackathonFeedbackRatingValues
} from '#shared/hackathon-feedback'

const props = defineProps<{
  hackathonId: string
  hackathonState: PublicHackathonState
}>()

const hackathonId = computed(() => props.hackathonId.trim())
const commentDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})

const {
  data: summaryResponse,
  status: summaryStatus,
  error: summaryError
} = useFetch<ApiDataResponse<HackathonFeedbackSummary>>(
  () => `/api/hackathons/${hackathonId.value}/feedback`,
  {
    key: () => `hackathon-feedback:${hackathonId.value}`,
    watch: [hackathonId]
  }
)

const summary = computed(() => summaryResponse.value?.data ?? {
  responseCount: 0,
  questionSummaries: [],
  comments: []
} satisfies HackathonFeedbackSummary)

const commentsCount = computed(() => summary.value.comments.length)
const showPreCompletionNotice = computed(() => props.hackathonState !== 'completed')

function formatAverageRating(value: number | null) {
  return value === null ? '—' : value.toFixed(1)
}

function formatCommentDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : commentDateFormatter.format(date)
}

function getRatingCountClass(count: number) {
  return count > 0
    ? 'border-black/12 bg-black/[0.04] text-highlighted dark:border-white/[0.14] dark:bg-white/[0.06] dark:text-white'
    : 'border-black/8 bg-transparent text-muted dark:border-white/[0.08]'
}

function formatDistributionPercentageValue(count: number, total: number) {
  if (total <= 0) {
    return '0'
  }

  return String(Math.round((count / total) * 100))
}

function getDistributionWidth(count: number, total: number) {
  if (count <= 0 || total <= 0) {
    return '0%'
  }

  return `${(count / total) * 100}%`
}

function getQuestionDistributionRows(question: HackathonFeedbackQuestionSummary) {
  return [
    ...[...hackathonFeedbackRatingValues].reverse().map(score => ({
      key: `rating-${score}`,
      label: String(score),
      count: question.ratingCounts[score],
      tone: 'rating' as const
    })),
    {
      key: 'not-applicable',
      label: hackathonFeedbackNotApplicableLabel,
      count: question.notApplicableCount,
      tone: 'not_applicable' as const
    }
  ]
}

function getDistributionBarClass(tone: 'rating' | 'not_applicable') {
  return tone === 'not_applicable'
    ? 'bg-neutral-500/70 dark:bg-white/35'
    : 'bg-highlighted dark:bg-white'
}
</script>

<template>
  <div class="space-y-6">
    <AppAlert
      v-if="showPreCompletionNotice"
      color="neutral"
      variant="soft"
      title="Feedback opens after completion"
      description="This tab will start collecting responses once the hackathon reaches the completed state."
    />

    <AppAlert
      v-if="summaryStatus === 'error'"
      color="warning"
      variant="soft"
      title="Feedback unavailable"
      :description="summaryError?.message ?? 'Hackathon feedback could not be loaded right now.'"
    />

    <template v-else>
      <AppCard>
        <div class="space-y-6">
          <div class="space-y-2 border-b border-black/8 pb-4 dark:border-white/[0.08]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Feedback Overview
            </p>
            <h2 class="text-[22px] font-semibold text-highlighted dark:text-white">
              Post-hackathon responses
            </h2>
            <p class="max-w-3xl text-sm leading-7 text-neutral-600 dark:text-[#A3A3A3]">
              Review averages, rating distributions, skipped-answer counts, and the written comments that were submitted anonymously.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1">
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Total Responses
              </p>
              <p class="text-3xl font-semibold text-highlighted dark:text-white">
                {{ summary.responseCount }}
              </p>
            </div>

            <div class="space-y-1">
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Written Comments
              </p>
              <p class="text-3xl font-semibold text-highlighted dark:text-white">
                {{ commentsCount }}
              </p>
            </div>
          </div>

          <div
            v-if="summary.responseCount === 0"
            class="border-t border-black/8 pt-4 text-sm text-neutral-600 dark:border-white/[0.08] dark:text-[#A3A3A3]"
          >
            No feedback responses have been submitted yet.
          </div>

          <div
            v-else
            class="divide-y divide-black/8 border-t border-black/8 dark:divide-white/[0.08] dark:border-white/[0.08]"
          >
            <section
              v-for="question in summary.questionSummaries"
              :key="question.id"
              class="py-5"
            >
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="space-y-2">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                    {{ question.label }}
                  </p>
                  <h3 class="text-lg font-semibold text-highlighted dark:text-white">
                    {{ question.prompt }}
                  </h3>
                </div>

                <div class="space-y-1 text-left lg:text-right">
                  <p class="text-2xl font-semibold text-highlighted dark:text-white">
                    {{ formatAverageRating(question.averageRating) }}<span class="text-base text-muted"> / 5</span>
                  </p>
                  <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                    {{ question.ratedResponseCount }} rated<span v-if="question.notApplicableCount > 0"> • {{ question.notApplicableCount }} N/A</span>
                  </p>
                </div>
              </div>

              <div class="mt-4 space-y-3">
                <div
                  v-for="distribution in getQuestionDistributionRows(question)"
                  :key="distribution.key"
                  class="grid grid-cols-[minmax(3rem,auto)_1fr_auto_auto] items-center gap-3"
                >
                  <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    {{ distribution.label }}
                  </p>

                  <div class="h-3 overflow-hidden rounded-full bg-black/8 dark:bg-white/[0.08]">
                    <div
                      class="h-full rounded-full transition-[width]"
                      :class="getDistributionBarClass(distribution.tone)"
                      :style="{ width: getDistributionWidth(distribution.count, question.responseCount) }"
                    />
                  </div>

                  <p
                    class="rounded-md border px-2 py-1 text-sm font-semibold transition-colors"
                    :class="getRatingCountClass(distribution.count)"
                  >
                    {{ distribution.count }}
                  </p>

                  <p class="flex items-center justify-end gap-0.5 text-xs font-medium text-muted">
                    <span class="w-[3ch] text-right font-mono tabular-nums">
                      {{ formatDistributionPercentageValue(distribution.count, question.responseCount) }}
                    </span>
                    <span>%</span>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </AppCard>

      <AppCard>
        <div class="space-y-6">
          <div class="space-y-2 border-b border-black/8 pb-4 dark:border-white/[0.08]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Comments
            </p>
            <h2 class="text-[22px] font-semibold text-highlighted dark:text-white">
              Written feedback
            </h2>
          </div>

          <div
            v-if="commentsCount === 0"
            class="text-sm text-neutral-600 dark:text-[#A3A3A3]"
          >
            No written comments have been submitted yet.
          </div>

          <div
            v-else
            class="divide-y divide-black/8 dark:divide-white/[0.08]"
          >
            <article
              v-for="commentEntry in summary.comments"
              :key="commentEntry.id"
              class="py-5 first:pt-0 last:pb-0"
            >
              <div class="space-y-2">
                <p
                  v-if="formatCommentDate(commentEntry.createdAt)"
                  class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                >
                  {{ formatCommentDate(commentEntry.createdAt) }}
                </p>
                <p class="whitespace-pre-wrap text-sm leading-7 text-neutral-700 dark:text-[#D2D2D2]">
                  {{ commentEntry.comment }}
                </p>
              </div>
            </article>
          </div>
        </div>
      </AppCard>
    </template>
  </div>
</template>
