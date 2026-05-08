<script setup lang="ts">
import type { EventRecord } from '~/domains/events/records'
import type { JudgeInboxGroup } from '~/domains/judging/workspace'

import {
  LazyJudgingJudgeAssignmentInboxCard as LazyJudgeAssignmentInboxCard,
  LazyJudgingJudgeAssignmentWorkspacePanel as LazyJudgeAssignmentWorkspacePanel
} from '#components'
import { buildAccountEventJudgingTabHref } from '~/domains/judging/query'
import { filterExplicitJudgeEvents } from '~/domains/judging/workspace'

const props = withDefaults(defineProps<{
  eventId: string
  slug: string
  selectedAssignmentId?: string | null
}>(), {
  selectedAssignmentId: null
})

const workspace = useJudgeWorkspace()

const resolvedCurrentEvent = computed(() =>
  filterExplicitJudgeEvents(workspace.events.data.value ?? [], workspace.actor.value)
    .find(event => event.id === props.eventId || event.slug === props.slug)
    ?? null
)
const resolvedCurrentInboxGroup = computed(() =>
  workspace.inboxGroups.value.find(group => group.event.slug === props.slug) ?? null
)
const currentEventCache = shallowRef<EventRecord | null>(null)
const currentInboxGroupCache = shallowRef<JudgeInboxGroup | null>(null)

watch(resolvedCurrentEvent, (nextEvent) => {
  if (nextEvent) {
    currentEventCache.value = nextEvent
  }
}, {
  immediate: true
})

watch(resolvedCurrentInboxGroup, (nextInboxGroup) => {
  if (nextInboxGroup) {
    currentInboxGroupCache.value = nextInboxGroup
  }
}, {
  immediate: true
})

const currentEvent = computed(() =>
  resolvedCurrentEvent.value
  ?? (
    workspace.status.value === 'pending'
    && currentEventCache.value
    && (currentEventCache.value.id === props.eventId || currentEventCache.value.slug === props.slug)
      ? currentEventCache.value
      : null
  )
)
const currentInboxGroup = computed(() =>
  resolvedCurrentInboxGroup.value
  ?? (
    workspace.status.value === 'pending'
    && currentInboxGroupCache.value?.event.slug === props.slug
      ? currentInboxGroupCache.value
      : null
  )
)
const assignments = computed(() => currentInboxGroup.value?.assignments ?? [])
const selectedAssignmentId = computed(() => props.selectedAssignmentId?.trim() ?? '')
const inReviewCount = computed(() =>
  assignments.value.filter(assignment => assignment.status === 'judge_started').length
)
const readyCount = computed(() =>
  assignments.value.filter(assignment => assignment.status === 'assigned').length
)
const nextQueuedAssignment = computed(() =>
  assignments.value.find(assignment =>
    assignment.status === 'assigned'
    && assignment.id !== selectedAssignmentId.value
  ) ?? null
)
const nextQueuedReviewHref = computed(() =>
  currentEvent.value && nextQueuedAssignment.value
    ? buildAccountEventJudgingTabHref(currentEvent.value.slug, nextQueuedAssignment.value.id)
    : null
)

const nextAction = computed(() => {
  const inProgress = assignments.value.find(assignment => assignment.status === 'judge_started')

  if (inProgress && currentEvent.value) {
    return {
      label: 'Continue review',
      to: buildAccountEventJudgingTabHref(currentEvent.value.slug, inProgress.id)
    }
  }

  const ready = assignments.value.find(assignment => assignment.status === 'assigned')

  if (ready && currentEvent.value) {
    return {
      label: 'Start next review',
      to: buildAccountEventJudgingTabHref(currentEvent.value.slug, ready.id)
    }
  }

  return null
})

async function refreshWorkspace() {
  await workspace.refreshWorkspace()
}
</script>

<template>
  <div class="space-y-6">
    <AppAlert
      v-if="workspace.error.value"
      color="error"
      variant="soft"
      title="Judging workspace unavailable"
      :description="workspace.error.value.message"
    />

    <AppAlert
      v-else-if="workspace.status.value === 'pending' && !currentEvent"
      color="neutral"
      variant="soft"
      title="Loading judging workspace"
      description="Fetching your blind-review queue for this event."
    />

    <AppAlert
      v-else-if="!currentEvent"
      color="warning"
      variant="soft"
      title="Judge access required"
      description="This event is not currently assigned to you as a judge."
    />

    <template v-else>
      <LazyJudgeAssignmentWorkspacePanel
        v-if="selectedAssignmentId && currentEvent"
        :event-id="currentEvent.id"
        :event-slug="currentEvent.slug"
        :assignment-id="selectedAssignmentId"
        :next-review-href="nextQueuedReviewHref"
        @updated="refreshWorkspace"
      />

      <template v-else>
        <section class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-xl !border !border-black/8 !bg-default/80 !shadow-none dark:!border-white/[0.08] dark:!bg-default/80 p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Active assignments
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ assignments.length }}
            </p>
          </div>

          <div class="rounded-xl !border !border-black/8 !bg-default/80 !shadow-none dark:!border-white/[0.08] dark:!bg-default/80 p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              In review
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ inReviewCount }}
            </p>
          </div>

          <div class="rounded-xl !border !border-black/8 !bg-default/80 !shadow-none dark:!border-white/[0.08] dark:!bg-default/80 p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Ready to start
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ readyCount }}
            </p>
          </div>
        </section>

        <section
          v-if="nextAction"
          class="rounded-xl !border !border-black/8 !bg-default/80 !shadow-none dark:!border-white/[0.08] dark:!bg-default/80 p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="space-y-1">
              <p class="text-[15px] font-semibold text-highlighted dark:text-white">
                Continue in blind review
              </p>
              <p class="text-[13px] text-muted">
                Pick up your next assignment directly from this event workspace.
              </p>
            </div>

            <AppButton
              :to="nextAction.to"
              color="neutral"
              variant="soft"
              class="rounded-lg px-3 py-1.5 text-[13px] font-medium"
            >
              {{ nextAction.label }}
            </AppButton>
          </div>
        </section>

        <section
          v-if="assignments.length === 0"
          class="rounded-xl !border !border-dashed !border-black/10 !bg-default/80 !shadow-none dark:!border-white/[0.08] dark:!bg-default/80 p-8 text-center"
        >
          <p class="text-[15px] font-medium text-highlighted dark:text-white">
            No active blind reviews for this event
          </p>
          <p class="mt-2 text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
            New assignments will appear here after judging starts.
          </p>
        </section>

        <section
          v-else
          class="grid gap-4"
        >
          <LazyJudgeAssignmentInboxCard
            v-for="assignment in assignments"
            :key="assignment.id"
            :assignment="assignment"
            :event-slug="currentEvent.slug"
          />
        </section>
      </template>
    </template>
  </div>
</template>
