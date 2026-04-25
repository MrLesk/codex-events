<script setup lang="ts">
import type Sortable from 'sortablejs'
import type { SortableEvent } from 'sortablejs'

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
  startPitch: [payload: { orderedSubmissionIds: string[], finalistSubmissionIds: string[] }]
}>()

type ShortlistSectionKey = 'finalists' | 'not-finalists'
type SortableInstance = Sortable
type SortableConstructor = typeof Sortable

const draftFinalistSubmissionIds = ref<string[]>([])
const draftNotFinalistSubmissionIds = ref<string[]>([])
const activeDragSubmissionId = ref<string | null>(null)
const finalistListElement = ref<HTMLElement | null>(null)
const notFinalistListElement = ref<HTMLElement | null>(null)
let finalistSortable: SortableInstance | null = null
let notFinalistSortable: SortableInstance | null = null
let sortableConstructor: SortableConstructor | null = null

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

const canSaveShortlist = computed(() =>
  canManageShortlist.value
  && (props.pendingActionKey === null || props.pendingActionKey === 'shortlist-select')
)

const canStartPitch = computed(() =>
  canManageShortlist.value
  && finalistEntries.value.length > 0
  && (props.pendingActionKey === null || props.pendingActionKey === 'start-pitch')
)

function formatScore(scoreTotal: number | null) {
  return scoreTotal === null ? 'Awaiting review' : scoreTotal.toFixed(2)
}

function formatProjectName(projectName: string | null) {
  return projectName ?? 'Untitled project'
}

function formatPrimaryEntryLabel(entry: Pick<ShortlistEntry, 'projectName' | 'scoreTotal'>) {
  return `${formatProjectName(entry.projectName)} - ${formatScore(entry.scoreTotal)}`
}

function getEntrySummary(entry: Pick<ShortlistEntry, 'summary'>) {
  const summary = entry.summary?.trim() ?? ''
  return summary.length > 0 ? summary : null
}

function getDraftShortlistRank(submissionId: string) {
  const index = draftOrderedSubmissionIds.value.findIndex(currentSubmissionId => currentSubmissionId === submissionId)
  return index === -1 ? null : index + 1
}

function applyDraftSections(finalistSubmissionIds: string[], notFinalistSubmissionIds: string[]) {
  draftFinalistSubmissionIds.value = finalistSubmissionIds
  draftNotFinalistSubmissionIds.value = notFinalistSubmissionIds
}

function moveSubmission(submissionId: string, direction: -1 | 1) {
  const finalistIndex = draftFinalistSubmissionIds.value.findIndex(currentSubmissionId => currentSubmissionId === submissionId)
  const notFinalistIndex = draftNotFinalistSubmissionIds.value.findIndex(currentSubmissionId => currentSubmissionId === submissionId)

  if (finalistIndex === -1 && notFinalistIndex === -1) {
    return
  }

  if (finalistIndex !== -1) {
    if (direction === -1) {
      if (finalistIndex === 0) {
        return
      }

      applyDraftSections(
        moveListItemByIndex(draftFinalistSubmissionIds.value, finalistIndex, finalistIndex - 1),
        [...draftNotFinalistSubmissionIds.value]
      )
      return
    }

    if (finalistIndex === draftFinalistSubmissionIds.value.length - 1) {
      moveToNotFinalists(submissionId)
      return
    }

    applyDraftSections(
      moveListItemByIndex(draftFinalistSubmissionIds.value, finalistIndex, finalistIndex + 1),
      [...draftNotFinalistSubmissionIds.value]
    )
    return
  }

  if (direction === -1) {
    if (notFinalistIndex === 0) {
      moveToFinalists(submissionId)
      return
    }

    applyDraftSections(
      [...draftFinalistSubmissionIds.value],
      moveListItemByIndex(draftNotFinalistSubmissionIds.value, notFinalistIndex, notFinalistIndex - 1)
    )
    return
  }

  if (notFinalistIndex === draftNotFinalistSubmissionIds.value.length - 1) {
    return
  }

  applyDraftSections(
    [...draftFinalistSubmissionIds.value],
    moveListItemByIndex(draftNotFinalistSubmissionIds.value, notFinalistIndex, notFinalistIndex + 1)
  )
}

function canMoveSubmissionUp(submissionId: string) {
  if (draftFinalistSubmissionIds.value.includes(submissionId)) {
    return draftFinalistSubmissionIds.value[0] !== submissionId
  }

  return draftNotFinalistSubmissionIds.value.includes(submissionId)
}

function canMoveSubmissionDown(submissionId: string) {
  if (draftFinalistSubmissionIds.value.includes(submissionId)) {
    return true
  }

  return draftNotFinalistSubmissionIds.value.at(-1) !== submissionId
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

async function loadSortableConstructor() {
  if (!sortableConstructor) {
    const module = await import('sortablejs')
    sortableConstructor = module.default
  }

  return sortableConstructor
}

function createSectionSortable(Sortable: SortableConstructor, element: HTMLElement) {
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

async function initializeSortables() {
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

  const Sortable = await loadSortableConstructor()

  if (
    !canManageShortlist.value
    || props.pendingActionKey !== null
    || !finalistListElement.value
    || !notFinalistListElement.value
  ) {
    destroySortables()
    return
  }

  destroySortables()
  finalistSortable = createSectionSortable(Sortable, finalistListElement.value)
  notFinalistSortable = createSectionSortable(Sortable, notFinalistListElement.value)
}

watch([draftStateKey, canManageShortlist, () => props.pendingActionKey], async () => {
  await nextTick()
  await initializeSortables()
}, {
  immediate: true,
  flush: 'post'
})

onBeforeUnmount(() => {
  destroySortables()
})
</script>

<template>
  <AppCard class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
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
        <div class="grid gap-6">
          <section class="space-y-3">
            <div class="space-y-3">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div class="space-y-1">
                  <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                    Finalists ({{ finalistEntries.length }})
                  </h3>
                  <p class="text-sm text-toned">
                    These submissions move on to the live pitch stage in the order shown here. Saving this order keeps the full blind ranking and sets the finalist presentation order for pitch.
                  </p>
                </div>

                <div
                  v-if="canManageShortlist"
                  class="flex flex-wrap items-center gap-3 lg:justify-end"
                >
                  <AppButton
                    color="primary"
                    data-testid="admin-competition-shortlist-save"
                    :loading="pendingActionKey === 'shortlist-select'"
                    :disabled="!canSaveShortlist"
                    @click="emit('selectFinalists', {
                      orderedSubmissionIds: draftOrderedSubmissionIds,
                      finalistSubmissionIds: draftFinalistSubmissionIds
                    })"
                  >
                    Save shortlist
                  </AppButton>

                  <AppButton
                    color="neutral"
                    data-testid="admin-competition-shortlist-continue"
                    class="disabled:pointer-events-auto disabled:cursor-not-allowed"
                    :loading="pendingActionKey === 'start-pitch'"
                    :disabled="!canStartPitch"
                    @click="emit('startPitch', {
                      orderedSubmissionIds: draftOrderedSubmissionIds,
                      finalistSubmissionIds: draftFinalistSubmissionIds
                    })"
                  >
                    Continue to pitch
                  </AppButton>

                  <AppButton
                    v-if="hasDraftChanges"
                    variant="outline"
                    color="neutral"
                    class="dark:border-white/[0.24] dark:text-white dark:hover:border-white/[0.34] dark:hover:bg-white/[0.04]"
                    :disabled="pendingActionKey !== null"
                    @click="resetDraft"
                  >
                    Reset changes
                  </AppButton>
                </div>
              </div>
            </div>

            <div
              ref="finalistListElement"
              data-shortlist-section="finalists"
              class="grid min-h-[5.75rem] gap-3"
              :class="[
                finalistEntries.length > 0
                  ? 'rounded-xl border border-black/8 bg-white/65 p-3 dark:border-white/[0.08] dark:bg-white/[0.02]'
                  : 'p-0',
                activeDragSubmissionId && finalistEntries.length > 0 ? 'border-black/16 dark:border-white/[0.16]' : ''
              ]"
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
                <AdminEditorRowShell
                  columns-class="sm:grid-cols-[4.25rem_minmax(0,1fr)_8.75rem]"
                  actions-class="flex items-center justify-start sm:justify-end sm:self-center"
                >
                  <template #controls>
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                      :aria-label="`Move shortlist entry ${getDraftShortlistRank(entry.submissionId) ?? 0} up`"
                      :data-testid="`admin-competition-shortlist-move-up-${entry.submissionId}`"
                      :disabled="!canMoveSubmissionUp(entry.submissionId) || pendingActionKey !== null"
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
                      :disabled="!canMoveSubmissionDown(entry.submissionId) || pendingActionKey !== null"
                      @click="moveSubmission(entry.submissionId, 1)"
                    >
                      <AppIcon
                        name="i-lucide-arrow-down"
                        class="size-4"
                      />
                    </button>
                  </template>

                  <div class="grid gap-2">
                    <div class="flex flex-wrap items-baseline gap-3">
                      <p
                        :data-testid="`admin-competition-shortlist-rank-${entry.submissionId}`"
                        class="text-sm font-semibold text-highlighted"
                      >
                        #{{ getDraftShortlistRank(entry.submissionId) }}
                      </p>

                      <p class="min-w-0 flex-1 text-sm font-semibold text-highlighted">
                        {{ formatPrimaryEntryLabel(entry) }}
                      </p>
                    </div>

                    <p
                      v-if="getEntrySummary(entry)"
                      class="text-sm text-toned"
                    >
                      {{ getEntrySummary(entry) }}
                    </p>
                  </div>

                  <template #actions>
                    <AppButton
                      variant="soft"
                      color="primary"
                      class="w-full"
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
                class="flex min-h-[5.75rem] items-center justify-center rounded-xl border border-dashed border-black/12 bg-black/[0.02] px-4 py-4 text-center text-sm text-toned dark:border-white/[0.12] dark:bg-white/[0.02]"
              >
                Move submissions here to advance them to pitch.
              </div>
            </div>
          </section>

          <section class="space-y-3">
            <div class="space-y-1">
              <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                Not Finalists ({{ notFinalistEntries.length }})
              </h3>
              <p class="text-sm text-toned">
                These submissions stay below the finalist boundary while preserving the saved blind-ranking order.
              </p>
            </div>

            <div
              ref="notFinalistListElement"
              data-shortlist-section="not-finalists"
              class="grid min-h-[5.75rem] gap-3"
              :class="[
                notFinalistEntries.length > 0
                  ? 'rounded-xl border border-black/8 bg-white/65 p-3 dark:border-white/[0.08] dark:bg-white/[0.02]'
                  : 'p-0',
                activeDragSubmissionId && notFinalistEntries.length > 0 ? 'border-black/16 dark:border-white/[0.16]' : ''
              ]"
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
                <AdminEditorRowShell
                  columns-class="sm:grid-cols-[4.25rem_minmax(0,1fr)_8.75rem]"
                  actions-class="flex items-center justify-start sm:justify-end sm:self-center"
                >
                  <template #controls>
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                      :aria-label="`Move shortlist entry ${getDraftShortlistRank(entry.submissionId) ?? 0} up`"
                      :data-testid="`admin-competition-shortlist-move-up-${entry.submissionId}`"
                      :disabled="!canMoveSubmissionUp(entry.submissionId) || pendingActionKey !== null"
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
                      :disabled="!canMoveSubmissionDown(entry.submissionId) || pendingActionKey !== null"
                      @click="moveSubmission(entry.submissionId, 1)"
                    >
                      <AppIcon
                        name="i-lucide-arrow-down"
                        class="size-4"
                      />
                    </button>
                  </template>

                  <div class="grid gap-2">
                    <div class="flex flex-wrap items-baseline gap-3">
                      <p
                        :data-testid="`admin-competition-shortlist-rank-${entry.submissionId}`"
                        class="text-sm font-semibold text-highlighted"
                      >
                        #{{ getDraftShortlistRank(entry.submissionId) }}
                      </p>

                      <p class="min-w-0 flex-1 text-sm font-semibold text-highlighted">
                        {{ formatPrimaryEntryLabel(entry) }}
                      </p>
                    </div>

                    <p
                      v-if="getEntrySummary(entry)"
                      class="text-sm text-toned"
                    >
                      {{ getEntrySummary(entry) }}
                    </p>
                  </div>

                  <template #actions>
                    <AppButton
                      variant="soft"
                      color="primary"
                      class="w-full"
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
                class="flex min-h-[5.75rem] items-center justify-center rounded-xl border border-dashed border-black/12 bg-black/[0.02] px-4 py-4 text-center text-sm text-toned dark:border-white/[0.12] dark:bg-white/[0.02]"
              >
                Move submissions here to keep them below the finalist boundary.
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
