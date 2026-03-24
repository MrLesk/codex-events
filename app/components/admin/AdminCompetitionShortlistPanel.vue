<script setup lang="ts">
import type {
  HackathonState,
  LeaderboardEntry,
  ShortlistEntry
} from '~/utils/admin-workspace'

const props = defineProps<{
  hackathonState: HackathonState
  leaderboard: LeaderboardEntry[]
  shortlist: ShortlistEntry[]
  isLeaderboardLoading?: boolean
  leaderboardErrorMessage?: string
  isShortlistLoading?: boolean
  shortlistErrorMessage?: string
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  reorder: [orderedSubmissionIds: string[]]
}>()

const draftShortlist = ref<ShortlistEntry[]>([])

watch(() => props.shortlist, (entries) => {
  draftShortlist.value = entries.map(entry => ({ ...entry }))
}, {
  immediate: true
})

const rankedLeaderboardEntries = computed(() =>
  props.leaderboard.filter(entry => entry.rank !== null)
)

const canReviewShortlist = computed(() =>
  ['shortlist', 'winners_announced', 'completed'].includes(props.hackathonState)
)

const canReorderShortlist = computed(() =>
  props.hackathonState === 'shortlist' && draftShortlist.value.length > 0
)

const hasDraftChanges = computed(() => {
  if (draftShortlist.value.length !== props.shortlist.length) {
    return false
  }

  return draftShortlist.value.some((entry, index) => entry.submissionId !== props.shortlist[index]?.submissionId)
})

function formatScore(scoreTotal: number | null) {
  return scoreTotal === null ? 'Awaiting review' : scoreTotal.toFixed(2)
}

function moveEntry(submissionId: string, direction: -1 | 1) {
  const currentIndex = draftShortlist.value.findIndex(entry => entry.submissionId === submissionId)

  if (currentIndex === -1) {
    return
  }

  const targetIndex = currentIndex + direction

  if (targetIndex < 0 || targetIndex >= draftShortlist.value.length) {
    return
  }

  const next = [...draftShortlist.value]
  const [entry] = next.splice(currentIndex, 1)

  if (!entry) {
    return
  }

  next.splice(targetIndex, 0, entry)
  draftShortlist.value = next.map((item, index) => ({
    ...item,
    finalRank: index + 1
  }))
}

function resetDraft() {
  draftShortlist.value = props.shortlist.map(entry => ({ ...entry }))
}
</script>

<template>
  <AppCard class="border border-default/70 bg-elevated/90">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Leaderboard And Shortlist
        </h2>
        <p class="text-sm text-muted">
          Review computed scores first, then adjust only the final shortlist ranking without mutating judge scores.
        </p>
      </div>
    </template>

    <div class="space-y-8">
      <section class="space-y-4">
        <div class="space-y-1">
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Leaderboard
          </h3>
          <p class="text-sm text-toned">
            Computed ranking remains tied to completed judging scores and stays read-only from the admin competition route.
          </p>
        </div>

        <AppAlert
          v-if="leaderboardErrorMessage"
          color="error"
          variant="soft"
          title="Leaderboard unavailable"
          :description="leaderboardErrorMessage"
        />

        <AppAlert
          v-else-if="isLeaderboardLoading"
          color="neutral"
          variant="soft"
          title="Loading leaderboard"
          description="Computed competition standings are still loading."
        />

        <div
          v-else-if="rankedLeaderboardEntries.length > 0"
          class="grid gap-4"
        >
          <article
            v-for="entry in rankedLeaderboardEntries"
            :key="entry.submissionId"
            :data-testid="`admin-competition-leaderboard-${entry.submissionId}`"
            class="rounded-[1.5rem] border border-default bg-default px-5 py-5"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="space-y-2">
                <div class="space-y-1">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Base rank
                  </p>
                  <h4 class="text-lg font-semibold text-highlighted">
                    #{{ entry.rank }}
                  </h4>
                </div>
                <p class="text-sm text-toned">
                  {{ entry.projectName ?? entry.teamName }}
                </p>
              </div>

              <div class="grid gap-2 text-right text-sm text-toned">
                <p>
                  <span class="font-medium text-highlighted">Score:</span>
                  {{ formatScore(entry.scoreTotal) }}
                </p>
                <p>
                  <span class="font-medium text-highlighted">Team:</span>
                  {{ entry.teamName }}
                </p>
              </div>
            </div>
          </article>
        </div>

        <AppAlert
          v-else
          color="neutral"
          variant="soft"
          title="No ranked submissions yet"
          description="The leaderboard does not currently expose ranked competition entries."
        />
      </section>

      <section class="space-y-4">
        <div class="space-y-1">
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Shortlist
          </h3>
          <p class="text-sm text-toned">
            Final ranking controls activate only in shortlist mode. The underlying leaderboard scores remain unchanged.
          </p>
        </div>

        <AppAlert
          v-if="!canReviewShortlist"
          color="neutral"
          variant="soft"
          title="Shortlist not available yet"
          description="This hackathon has not entered shortlist mode, so only the computed leaderboard is visible."
        />

        <template v-else>
          <AppAlert
            v-if="shortlistErrorMessage"
            color="error"
            variant="soft"
            title="Shortlist unavailable"
            :description="shortlistErrorMessage"
          />

          <AppAlert
            v-else-if="isShortlistLoading"
            color="neutral"
            variant="soft"
            title="Loading shortlist"
            description="The final ranking view is still loading."
          />

          <div
            v-else-if="draftShortlist.length > 0"
            class="space-y-4"
          >
            <div class="grid gap-4">
              <article
                v-for="(entry, index) in draftShortlist"
                :key="entry.submissionId"
                :data-testid="`admin-competition-shortlist-${entry.submissionId}`"
                class="rounded-[1.5rem] border border-default bg-default px-5 py-5"
              >
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="space-y-2">
                    <div class="space-y-1">
                      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        Final rank
                      </p>
                      <h4
                        :data-testid="`admin-competition-shortlist-rank-${entry.submissionId}`"
                        class="text-lg font-semibold text-highlighted"
                      >
                        #{{ entry.finalRank }}
                      </h4>
                    </div>
                    <p class="text-sm text-toned">
                      {{ entry.projectName ?? entry.teamName }}
                    </p>
                  </div>

                  <div class="flex flex-wrap items-center gap-3">
                    <p class="text-sm text-toned">
                      Score: {{ formatScore(entry.scoreTotal) }}
                    </p>

                    <div
                      v-if="canReorderShortlist"
                      class="flex items-center gap-2"
                    >
                      <AppButton
                        variant="soft"
                        color="neutral"
                        :data-testid="`admin-competition-shortlist-move-up-${entry.submissionId}`"
                        :disabled="index === 0 || pendingActionKey !== null"
                        @click="moveEntry(entry.submissionId, -1)"
                      >
                        Move up
                      </AppButton>

                      <AppButton
                        variant="soft"
                        color="neutral"
                        :data-testid="`admin-competition-shortlist-move-down-${entry.submissionId}`"
                        :disabled="index === draftShortlist.length - 1 || pendingActionKey !== null"
                        @click="moveEntry(entry.submissionId, 1)"
                      >
                        Move down
                      </AppButton>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <div
              v-if="canReorderShortlist"
              class="flex flex-wrap gap-3"
            >
              <AppButton
                color="primary"
                data-testid="admin-competition-shortlist-save"
                :loading="pendingActionKey === 'shortlist-reorder'"
                :disabled="!hasDraftChanges || (pendingActionKey !== null && pendingActionKey !== 'shortlist-reorder')"
                @click="emit('reorder', draftShortlist.map(entry => entry.submissionId))"
              >
                Save shortlist order
              </AppButton>

              <AppButton
                variant="soft"
                color="neutral"
                :disabled="!hasDraftChanges || pendingActionKey !== null"
                @click="resetDraft"
              >
                Reset order
              </AppButton>
            </div>
          </div>

          <AppAlert
            v-else
            color="neutral"
            variant="soft"
            title="No shortlist entries"
            description="The shortlist currently has no ranked submissions to review."
          />
        </template>
      </section>
    </div>
  </AppCard>
</template>
