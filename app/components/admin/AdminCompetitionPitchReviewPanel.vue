<script setup lang="ts">
import type { PitchReviewCoverageEntry } from '~/utils/admin-workspace'

const props = defineProps<{
  entries: PitchReviewCoverageEntry[]
  hasCompletedPitchReviews: boolean
  canStartFinalDeliberation: boolean
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  startFinalDeliberation: []
}>()
</script>

<template>
  <AppCard class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Pitch Review
        </h2>
        <p class="text-sm text-muted">
          Judges now see full submission details and submit post-pitch scores on the shared `1-5` scale. When you move on, the platform averages the submitted pitch votes only.
        </p>
      </div>
    </template>

    <div class="space-y-4">
      <AppAlert
        :color="props.hasCompletedPitchReviews ? 'neutral' : 'warning'"
        variant="soft"
        title="Pitch review is live"
        :description="props.hasCompletedPitchReviews
          ? 'Close pitch review once the submitted votes you want to count are in. Missing pitch votes listed below are excluded from the average if you move on now.'
          : 'At least one submitted pitch review is required before final deliberation can start. Missing pitch votes listed below are still excluded from the eventual average.'"
      />

      <div
        v-if="props.entries.length > 0"
        class="space-y-4"
      >
        <div
          v-for="entry in props.entries"
          :key="entry.submissionId"
          class="space-y-3 border-t border-default/80 pt-4 first:border-t-0 first:pt-0"
        >
          <div class="space-y-1">
            <div class="flex flex-wrap items-baseline gap-3">
              <h3 class="text-sm font-semibold text-highlighted">
                {{ entry.projectLabel }}
              </h3>
              <p
                v-if="entry.teamName"
                class="text-xs font-semibold uppercase tracking-[0.18em] text-muted"
              >
                {{ entry.teamName }}
              </p>
            </div>
            <p class="text-sm text-toned">
              {{ entry.completedAssignmentCount }} of {{ entry.totalAssignmentCount }} pitch reviews submitted.
            </p>
          </div>

          <div class="grid gap-3 lg:grid-cols-2">
            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Reviewed By
              </p>
              <p class="text-sm text-toned">
                {{ entry.reviewedJudgeLabels.length > 0 ? entry.reviewedJudgeLabels.join(', ') : 'No completed pitch reviews yet.' }}
              </p>
            </div>

            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Missing
              </p>
              <p
                class="text-sm"
                :class="entry.missingJudgeLabels.length > 0 ? 'text-warning' : 'text-success'"
              >
                {{ entry.missingJudgeLabels.length > 0 ? entry.missingJudgeLabels.join(', ') : 'All assigned judges reviewed this finalist.' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <AppButton
          color="primary"
          :loading="props.pendingActionKey === 'start-final-deliberation'"
          :disabled="!props.canStartFinalDeliberation || (props.pendingActionKey !== null && props.pendingActionKey !== 'start-final-deliberation')"
          @click="emit('startFinalDeliberation')"
        >
          Move to final deliberation
        </AppButton>
      </div>
    </div>
  </AppCard>
</template>
