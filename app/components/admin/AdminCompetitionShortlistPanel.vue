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
  selectFinalists: [orderedSubmissionIds: string[]]
  startPitch: []
}>()

const draftFinalistSubmissionIds = ref<string[]>([])
const draggedSubmissionId = ref<string | null>(null)
const dropTargetSubmissionId = ref<string | null>(null)

watch(() => props.shortlist, (entries) => {
  draftFinalistSubmissionIds.value = [...entries]
    .filter(entry => entry.isPitchFinalist)
    .sort((left, right) => (left.pitchFinalistRank ?? Number.MAX_SAFE_INTEGER) - (right.pitchFinalistRank ?? Number.MAX_SAFE_INTEGER))
    .map(entry => entry.submissionId)
}, {
  immediate: true
})

const shortlistedEntriesBySubmissionId = computed(() =>
  new Map(props.shortlist.map(entry => [entry.submissionId, entry] as const))
)

const rankedLeaderboardEntries = computed(() =>
  props.leaderboard.filter(entry => entry.rank !== null)
)

const canManageShortlist = computed(() =>
  props.hackathonState === 'shortlist'
)

const selectedFinalists = computed(() =>
  draftFinalistSubmissionIds.value
    .map(submissionId => shortlistedEntriesBySubmissionId.value.get(submissionId))
    .filter((entry): entry is ShortlistEntry => Boolean(entry))
)

const currentFinalistSubmissionIds = computed(() =>
  [...props.shortlist]
    .filter(entry => entry.isPitchFinalist)
    .sort((left, right) => (left.pitchFinalistRank ?? Number.MAX_SAFE_INTEGER) - (right.pitchFinalistRank ?? Number.MAX_SAFE_INTEGER))
    .map(entry => entry.submissionId)
)

const hasDraftChanges = computed(() => {
  if (draftFinalistSubmissionIds.value.length !== currentFinalistSubmissionIds.value.length) {
    return true
  }

  return draftFinalistSubmissionIds.value.some((submissionId, index) => submissionId !== currentFinalistSubmissionIds.value[index])
})

const canStartPitch = computed(() =>
  canManageShortlist.value
  && selectedFinalists.value.length > 0
  && !hasDraftChanges.value
  && (props.pendingActionKey === null || props.pendingActionKey === 'start-pitch')
)

function formatScore(scoreTotal: number | null) {
  return scoreTotal === null ? 'Awaiting review' : scoreTotal.toFixed(2)
}

function getBlindSubmissionLabel(entry: Pick<ShortlistEntry, 'rank'> | Pick<LeaderboardEntry, 'rank'>) {
  return entry.rank === null ? 'Blind submission' : `Blind submission #${entry.rank}`
}

function getDraftPitchFinalistRank(submissionId: string) {
  const index = draftFinalistSubmissionIds.value.findIndex(currentSubmissionId => currentSubmissionId === submissionId)
  return index === -1 ? null : index + 1
}

function addFinalist(submissionId: string) {
  if (draftFinalistSubmissionIds.value.includes(submissionId)) {
    return
  }

  draftFinalistSubmissionIds.value = [...draftFinalistSubmissionIds.value, submissionId]
}

function removeFinalist(submissionId: string) {
  draftFinalistSubmissionIds.value = draftFinalistSubmissionIds.value.filter(currentSubmissionId => currentSubmissionId !== submissionId)
}

function moveFinalist(submissionId: string, direction: -1 | 1) {
  const currentIndex = draftFinalistSubmissionIds.value.findIndex(currentSubmissionId => currentSubmissionId === submissionId)

  if (currentIndex === -1) {
    return
  }

  const targetIndex = currentIndex + direction

  if (targetIndex < 0 || targetIndex >= draftFinalistSubmissionIds.value.length) {
    return
  }

  const next = [...draftFinalistSubmissionIds.value]
  const [entry] = next.splice(currentIndex, 1)

  if (!entry) {
    return
  }

  next.splice(targetIndex, 0, entry)
  draftFinalistSubmissionIds.value = next
}

function reorderFinalist(sourceSubmissionId: string, targetSubmissionId: string) {
  if (!sourceSubmissionId || sourceSubmissionId === targetSubmissionId) {
    return
  }

  const sourceIndex = draftFinalistSubmissionIds.value.findIndex(submissionId => submissionId === sourceSubmissionId)
  const targetIndex = draftFinalistSubmissionIds.value.findIndex(submissionId => submissionId === targetSubmissionId)

  if (sourceIndex < 0 || targetIndex < 0) {
    return
  }

  const next = [...draftFinalistSubmissionIds.value]
  const [entry] = next.splice(sourceIndex, 1)

  if (!entry) {
    return
  }

  next.splice(targetIndex, 0, entry)
  draftFinalistSubmissionIds.value = next
}

function onDragStart(submissionId: string, event: DragEvent) {
  draggedSubmissionId.value = submissionId
  dropTargetSubmissionId.value = null

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', submissionId)
  }
}

function onDragOver(submissionId: string) {
  if (!draggedSubmissionId.value || draggedSubmissionId.value === submissionId) {
    dropTargetSubmissionId.value = null
    return
  }

  dropTargetSubmissionId.value = submissionId
}

function onDragLeave(submissionId: string) {
  if (dropTargetSubmissionId.value === submissionId) {
    dropTargetSubmissionId.value = null
  }
}

function onDrop(targetSubmissionId: string, event: DragEvent) {
  event.preventDefault()

  const sourceFromEvent = event.dataTransfer?.getData('text/plain')?.trim() ?? ''
  const sourceSubmissionId = draggedSubmissionId.value ?? sourceFromEvent

  draggedSubmissionId.value = null
  dropTargetSubmissionId.value = null

  if (!sourceSubmissionId) {
    return
  }

  reorderFinalist(sourceSubmissionId, targetSubmissionId)
}

function onDragEnd() {
  draggedSubmissionId.value = null
  dropTargetSubmissionId.value = null
}

function resetDraft() {
  draftFinalistSubmissionIds.value = [...currentFinalistSubmissionIds.value]
}
</script>

<template>
  <AppCard class="rounded-xl hackathon-workspace-detail-panel">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Shortlist
        </h2>
        <p class="text-sm text-muted">
          Keep this stage blind. Review the blind leaderboard, choose which submissions advance to the live pitch stage, and order only the finalists.
        </p>
      </div>
    </template>

    <div class="space-y-8">
      <section class="space-y-4">
        <div class="space-y-1">
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Blind Leaderboard
          </h3>
          <p class="text-sm text-toned">
            Blind ranking remains read-only here. Team identity and pitch-stage details stay hidden until pitch review starts.
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
          title="Loading blind leaderboard"
          description="Computed blind-review standings are still loading."
        />

        <div
          v-else-if="rankedLeaderboardEntries.length > 0"
          class="grid gap-4"
        >
          <article
            v-for="entry in rankedLeaderboardEntries"
            :key="entry.submissionId"
            :data-testid="`admin-competition-leaderboard-${entry.submissionId}`"
            class="rounded-none border-0 bg-transparent px-5 py-5 dark:border-0 dark:bg-transparent"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="space-y-2">
                <div class="space-y-1">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Blind rank
                  </p>
                  <h4 class="text-lg font-semibold text-highlighted">
                    #{{ entry.rank }}
                  </h4>
                </div>
                <p class="text-sm text-toned">
                  {{ getBlindSubmissionLabel(entry) }}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-3 text-sm text-toned">
                <p>
                  <span class="font-medium text-highlighted">Score:</span>
                  {{ formatScore(entry.scoreTotal) }}
                </p>

                <AppBadge
                  v-if="getDraftPitchFinalistRank(entry.submissionId) !== null"
                  color="secondary"
                  variant="soft"
                >
                  Pitch finalist #{{ getDraftPitchFinalistRank(entry.submissionId) }}
                </AppBadge>

                <AppButton
                  v-if="canManageShortlist && !draftFinalistSubmissionIds.includes(entry.submissionId)"
                  variant="soft"
                  color="primary"
                  :disabled="pendingActionKey !== null"
                  @click="addFinalist(entry.submissionId)"
                >
                  Add finalist
                </AppButton>

                <AppButton
                  v-else-if="canManageShortlist"
                  variant="soft"
                  color="neutral"
                  :disabled="pendingActionKey !== null"
                  @click="removeFinalist(entry.submissionId)"
                >
                  Remove finalist
                </AppButton>
              </div>
            </div>
          </article>
        </div>

        <AppAlert
          v-else
          color="neutral"
          variant="soft"
          title="No ranked blind submissions yet"
          description="The shortlist does not currently expose ranked blind-review entries."
        />
      </section>

      <section class="space-y-4">
        <div class="space-y-1">
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Pitch Finalists
          </h3>
          <p class="text-sm text-toned">
            Only the ordered finalists saved here advance to the live pitch stage.
          </p>
        </div>

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
          title="Loading finalist selection"
          description="Saved pitch finalists are still loading."
        />

        <div
          v-else-if="selectedFinalists.length > 0"
          class="space-y-4"
        >
          <div class="grid gap-4">
            <article
              v-for="(entry, index) in selectedFinalists"
              :key="entry.submissionId"
              :data-testid="`admin-competition-shortlist-${entry.submissionId}`"
              class="rounded-lg border border-black/8 bg-white/85 px-5 py-5 transition-colors dark:border-white/[0.08] dark:bg-[#111111]"
              :class="dropTargetSubmissionId === entry.submissionId ? 'border-black/25 dark:border-white/[0.25]' : ''"
              @dragover.prevent="onDragOver(entry.submissionId)"
              @dragleave="onDragLeave(entry.submissionId)"
              @drop="onDrop(entry.submissionId, $event)"
            >
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="space-y-2">
                  <div class="space-y-1">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Pitch finalist rank
                    </p>
                    <h4
                      :data-testid="`admin-competition-shortlist-rank-${entry.submissionId}`"
                      class="text-lg font-semibold text-highlighted"
                    >
                      #{{ index + 1 }}
                    </h4>
                  </div>
                  <p class="text-sm text-toned">
                    {{ getBlindSubmissionLabel(entry) }} • blind score {{ formatScore(entry.scoreTotal) }}
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button
                    v-if="canManageShortlist"
                    type="button"
                    class="rounded-md border border-black/8 bg-white px-2 py-1 text-xs font-medium text-toned transition hover:border-black/25 hover:text-highlighted dark:border-white/[0.08] dark:bg-[#111111] dark:hover:border-white/[0.25]"
                    :disabled="pendingActionKey !== null"
                    draggable="true"
                    @dragstart="onDragStart(entry.submissionId, $event)"
                    @dragend="onDragEnd"
                  >
                    Drag
                  </button>

                  <div
                    v-if="canManageShortlist"
                    class="flex items-center gap-2"
                  >
                    <AppButton
                      variant="soft"
                      color="neutral"
                      :data-testid="`admin-competition-shortlist-move-up-${entry.submissionId}`"
                      :disabled="index === 0 || pendingActionKey !== null"
                      @click="moveFinalist(entry.submissionId, -1)"
                    >
                      Move up
                    </AppButton>

                    <AppButton
                      variant="soft"
                      color="neutral"
                      :data-testid="`admin-competition-shortlist-move-down-${entry.submissionId}`"
                      :disabled="index === selectedFinalists.length - 1 || pendingActionKey !== null"
                      @click="moveFinalist(entry.submissionId, 1)"
                    >
                      Move down
                    </AppButton>

                    <AppButton
                      variant="soft"
                      color="neutral"
                      :disabled="pendingActionKey !== null"
                      @click="removeFinalist(entry.submissionId)"
                    >
                      Remove
                    </AppButton>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div
            v-if="canManageShortlist"
            class="flex flex-wrap gap-3"
          >
            <AppButton
              color="primary"
              data-testid="admin-competition-shortlist-save"
              :loading="pendingActionKey === 'shortlist-select'"
              :disabled="!hasDraftChanges || (pendingActionKey !== null && pendingActionKey !== 'shortlist-select')"
              @click="emit('selectFinalists', draftFinalistSubmissionIds)"
            >
              Save finalists
            </AppButton>

            <AppButton
              variant="soft"
              color="neutral"
              :disabled="!hasDraftChanges || pendingActionKey !== null"
              @click="resetDraft"
            >
              Reset changes
            </AppButton>

            <AppButton
              color="secondary"
              :loading="pendingActionKey === 'start-pitch'"
              :disabled="!canStartPitch"
              @click="emit('startPitch')"
            >
              Start pitch
            </AppButton>
          </div>
        </div>

        <AppAlert
          v-else
          color="neutral"
          variant="soft"
          title="No finalists selected yet"
          description="Choose one or more blind submissions from the leaderboard before the live pitch stage can start."
        />
      </section>
    </div>
  </AppCard>
</template>
