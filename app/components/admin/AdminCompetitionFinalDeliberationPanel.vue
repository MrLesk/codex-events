<script setup lang="ts">
import type {
  FinalDeliberationEntry,
  HackathonRecord
} from '~/utils/admin-workspace'

const props = defineProps<{
  hackathon: HackathonRecord
  entries: FinalDeliberationEntry[]
  finalRankingSubmissionIds: string[]
  isLoading?: boolean
  errorMessage?: string
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  reorder: [orderedSubmissionIds: string[]]
}>()

const draftOrderedSubmissionIds = ref<string[]>([])
const draggedSubmissionId = ref<string | null>(null)
const dropTargetSubmissionId = ref<string | null>(null)

const rankedEntries = computed(() =>
  props.entries.filter((entry): entry is FinalDeliberationEntry & { finalRank: number, scoreRank: number, scoreTotal: number } =>
    entry.finalRank !== null && entry.scoreRank !== null && entry.scoreTotal !== null
  )
)

const rankedEntriesBySubmissionId = computed(() =>
  new Map(rankedEntries.value.map(entry => [entry.submissionId, entry] as const))
)

const unrankedEntries = computed(() =>
  props.entries.filter(entry => entry.finalRank === null)
)

watch([rankedEntries, () => props.finalRankingSubmissionIds], ([entries, finalRankingSubmissionIds]) => {
  draftOrderedSubmissionIds.value = finalRankingSubmissionIds.length > 0
    ? [...finalRankingSubmissionIds]
    : entries.map(entry => entry.submissionId)
}, {
  immediate: true
})

const orderedRankedEntries = computed(() =>
  draftOrderedSubmissionIds.value
    .map(submissionId => rankedEntriesBySubmissionId.value.get(submissionId))
    .filter((entry): entry is FinalDeliberationEntry & { finalRank: number, scoreRank: number, scoreTotal: number } => Boolean(entry))
)

const hasDraftChanges = computed(() => {
  const persistedOrder = props.finalRankingSubmissionIds.length > 0
    ? props.finalRankingSubmissionIds
    : rankedEntries.value.map(entry => entry.submissionId)

  if (persistedOrder.length !== draftOrderedSubmissionIds.value.length) {
    return true
  }

  return persistedOrder.some((submissionId, index) => submissionId !== draftOrderedSubmissionIds.value[index])
})

const scoreModelDescription = computed(() => {
  if (props.hackathon.blindReviewCount > 0 && props.hackathon.pitchReviewEnabled) {
    return `Combined score uses ${props.hackathon.blindScoreWeightPercent}% blind score and ${props.hackathon.pitchScoreWeightPercent}% pitch score.`
  }

  if (props.hackathon.pitchReviewEnabled) {
    return 'Final ranking uses the average submitted pitch votes only.'
  }

  return 'Final ranking uses the averaged blind-review score only.'
})

function formatScore(score: number | null | undefined) {
  return typeof score === 'number' ? score.toFixed(2) : 'Awaiting score'
}

function moveEntry(submissionId: string, direction: -1 | 1) {
  const currentIndex = draftOrderedSubmissionIds.value.findIndex(currentSubmissionId => currentSubmissionId === submissionId)

  if (currentIndex === -1) {
    return
  }

  const targetIndex = currentIndex + direction

  if (targetIndex < 0 || targetIndex >= draftOrderedSubmissionIds.value.length) {
    return
  }

  const next = [...draftOrderedSubmissionIds.value]
  const [entry] = next.splice(currentIndex, 1)

  if (!entry) {
    return
  }

  next.splice(targetIndex, 0, entry)
  draftOrderedSubmissionIds.value = next
}

function reorderEntry(sourceSubmissionId: string, targetSubmissionId: string) {
  if (!sourceSubmissionId || sourceSubmissionId === targetSubmissionId) {
    return
  }

  const sourceIndex = draftOrderedSubmissionIds.value.findIndex(submissionId => submissionId === sourceSubmissionId)
  const targetIndex = draftOrderedSubmissionIds.value.findIndex(submissionId => submissionId === targetSubmissionId)

  if (sourceIndex < 0 || targetIndex < 0) {
    return
  }

  const next = [...draftOrderedSubmissionIds.value]
  const [entry] = next.splice(sourceIndex, 1)

  if (!entry) {
    return
  }

  next.splice(targetIndex, 0, entry)
  draftOrderedSubmissionIds.value = next
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

  reorderEntry(sourceSubmissionId, targetSubmissionId)
}

function onDragEnd() {
  draggedSubmissionId.value = null
  dropTargetSubmissionId.value = null
}

function resetDraft() {
  draftOrderedSubmissionIds.value = props.finalRankingSubmissionIds.length > 0
    ? [...props.finalRankingSubmissionIds]
    : rankedEntries.value.map(entry => entry.submissionId)
}
</script>

<template>
  <AppCard class="rounded-xl hackathon-workspace-detail-panel">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Final Deliberation
        </h2>
        <p class="text-sm text-muted">
          {{ scoreModelDescription }}
          Final ordering can be adjusted here without changing any stored judge scores.
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <AppAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        title="Final deliberation unavailable"
        :description="errorMessage"
      />

      <AppAlert
        v-else-if="isLoading"
        color="neutral"
        variant="soft"
        title="Loading final deliberation"
        description="Final combined scoring data is still loading."
      />

      <template v-else>
        <div
          v-if="orderedRankedEntries.length > 0"
          class="grid gap-4"
        >
          <article
            v-for="(entry, index) in orderedRankedEntries"
            :key="entry.submissionId"
            :data-testid="`admin-competition-final-deliberation-${entry.submissionId}`"
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
                    Final rank
                  </p>
                  <h4 class="text-lg font-semibold text-highlighted">
                    #{{ index + 1 }}
                  </h4>
                </div>

                <div class="space-y-1">
                  <p class="text-base font-semibold text-highlighted">
                    {{ entry.projectName ?? entry.submissionId }}
                  </p>
                  <p class="text-sm text-toned">
                    {{ entry.teamName }}
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  class="rounded-md border border-black/8 bg-white px-2 py-1 text-xs font-medium text-toned transition hover:border-black/25 hover:text-highlighted dark:border-white/[0.08] dark:bg-[#111111] dark:hover:border-white/[0.25]"
                  :disabled="pendingActionKey !== null"
                  draggable="true"
                  @dragstart="onDragStart(entry.submissionId, $event)"
                  @dragend="onDragEnd"
                >
                  Drag
                </button>

                <div class="flex items-center gap-2">
                  <AppButton
                    variant="soft"
                    color="neutral"
                    :disabled="index === 0 || pendingActionKey !== null"
                    @click="moveEntry(entry.submissionId, -1)"
                  >
                    Move up
                  </AppButton>

                  <AppButton
                    variant="soft"
                    color="neutral"
                    :disabled="index === orderedRankedEntries.length - 1 || pendingActionKey !== null"
                    @click="moveEntry(entry.submissionId, 1)"
                  >
                    Move down
                  </AppButton>
                </div>
              </div>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div class="rounded-lg border border-black/8 bg-white/62 px-4 py-3 dark:border-white/[0.08] dark:bg-black/10">
                <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Score rank
                </p>
                <p class="mt-1 text-lg font-semibold text-highlighted">
                  #{{ entry.scoreRank }}
                </p>
              </div>

              <div class="rounded-lg border border-black/8 bg-white/62 px-4 py-3 dark:border-white/[0.08] dark:bg-black/10">
                <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Combined score
                </p>
                <p class="mt-1 text-lg font-semibold text-highlighted">
                  {{ formatScore(entry.scoreTotal) }}
                </p>
              </div>

              <div
                v-if="hackathon.blindReviewCount > 0"
                class="rounded-lg border border-black/8 bg-white/62 px-4 py-3 dark:border-white/[0.08] dark:bg-black/10"
              >
                <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Blind score
                </p>
                <p class="mt-1 text-lg font-semibold text-highlighted">
                  {{ formatScore(entry.blindScore) }}
                </p>
              </div>

              <div
                v-if="hackathon.pitchReviewEnabled"
                class="rounded-lg border border-black/8 bg-white/62 px-4 py-3 dark:border-white/[0.08] dark:bg-black/10"
              >
                <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Pitch score
                </p>
                <p class="mt-1 text-lg font-semibold text-highlighted">
                  {{ formatScore(entry.pitchScore) }}
                </p>
              </div>
            </div>
          </article>
        </div>

        <AppAlert
          v-else
          color="neutral"
          variant="soft"
          title="No ranked submissions"
          description="There are no ranked submissions available for final deliberation yet."
        />

        <div
          v-if="orderedRankedEntries.length > 0"
          class="flex flex-wrap gap-3"
        >
          <AppButton
            color="primary"
            data-testid="admin-competition-final-deliberation-save"
            :loading="pendingActionKey === 'final-deliberation-reorder'"
            :disabled="!hasDraftChanges || (pendingActionKey !== null && pendingActionKey !== 'final-deliberation-reorder')"
            @click="emit('reorder', draftOrderedSubmissionIds)"
          >
            Save final order
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

        <section
          v-if="unrankedEntries.length > 0"
          class="space-y-4"
        >
          <div class="space-y-1">
            <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
              Unranked submissions
            </h3>
            <p class="text-sm text-toned">
              These entries remain outside the final ranking because a final score is not yet available.
            </p>
          </div>

          <div class="grid gap-4">
            <article
              v-for="entry in unrankedEntries"
              :key="entry.submissionId"
              class="rounded-none border-0 bg-transparent px-5 py-5 dark:border-0 dark:bg-transparent"
            >
              <p class="text-base font-semibold text-highlighted">
                {{ entry.projectName ?? entry.submissionId }}
              </p>
              <p class="mt-1 text-sm text-toned">
                {{ entry.teamName }} • Awaiting enough submitted scores to rank this submission.
              </p>
            </article>
          </div>
        </section>
      </template>
    </div>
  </AppCard>
</template>
