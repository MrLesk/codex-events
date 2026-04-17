<script setup lang="ts">
import Sortable, { type SortableEvent } from 'sortablejs'

import AdminEditorRowShell from '~/components/admin/AdminEditorRowShell.vue'

import type {
  HackathonState,
  ShortlistEntry
} from '~/utils/admin-workspace'

import { moveListItemByIndex } from '~/utils/reorder-list'

const props = defineProps<{
  hackathonState: HackathonState
  shortlist: ShortlistEntry[]
  isShortlistLoading?: boolean
  shortlistErrorMessage?: string
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  selectFinalists: [payload: { orderedSubmissionIds: string[], finalistSubmissionIds: string[] }]
  startPitch: []
}>()

type ShortlistSectionKey = 'finalists' | 'not-finalists'

const draftFinalistSubmissionIds = ref<string[]>([])
const draftNotFinalistSubmissionIds = ref<string[]>([])
const activeDragSubmissionId = ref<string | null>(null)
const finalistListElement = ref<HTMLElement | null>(null)
const notFinalistListElement = ref<HTMLElement | null>(null)
let finalistSortable: Sortable | null = null
let notFinalistSortable: Sortable | null = null

watch(() => props.shortlist, (entries) => {
  draftFinalistSubmissionIds.value = entries
    .filter(entry => entry.isPitchFinalist)
    .map(entry => entry.submissionId)
  draftNotFinalistSubmissionIds.value = entries
    .filter(entry => !entry.isPitchFinalist)
    .map(entry => entry.submissionId)
}, {
  immediate: true
})

const shortlistEntriesBySubmissionId = computed(() =>
  new Map(props.shortlist.map(entry => [entry.submissionId, entry] as const))
)

const finalistEntries = computed(() =>
  draftFinalistSubmissionIds.value
    .map(submissionId => shortlistEntriesBySubmissionId.value.get(submissionId))
    .filter((entry): entry is ShortlistEntry => Boolean(entry))
)

const notFinalistEntries = computed(() =>
  draftNotFinalistSubmissionIds.value
    .map(submissionId => shortlistEntriesBySubmissionId.value.get(submissionId))
    .filter((entry): entry is ShortlistEntry => Boolean(entry))
)

const currentFinalistSubmissionIds = computed(() =>
  props.shortlist
    .filter(entry => entry.isPitchFinalist)
    .map(entry => entry.submissionId)
)

const currentNotFinalistSubmissionIds = computed(() =>
  props.shortlist
    .filter(entry => !entry.isPitchFinalist)
    .map(entry => entry.submissionId)
)

const draftOrderedSubmissionIds = computed(() => [
  ...draftFinalistSubmissionIds.value,
  ...draftNotFinalistSubmissionIds.value
])

const canManageShortlist = computed(() =>
  props.hackathonState === 'shortlist'
)

const draftStateKey = computed(() =>
  `${draftFinalistSubmissionIds.value.join('|')}::${draftNotFinalistSubmissionIds.value.join('|')}`
)

const hasDraftChanges = computed(() => {
  if (draftFinalistSubmissionIds.value.length !== currentFinalistSubmissionIds.value.length) {
    return true
  }

  if (draftNotFinalistSubmissionIds.value.length !== currentNotFinalistSubmissionIds.value.length) {
    return true
  }

  return (
    draftFinalistSubmissionIds.value.some((submissionId, index) => submissionId !== currentFinalistSubmissionIds.value[index])
    || draftNotFinalistSubmissionIds.value.some((submissionId, index) => submissionId !== currentNotFinalistSubmissionIds.value[index])
  )
})

const canStartPitch = computed(() =>
  canManageShortlist.value
  && finalistEntries.value.length > 0
  && !hasDraftChanges.value
  && (props.pendingActionKey === null || props.pendingActionKey === 'start-pitch')
)

function formatScore(scoreTotal: number | null) {
  return scoreTotal === null ? 'Awaiting review' : scoreTotal.toFixed(2)
}

function getBlindSubmissionLabel(entry: Pick<ShortlistEntry, 'rank'>) {
  return entry.rank === null ? 'Blind submission' : `Blind submission #${entry.rank}`
}

function getDraftShortlistRank(submissionId: string) {
  const index = draftOrderedSubmissionIds.value.findIndex(currentSubmissionId => currentSubmissionId === submissionId)
  return index === -1 ? null : index + 1
}

function getDraftPitchFinalistRank(submissionId: string) {
  const index = draftFinalistSubmissionIds.value.findIndex(currentSubmissionId => currentSubmissionId === submissionId)
  return index === -1 ? null : index + 1
}

function applyDraftSections(finalistSubmissionIds: string[], notFinalistSubmissionIds: string[]) {
  draftFinalistSubmissionIds.value = finalistSubmissionIds
  draftNotFinalistSubmissionIds.value = notFinalistSubmissionIds
}

function moveSubmission(submissionId: string, direction: -1 | 1) {
  const currentIndex = draftOrderedSubmissionIds.value.findIndex(currentSubmissionId => currentSubmissionId === submissionId)

  if (currentIndex === -1) {
    return
  }

  const targetIndex = currentIndex + direction

  if (targetIndex < 0 || targetIndex >= draftOrderedSubmissionIds.value.length) {
    return
  }

  const reorderedSubmissionIds = moveListItemByIndex(
    draftOrderedSubmissionIds.value,
    currentIndex,
    targetIndex
  )
  const finalistCount = draftFinalistSubmissionIds.value.length

  applyDraftSections(
    reorderedSubmissionIds.slice(0, finalistCount),
    reorderedSubmissionIds.slice(finalistCount)
  )
}

function moveToFinalists(submissionId: string) {
  if (draftFinalistSubmissionIds.value.includes(submissionId)) {
    return
  }

  applyDraftSections(
    [...draftFinalistSubmissionIds.value, submissionId],
    draftNotFinalistSubmissionIds.value.filter(currentSubmissionId => currentSubmissionId !== submissionId)
  )
}

function moveToNotFinalists(submissionId: string) {
  if (!draftFinalistSubmissionIds.value.includes(submissionId)) {
    return
  }

  applyDraftSections(
    draftFinalistSubmissionIds.value.filter(currentSubmissionId => currentSubmissionId !== submissionId),
    [submissionId, ...draftNotFinalistSubmissionIds.value]
  )
}

function resetDraft() {
  draftFinalistSubmissionIds.value = [...currentFinalistSubmissionIds.value]
  draftNotFinalistSubmissionIds.value = [...currentNotFinalistSubmissionIds.value]
}

function toSectionKey(value: string | undefined): ShortlistSectionKey | null {
  return value === 'finalists' || value === 'not-finalists'
    ? value
    : null
}

function handleSortableEnd(event: SortableEvent) {
  const submissionId = event.item.dataset.shortlistId?.trim() ?? ''
  const fromSection = toSectionKey(event.from.dataset.shortlistSection)
  const toSection = toSectionKey(event.to.dataset.shortlistSection)
  const oldIndex = event.oldDraggableIndex ?? event.oldIndex
  const newIndex = event.newDraggableIndex ?? event.newIndex

  activeDragSubmissionId.value = null

  if (!submissionId || !fromSection || !toSection || oldIndex === undefined || newIndex === undefined) {
    return
  }

  const finalists = [...draftFinalistSubmissionIds.value]
  const notFinalists = [...draftNotFinalistSubmissionIds.value]
  const fromList = fromSection === 'finalists' ? finalists : notFinalists
  const toList = toSection === 'finalists' ? finalists : notFinalists
  const [movedSubmissionId] = fromList.splice(oldIndex, 1)

  if (!movedSubmissionId) {
    return
  }

  toList.splice(newIndex, 0, movedSubmissionId)
  applyDraftSections(finalists, notFinalists)
}

function destroySortables() {
  finalistSortable?.destroy()
  notFinalistSortable?.destroy()
  finalistSortable = null
  notFinalistSortable = null
  activeDragSubmissionId.value = null
}

function createSectionSortable(element: HTMLElement) {
  return Sortable.create(element, {
    animation: 180,
    group: 'admin-shortlist',
    handle: '[data-shortlist-sort-handle]',
    draggable: '[data-shortlist-row]',
    dataIdAttr: 'data-shortlist-id',
    ghostClass: 'opacity-45',
    chosenClass: 'cursor-grabbing',
    dragClass: 'cursor-grabbing',
    onChoose(sortableEvent) {
      activeDragSubmissionId.value = sortableEvent.item.dataset.shortlistId ?? null
    },
    onEnd: handleSortableEnd
  })
}

function initializeSortables() {
  if (
    !import.meta.client
    || !canManageShortlist.value
    || props.pendingActionKey !== null
    || !finalistListElement.value
    || !notFinalistListElement.value
  ) {
    destroySortables()
    return
  }

  destroySortables()
  finalistSortable = createSectionSortable(finalistListElement.value)
  notFinalistSortable = createSectionSortable(notFinalistListElement.value)
}

watch([draftStateKey, canManageShortlist, () => props.pendingActionKey], async () => {
  await nextTick()
  initializeSortables()
}, {
  immediate: true,
  flush: 'post'
})

onBeforeUnmount(() => {
  destroySortables()
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
          Keep this stage blind. Arrange the full shortlist order here, and use the finalist boundary to decide who advances to pitch.
        </p>
      </div>
    </template>

    <div class="space-y-6">
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
        title="Loading shortlist editor"
        description="Saved shortlist ordering is still loading."
      />

      <template v-else-if="shortlist.length > 0">
        <div
          v-if="canManageShortlist"
          class="space-y-4 rounded-xl border border-black/8 bg-black/[0.02] p-4 dark:border-white/[0.08] dark:bg-white/[0.02]"
        >
          <div class="flex flex-wrap items-center gap-2">
            <AppBadge
              color="secondary"
              variant="soft"
            >
              {{ finalistEntries.length }} finalists
            </AppBadge>

            <AppBadge
              color="neutral"
              variant="soft"
            >
              {{ notFinalistEntries.length }} not finalists
            </AppBadge>
          </div>

          <p class="text-sm text-toned">
            Saving this order keeps the full blind ranking, and the finalists above the boundary become the carried order for pitch and the starting final ranking later.
          </p>

          <div class="flex flex-wrap gap-3">
            <AppButton
              color="primary"
              data-testid="admin-competition-shortlist-save"
              :loading="pendingActionKey === 'shortlist-select'"
              :disabled="!hasDraftChanges || (pendingActionKey !== null && pendingActionKey !== 'shortlist-select')"
              @click="emit('selectFinalists', {
                orderedSubmissionIds: draftOrderedSubmissionIds,
                finalistSubmissionIds: draftFinalistSubmissionIds
              })"
            >
              Save shortlist
            </AppButton>

            <AppButton
              color="secondary"
              data-testid="admin-competition-shortlist-continue"
              :loading="pendingActionKey === 'start-pitch'"
              :disabled="!canStartPitch"
              @click="emit('startPitch')"
            >
              Continue to pitch
            </AppButton>

            <AppButton
              v-if="hasDraftChanges"
              variant="soft"
              color="neutral"
              :disabled="pendingActionKey !== null"
              @click="resetDraft"
            >
              Reset changes
            </AppButton>
          </div>
        </div>

        <div class="grid gap-6">
          <section class="space-y-3">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-3">
                <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                  Finalists
                </h3>
                <AppBadge
                  color="secondary"
                  variant="soft"
                >
                  Advance to pitch
                </AppBadge>
              </div>
              <p class="text-sm text-toned">
                These submissions move on to the live pitch stage in the order shown here.
              </p>
            </div>

            <div
              ref="finalistListElement"
              data-shortlist-section="finalists"
              class="grid min-h-[5.75rem] gap-3 rounded-xl border border-black/8 bg-white/65 p-3 dark:border-white/[0.08] dark:bg-white/[0.02]"
              :class="activeDragSubmissionId ? 'border-black/16 dark:border-white/[0.16]' : ''"
            >
              <article
                v-for="entry in finalistEntries"
                :key="entry.submissionId"
                :data-testid="`admin-competition-shortlist-${entry.submissionId}`"
                :data-shortlist-id="entry.submissionId"
                data-shortlist-row
                class="rounded-xl border bg-white/88 p-3 transition-all dark:bg-[#111111]"
                :class="[
                  activeDragSubmissionId === entry.submissionId
                    ? 'border-black/16 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.55)] dark:border-white/[0.16]'
                    : 'border-black/8 dark:border-white/[0.08]'
                ]"
              >
                <AdminEditorRowShell>
                  <template #controls>
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                      :aria-label="`Move shortlist entry ${getDraftShortlistRank(entry.submissionId) ?? 0} up`"
                      :data-testid="`admin-competition-shortlist-move-up-${entry.submissionId}`"
                      :disabled="getDraftShortlistRank(entry.submissionId) === 1 || pendingActionKey !== null"
                      @click="moveSubmission(entry.submissionId, -1)"
                    >
                      <AppIcon
                        name="i-lucide-arrow-up"
                        class="size-4"
                      />
                    </button>

                    <button
                      type="button"
                      data-shortlist-sort-handle
                      class="group inline-flex h-11 w-11 cursor-grab items-center justify-center rounded-xl border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                      :aria-label="`Drag shortlist entry ${getDraftShortlistRank(entry.submissionId) ?? 0}`"
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
                      :aria-label="`Move shortlist entry ${getDraftShortlistRank(entry.submissionId) ?? 0} down`"
                      :data-testid="`admin-competition-shortlist-move-down-${entry.submissionId}`"
                      :disabled="getDraftShortlistRank(entry.submissionId) === draftOrderedSubmissionIds.length || pendingActionKey !== null"
                      @click="moveSubmission(entry.submissionId, 1)"
                    >
                      <AppIcon
                        name="i-lucide-arrow-down"
                        class="size-4"
                      />
                    </button>
                  </template>

                  <div class="grid gap-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <p
                        :data-testid="`admin-competition-shortlist-rank-${entry.submissionId}`"
                        class="text-sm font-semibold text-highlighted"
                      >
                        #{{ getDraftShortlistRank(entry.submissionId) }}
                      </p>

                      <AppBadge
                        color="secondary"
                        variant="soft"
                      >
                        Pitch finalist #{{ getDraftPitchFinalistRank(entry.submissionId) }}
                      </AppBadge>
                    </div>

                    <p class="text-sm text-toned">
                      {{ getBlindSubmissionLabel(entry) }} • blind score {{ formatScore(entry.scoreTotal) }}
                    </p>
                  </div>

                  <template #actions>
                    <AppButton
                      variant="soft"
                      color="neutral"
                      class="w-full sm:w-auto"
                      :disabled="pendingActionKey !== null"
                      @click="moveToNotFinalists(entry.submissionId)"
                    >
                      Move out
                    </AppButton>
                  </template>
                </AdminEditorRowShell>
              </article>

              <div
                v-if="finalistEntries.length === 0"
                class="rounded-xl border border-dashed border-black/12 bg-black/[0.02] px-4 py-4 text-sm text-toned dark:border-white/[0.12] dark:bg-white/[0.02]"
              >
                Move submissions here to advance them to pitch.
              </div>
            </div>
          </section>

          <section class="space-y-3">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-3">
                <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                  Not Finalists
                </h3>
                <AppBadge
                  color="neutral"
                  variant="soft"
                >
                  Saved in final order
                </AppBadge>
              </div>
              <p class="text-sm text-toned">
                These submissions stay below the finalist boundary, but their saved order still carries into the later final ranking baseline.
              </p>
            </div>

            <div
              ref="notFinalistListElement"
              data-shortlist-section="not-finalists"
              class="grid min-h-[5.75rem] gap-3 rounded-xl border border-black/8 bg-white/65 p-3 dark:border-white/[0.08] dark:bg-white/[0.02]"
              :class="activeDragSubmissionId ? 'border-black/16 dark:border-white/[0.16]' : ''"
            >
              <article
                v-for="entry in notFinalistEntries"
                :key="entry.submissionId"
                :data-testid="`admin-competition-shortlist-${entry.submissionId}`"
                :data-shortlist-id="entry.submissionId"
                data-shortlist-row
                class="rounded-xl border bg-white/88 p-3 transition-all dark:bg-[#111111]"
                :class="[
                  activeDragSubmissionId === entry.submissionId
                    ? 'border-black/16 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.55)] dark:border-white/[0.16]'
                    : 'border-black/8 dark:border-white/[0.08]'
                ]"
              >
                <AdminEditorRowShell>
                  <template #controls>
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                      :aria-label="`Move shortlist entry ${getDraftShortlistRank(entry.submissionId) ?? 0} up`"
                      :data-testid="`admin-competition-shortlist-move-up-${entry.submissionId}`"
                      :disabled="getDraftShortlistRank(entry.submissionId) === 1 || pendingActionKey !== null"
                      @click="moveSubmission(entry.submissionId, -1)"
                    >
                      <AppIcon
                        name="i-lucide-arrow-up"
                        class="size-4"
                      />
                    </button>

                    <button
                      type="button"
                      data-shortlist-sort-handle
                      class="group inline-flex h-11 w-11 cursor-grab items-center justify-center rounded-xl border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                      :aria-label="`Drag shortlist entry ${getDraftShortlistRank(entry.submissionId) ?? 0}`"
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
                      :aria-label="`Move shortlist entry ${getDraftShortlistRank(entry.submissionId) ?? 0} down`"
                      :data-testid="`admin-competition-shortlist-move-down-${entry.submissionId}`"
                      :disabled="getDraftShortlistRank(entry.submissionId) === draftOrderedSubmissionIds.length || pendingActionKey !== null"
                      @click="moveSubmission(entry.submissionId, 1)"
                    >
                      <AppIcon
                        name="i-lucide-arrow-down"
                        class="size-4"
                      />
                    </button>
                  </template>

                  <div class="grid gap-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <p
                        :data-testid="`admin-competition-shortlist-rank-${entry.submissionId}`"
                        class="text-sm font-semibold text-highlighted"
                      >
                        #{{ getDraftShortlistRank(entry.submissionId) }}
                      </p>

                      <AppBadge
                        color="neutral"
                        variant="soft"
                      >
                        Not finalist
                      </AppBadge>
                    </div>

                    <p class="text-sm text-toned">
                      {{ getBlindSubmissionLabel(entry) }} • blind score {{ formatScore(entry.scoreTotal) }}
                    </p>
                  </div>

                  <template #actions>
                    <AppButton
                      variant="soft"
                      color="primary"
                      class="w-full sm:w-auto"
                      :disabled="pendingActionKey !== null"
                      @click="moveToFinalists(entry.submissionId)"
                    >
                      Make finalist
                    </AppButton>
                  </template>
                </AdminEditorRowShell>
              </article>

              <div
                v-if="notFinalistEntries.length === 0"
                class="rounded-xl border border-dashed border-black/12 bg-black/[0.02] px-4 py-4 text-sm text-toned dark:border-white/[0.12] dark:bg-white/[0.02]"
              >
                Every ranked submission is currently inside the finalist boundary.
              </div>
            </div>
          </section>
        </div>
      </template>

      <AppAlert
        v-else
        color="neutral"
        variant="soft"
        title="No ranked blind submissions yet"
        description="The shortlist does not currently expose ranked blind-review entries."
      />
    </div>
  </AppCard>
</template>
