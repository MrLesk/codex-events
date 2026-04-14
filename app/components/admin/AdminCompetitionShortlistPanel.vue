<script setup lang="ts">
import Sortable from 'sortablejs'

import AdminEditorRowShell from '~/components/admin/AdminEditorRowShell.vue'

import type {
  HackathonState,
  LeaderboardEntry,
  ShortlistEntry
} from '~/utils/admin-workspace'

import { moveListItemByIndex } from '~/utils/reorder-list'

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
const activeFinalistDragId = ref<string | null>(null)
const finalistDropTargetId = ref<string | null>(null)
const finalistListElement = ref<HTMLElement | null>(null)
let finalistSortable: Sortable | null = null

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

const selectedFinalistOrderKey = computed(() =>
  draftFinalistSubmissionIds.value.join('|')
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

function applyDraftFinalistOrder(orderedSubmissionIds: string[]) {
  draftFinalistSubmissionIds.value = orderedSubmissionIds
}

function addFinalist(submissionId: string) {
  if (draftFinalistSubmissionIds.value.includes(submissionId)) {
    return
  }

  applyDraftFinalistOrder([...draftFinalistSubmissionIds.value, submissionId])
}

function removeFinalist(submissionId: string) {
  applyDraftFinalistOrder(
    draftFinalistSubmissionIds.value.filter(currentSubmissionId => currentSubmissionId !== submissionId)
  )
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

  applyDraftFinalistOrder(
    moveListItemByIndex(draftFinalistSubmissionIds.value, currentIndex, targetIndex)
  )
}

function destroyFinalistSortable() {
  finalistSortable?.destroy()
  finalistSortable = null
  activeFinalistDragId.value = null
  finalistDropTargetId.value = null
}

function initializeFinalistSortable() {
  if (
    !import.meta.client
    || !canManageShortlist.value
    || !finalistListElement.value
    || selectedFinalists.value.length === 0
    || props.pendingActionKey !== null
  ) {
    destroyFinalistSortable()
    return
  }

  destroyFinalistSortable()

  finalistSortable = Sortable.create(finalistListElement.value, {
    animation: 180,
    handle: '[data-finalist-sort-handle]',
    draggable: '[data-finalist-row]',
    dataIdAttr: 'data-finalist-id',
    ghostClass: 'opacity-45',
    chosenClass: 'cursor-grabbing',
    dragClass: 'cursor-grabbing',
    onChoose(event) {
      activeFinalistDragId.value = event.item.dataset.finalistId ?? null
      finalistDropTargetId.value = null
    },
    onMove(event) {
      const relatedId = event.related?.dataset.finalistId ?? null
      finalistDropTargetId.value = relatedId !== activeFinalistDragId.value ? relatedId : null
      return true
    },
    onEnd(event) {
      const oldIndex = event.oldDraggableIndex ?? event.oldIndex
      const newIndex = event.newDraggableIndex ?? event.newIndex

      if (oldIndex !== undefined && newIndex !== undefined) {
        applyDraftFinalistOrder(moveListItemByIndex(draftFinalistSubmissionIds.value, oldIndex, newIndex))
      }

      activeFinalistDragId.value = null
      finalistDropTargetId.value = null
    }
  })
}

function resetDraft() {
  applyDraftFinalistOrder([...currentFinalistSubmissionIds.value])
}

watch([selectedFinalistOrderKey, canManageShortlist, () => props.pendingActionKey], async () => {
  await nextTick()
  initializeFinalistSortable()
}, {
  immediate: true,
  flush: 'post'
})

onBeforeUnmount(() => {
  destroyFinalistSortable()
})
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
          <div
            ref="finalistListElement"
            class="grid gap-3"
          >
            <article
              v-for="(entry, index) in selectedFinalists"
              :key="entry.submissionId"
              :data-testid="`admin-competition-shortlist-${entry.submissionId}`"
              :data-finalist-id="entry.submissionId"
              data-finalist-row
              class="rounded-xl border bg-white/88 p-3 transition-all dark:bg-[#111111]"
              :class="[
                finalistDropTargetId === entry.submissionId
                  ? 'border-dashed border-black/30 ring-2 ring-black/6 dark:border-white/[0.32] dark:ring-white/[0.08]'
                  : 'border-black/8 dark:border-white/[0.08]',
                activeFinalistDragId === entry.submissionId
                  ? 'shadow-[0_16px_40px_-34px_rgba(15,23,42,0.55)]'
                  : ''
              ]"
            >
              <div
                v-if="finalistDropTargetId === entry.submissionId"
                class="mb-3 rounded-lg border border-dashed border-black/18 bg-black/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted dark:border-white/[0.14] dark:bg-white/[0.03]"
              >
                Drop finalist here
              </div>

              <AdminEditorRowShell>
                <template #controls>
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                    :aria-label="`Move finalist ${index + 1} up`"
                    :data-testid="`admin-competition-shortlist-move-up-${entry.submissionId}`"
                    :disabled="index === 0 || pendingActionKey !== null"
                    @click="moveFinalist(entry.submissionId, -1)"
                  >
                    <AppIcon
                      name="i-lucide-arrow-up"
                      class="size-4"
                    />
                  </button>

                  <button
                    type="button"
                    data-finalist-sort-handle
                    class="group inline-flex h-11 w-11 cursor-grab items-center justify-center rounded-xl border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                    :aria-label="`Drag to reorder finalist ${index + 1}`"
                    :disabled="pendingActionKey !== null"
                  >
                    <AppIcon
                      name="i-lucide-grip-vertical"
                      class="size-4.5 transition group-hover:scale-105"
                    />
                  </button>

                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                    :aria-label="`Move finalist ${index + 1} down`"
                    :data-testid="`admin-competition-shortlist-move-down-${entry.submissionId}`"
                    :disabled="index === selectedFinalists.length - 1 || pendingActionKey !== null"
                    @click="moveFinalist(entry.submissionId, 1)"
                  >
                    <AppIcon
                      name="i-lucide-arrow-down"
                      class="size-4"
                    />
                  </button>
                </template>

                <div class="grid gap-2">
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

                <template #actions>
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 bg-white text-toned transition hover:border-red-400/50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-red-400/40 dark:hover:text-red-300"
                    :aria-label="`Remove finalist ${index + 1}`"
                    :disabled="pendingActionKey !== null"
                    @click="removeFinalist(entry.submissionId)"
                  >
                    <AppIcon
                      name="i-lucide-trash-2"
                      class="size-4"
                    />
                  </button>
                </template>
              </AdminEditorRowShell>
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
