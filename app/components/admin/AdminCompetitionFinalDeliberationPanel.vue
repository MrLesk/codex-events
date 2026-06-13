<script setup lang="ts">
import type { SortableEvent } from 'sortablejs'

import AdminSortableEditorRow from '~/components/admin/AdminSortableEditorRow.vue'

import type {
  EventRecord
} from '~/domains/events/records'
import type { FinalDeliberationEntry } from '~/domains/outcomes/admin-outcomes'

import { useAdminSortableLists } from '~/composables/useAdminSortableLists'
import { moveListItemByIndex } from '~/utils/reorder-list'

const props = defineProps<{
  event: EventRecord
  entries: FinalDeliberationEntry[]
  finalRankingSubmissionIds: string[]
  isLoading?: boolean
  errorMessage?: string
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  reorder: [orderedSubmissionIds: string[]]
  draftChange: [payload: { orderedSubmissionIds: string[], hasDraftChanges: boolean }]
}>()

const draftOrderedSubmissionIds = ref<string[]>([])
const rankedListElement = ref<HTMLElement | null>(null)
const activeDragSubmissionId = ref<string | null>(null)

const rankedEntries = computed(() =>
  props.entries.filter((entry): entry is FinalDeliberationEntry & { finalRank: number, scoreTotal: number } =>
    entry.finalRank !== null && entry.scoreTotal !== null
  )
)

const rankedEntriesBySubmissionId = computed(() =>
  new Map(rankedEntries.value.map(entry => [entry.submissionId, entry] as const))
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
    .filter((entry): entry is FinalDeliberationEntry & { finalRank: number, scoreTotal: number } => Boolean(entry))
)

const draftStateKey = computed(() =>
  draftOrderedSubmissionIds.value.join('|')
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

const canSaveOrder = computed(() =>
  props.finalRankingSubmissionIds.length === 0 || hasDraftChanges.value
)

watch([draftStateKey, hasDraftChanges], () => {
  emit('draftChange', {
    orderedSubmissionIds: [...draftOrderedSubmissionIds.value],
    hasDraftChanges: hasDraftChanges.value
  })
}, {
  immediate: true
})

const scoreModelDescription = computed(() => {
  if (props.event.blindReviewCount > 0 && props.event.pitchReviewEnabled) {
    return `Combined score uses ${props.event.blindScoreWeightPercent}% blind score and ${props.event.pitchScoreWeightPercent}% pitch score.`
  }

  if (props.event.pitchReviewEnabled) {
    return 'Final ranking uses the average submitted pitch votes only.'
  }

  return 'Final ranking uses the averaged blind-review score only.'
})

function formatScore(score: number | null | undefined) {
  return typeof score === 'number' ? score.toFixed(2) : 'Awaiting score'
}

function formatProjectName(projectName: string | null, submissionId: string) {
  return projectName ?? submissionId
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

  draftOrderedSubmissionIds.value = moveListItemByIndex(
    draftOrderedSubmissionIds.value,
    currentIndex,
    targetIndex
  )
}

function canMoveEntryUp(submissionId: string) {
  return draftOrderedSubmissionIds.value[0] !== submissionId
}

function canMoveEntryDown(submissionId: string) {
  return draftOrderedSubmissionIds.value.at(-1) !== submissionId
}

function handleSortableEnd(event: SortableEvent) {
  activeDragSubmissionId.value = null

  const oldIndex = event.oldDraggableIndex ?? event.oldIndex
  const newIndex = event.newDraggableIndex ?? event.newIndex

  if (oldIndex === undefined || newIndex === undefined) {
    return
  }

  draftOrderedSubmissionIds.value = moveListItemByIndex(
    draftOrderedSubmissionIds.value,
    oldIndex,
    newIndex
  )
}

useAdminSortableLists({
  elements: computed(() => [rankedListElement.value]),
  enabled: computed(() =>
    props.pendingActionKey === null && orderedRankedEntries.value.length > 0
  ),
  sources: [draftStateKey, () => props.pendingActionKey],
  createOptions() {
    return {
      animation: 180,
      handle: '[data-final-deliberation-sort-handle]',
      draggable: '[data-final-deliberation-row]',
      dataIdAttr: 'data-final-deliberation-id',
      ghostClass: 'opacity-45',
      chosenClass: 'cursor-grabbing',
      dragClass: 'cursor-grabbing',
      onChoose(sortableEvent) {
        activeDragSubmissionId.value = sortableEvent.item.dataset.finalDeliberationId ?? null
      },
      onEnd: handleSortableEnd
    }
  },
  onDestroy() {
    activeDragSubmissionId.value = null
  }
})

function resetDraft() {
  draftOrderedSubmissionIds.value = props.finalRankingSubmissionIds.length > 0
    ? [...props.finalRankingSubmissionIds]
    : rankedEntries.value.map(entry => entry.submissionId)
}
</script>

<template>
  <AppCard class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
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
          ref="rankedListElement"
          class="grid gap-3 rounded-xl border border-black/8 bg-white/65 p-3 dark:border-white/[0.08] dark:bg-white/[0.02]"
          :class="activeDragSubmissionId ? 'border-black/16 dark:border-white/[0.16]' : ''"
        >
          <AdminSortableEditorRow
            v-for="(entry, index) in orderedRankedEntries"
            :key="entry.submissionId"
            :item-id="entry.submissionId"
            :test-id="`admin-competition-final-deliberation-${entry.submissionId}`"
            item-id-attribute="data-final-deliberation-id"
            row-attribute="data-final-deliberation-row"
            sort-handle-attribute="data-final-deliberation-sort-handle"
            columns-class="sm:grid-cols-[4.25rem_minmax(0,1fr)]"
            :active="activeDragSubmissionId === entry.submissionId"
            :move-up-label="`Move final rank ${index + 1} up`"
            :move-up-test-id="`admin-competition-final-deliberation-move-up-${entry.submissionId}`"
            :move-up-disabled="!canMoveEntryUp(entry.submissionId) || pendingActionKey !== null"
            :drag-label="`Drag final rank ${index + 1}`"
            :drag-disabled="pendingActionKey !== null"
            :move-down-label="`Move final rank ${index + 1} down`"
            :move-down-test-id="`admin-competition-final-deliberation-move-down-${entry.submissionId}`"
            :move-down-disabled="!canMoveEntryDown(entry.submissionId) || pendingActionKey !== null"
            @move-up="moveEntry(entry.submissionId, -1)"
            @move-down="moveEntry(entry.submissionId, 1)"
          >
            <div class="grid gap-4">
              <div class="flex flex-wrap items-baseline gap-3">
                <p
                  :data-testid="`admin-competition-final-deliberation-rank-${entry.submissionId}`"
                  class="text-sm font-semibold text-highlighted"
                >
                  #{{ index + 1 }}
                </p>

                <p class="min-w-0 flex-1 text-sm font-semibold text-highlighted">
                  {{ formatProjectName(entry.projectName, entry.submissionId) }}
                </p>

                <p
                  v-if="entry.teamName"
                  class="text-xs font-semibold uppercase tracking-[0.18em] text-muted"
                >
                  {{ entry.teamName }}
                </p>
              </div>

              <div class="grid gap-3 md:grid-cols-3">
                <div
                  v-if="event.blindReviewCount > 0"
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
                  v-if="event.pitchReviewEnabled"
                  class="rounded-lg border border-black/8 bg-white/62 px-4 py-3 dark:border-white/[0.08] dark:bg-black/10"
                >
                  <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    Pitch score
                  </p>
                  <p class="mt-1 text-lg font-semibold text-highlighted">
                    {{ formatScore(entry.pitchScore) }}
                  </p>
                </div>

                <div
                  class="rounded-xl border border-black/10 bg-gradient-to-br from-white via-white to-white/80 px-4 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.5)] dark:border-white/[0.12] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.11),rgba(255,255,255,0.04))] dark:shadow-[0_22px_48px_-36px_rgba(0,0,0,0.75)]"
                  :class="event.blindReviewCount > 0 && event.pitchReviewEnabled ? 'md:col-span-1' : 'md:col-span-2'"
                >
                  <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    Combined score
                  </p>
                  <p class="mt-2 text-2xl font-semibold tracking-tight text-highlighted">
                    {{ formatScore(entry.scoreTotal) }}
                  </p>
                  <p class="mt-2 text-xs text-toned">
                    Final ordering can diverge from score order if you manually reorder the ranking.
                  </p>
                </div>
              </div>
            </div>
          </AdminSortableEditorRow>
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
            :disabled="!canSaveOrder || (pendingActionKey !== null && pendingActionKey !== 'final-deliberation-reorder')"
            @click="emit('reorder', draftOrderedSubmissionIds)"
          >
            Save final order
          </AppButton>

          <AppButton
            variant="outline"
            color="neutral"
            class="dark:border-white/[0.24] dark:text-white dark:hover:border-white/[0.34] dark:hover:bg-white/[0.04]"
            :disabled="!hasDraftChanges || pendingActionKey !== null"
            @click="resetDraft"
          >
            Reset order
          </AppButton>
        </div>
      </template>
    </div>
  </AppCard>
</template>
