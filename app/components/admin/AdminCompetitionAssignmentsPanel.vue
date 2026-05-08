<script setup lang="ts">
import type {
  AdminJudgeAssignmentOversightGroup,
  JudgeAssignmentSummary
} from '~/domains/judging/admin-oversight'
import type { EventState } from '~/domains/events/states'

import {
  buildAdminJudgeAssignmentOversightGroups,
  formatAdminJudgeAssignmentStatus,
  getAdminJudgeAssignmentInterventionPolicy,
  getJudgeAssignmentStatusColor
} from '~/domains/judging/admin-oversight'
import { formatTimestamp } from '~/lib/date-formatting'

type JudgeChoice = {
  value: string
  label: string
}

const props = defineProps<{
  eventState: EventState
  assignments: JudgeAssignmentSummary[]
  totalAssignments?: number
  judgeChoices: JudgeChoice[]
  isLoading?: boolean
  errorMessage?: string
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  reassign: [payload: { assignmentId: string, judgeUserId?: string, reason?: string }]
  forceSkip: [payload: { assignmentId: string, reason?: string }]
}>()

const drafts = reactive<Record<string, {
  judgeUserId: string
  reassignReason: string
  forceSkipReason: string
}>>({})
const activeReassignAssignmentId = ref<string | null>(null)

function getDraft(assignment: JudgeAssignmentSummary) {
  const existing = drafts[assignment.id]

  if (existing) {
    return existing
  }

  const next = {
    judgeUserId: '',
    reassignReason: '',
    forceSkipReason: ''
  }

  drafts[assignment.id] = next
  return next
}

function getReplacementChoices(assignment: JudgeAssignmentSummary) {
  return props.judgeChoices.filter(choice => choice.value !== assignment.judgeUserId)
}

function getAssignmentProjectLabel(assignment: JudgeAssignmentSummary) {
  return assignment.blindSubmission?.projectName
    ?? assignment.pitchSubmission?.projectName
    ?? assignment.submissionId
}

function getAssignmentSummary(assignment: JudgeAssignmentSummary) {
  return assignment.blindSubmission?.summary
    || assignment.pitchSubmission?.summary
    || 'No summary is available for this assignment yet.'
}

function getJudgeSectionSummary(group: AdminJudgeAssignmentOversightGroup) {
  const parts: string[] = []

  if (group.assignedCount > 0) {
    parts.push(`${group.assignedCount} unstarted`)
  }

  if (group.startedCount > 0) {
    parts.push(`${group.startedCount} started`)
  }

  if (parts.length === 0) {
    return 'No active assignments.'
  }

  return parts.join(' • ')
}

function getAssignmentLifecycleLabel(assignment: JudgeAssignmentSummary) {
  if (assignment.status === 'judge_started') {
    return assignment.startedAt
      ? `Started ${formatTimestamp(assignment.startedAt, 'start time unavailable')}`
      : 'Started'
  }

  return `Assigned ${formatTimestamp(assignment.assignedAt, 'assignment time unavailable')}`
}

function openReassignDialog(assignment: JudgeAssignmentSummary) {
  activeReassignAssignmentId.value = assignment.id
}

function closeReassignDialog() {
  activeReassignAssignmentId.value = null
}

const judgeLabelsByUserId = computed<Record<string, string>>(() =>
  Object.fromEntries(props.judgeChoices.map(choice => [choice.value, choice.label]))
)

const actionableAssignments = computed(() =>
  props.assignments.filter((assignment) => {
    const policy = getAdminJudgeAssignmentInterventionPolicy(props.eventState, assignment.status)
    return policy.canReassign || policy.canForceSkip
  })
)

const oversightGroups = computed(() =>
  buildAdminJudgeAssignmentOversightGroups(actionableAssignments.value, {
    judgeLabelsByUserId: judgeLabelsByUserId.value
  })
)
const hiddenAssignmentCount = computed(() =>
  Math.max((props.totalAssignments ?? props.assignments.length) - props.assignments.length, 0)
)

const activeReassignAssignment = computed(() => {
  if (!activeReassignAssignmentId.value) {
    return null
  }

  const assignment = actionableAssignments.value.find(entry => entry.id === activeReassignAssignmentId.value) ?? null

  if (!assignment) {
    return null
  }

  return getAdminJudgeAssignmentInterventionPolicy(props.eventState, assignment.status).canReassign
    ? assignment
    : null
})

watch(activeReassignAssignment, (assignment) => {
  if (!assignment && activeReassignAssignmentId.value) {
    activeReassignAssignmentId.value = null
  }
})

function submitReassignment() {
  if (!activeReassignAssignment.value) {
    return
  }

  const draft = getDraft(activeReassignAssignment.value)

  emit('reassign', {
    assignmentId: activeReassignAssignment.value.id,
    judgeUserId: draft.judgeUserId || undefined,
    reason: draft.reassignReason.trim() || undefined
  })

  closeReassignDialog()
}
</script>

<template>
  <AppCard class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Judging Oversight
        </h2>
        <p class="text-sm text-muted">
          Review the current assignment load by judge and intervene only where the lifecycle rules allow it.
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <AppAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        title="Assignment oversight unavailable"
        :description="errorMessage"
      />

      <AppAlert
        v-else-if="isLoading"
        color="neutral"
        variant="soft"
        title="Loading assignment oversight"
        description="Current judging assignments are still loading for Operations."
      />

      <template v-else>
        <AppAlert
          v-if="hiddenAssignmentCount > 0"
          color="neutral"
          variant="soft"
          title="Assignment list limited"
          :description="`Showing the first ${assignments.length} active assignments. Use the judging summary above for full progress counts.`"
        />

        <AppAlert
          v-if="oversightGroups.length === 0"
          color="neutral"
          variant="soft"
          title="No active admin interventions"
          description="There are no visible active assignments that currently allow reassignment or force-skip."
        />

        <div
          v-else
          class="divide-y divide-black/8 dark:divide-white/[0.08]"
        >
          <section
            v-for="group in oversightGroups"
            :key="group.judgeUserId"
            class="py-6 first:pt-0 last:pb-0"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="space-y-1">
                <h3 class="text-base font-semibold text-highlighted">
                  {{ group.judgeLabel }}
                </h3>
                <p class="text-sm text-toned">
                  {{ getJudgeSectionSummary(group) }}
                </p>
              </div>

              <AppBadge
                color="neutral"
                variant="soft"
                class="self-start"
              >
                {{ group.activeAssignmentCount }} active
              </AppBadge>
            </div>

            <div class="mt-5 grid gap-4">
              <article
                v-for="assignment in group.assignments"
                :key="assignment.id"
                :data-testid="`admin-competition-assignment-${assignment.submissionId}`"
                class="rounded-xl border border-black/8 bg-white/78 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] backdrop-blur-xl dark:border-white/[0.10] dark:bg-[#151515]/64 px-5 py-5"
              >
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div class="min-w-0 space-y-2">
                    <div class="flex flex-wrap items-center gap-3">
                      <h4 class="text-base font-semibold text-highlighted">
                        {{ getAssignmentProjectLabel(assignment) }}
                      </h4>

                      <AppBadge
                        :color="getJudgeAssignmentStatusColor(assignment.status)"
                        variant="soft"
                      >
                        {{ formatAdminJudgeAssignmentStatus(assignment.status) }}
                      </AppBadge>
                    </div>

                    <p class="text-sm text-toned">
                      {{ getAssignmentSummary(assignment) }}
                    </p>

                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-toned">
                      <p>{{ getAssignmentLifecycleLabel(assignment) }}</p>
                      <p>Assignment ID: {{ assignment.id }}</p>
                    </div>
                  </div>

                  <div class="flex w-full flex-col gap-3 lg:w-auto lg:min-w-44 lg:self-center">
                    <AppButton
                      v-if="getAdminJudgeAssignmentInterventionPolicy(eventState, assignment.status).canReassign"
                      color="warning"
                      variant="soft"
                      :data-testid="`admin-competition-reassign-open-${assignment.submissionId}`"
                      :disabled="pendingActionKey !== null"
                      class="justify-center"
                      @click="openReassignDialog(assignment)"
                    >
                      Reassign
                    </AppButton>

                    <div
                      v-if="getAdminJudgeAssignmentInterventionPolicy(eventState, assignment.status).canForceSkip"
                      class="grid gap-3 lg:min-w-72"
                    >
                      <label class="grid gap-2">
                        <span class="text-sm font-medium text-toned">Operational note</span>
                        <AppInput
                          v-model="getDraft(assignment).forceSkipReason"
                          type="text"
                          placeholder="Force-skip note"
                        />
                      </label>

                      <AppButton
                        color="error"
                        variant="soft"
                        :data-testid="`admin-competition-force-skip-submit-${assignment.submissionId}`"
                        :loading="pendingActionKey === `force-skip:${assignment.id}`"
                        :disabled="pendingActionKey !== null && pendingActionKey !== `force-skip:${assignment.id}`"
                        class="justify-center"
                        @click="emit('forceSkip', {
                          assignmentId: assignment.id,
                          reason: getDraft(assignment).forceSkipReason.trim() || undefined
                        })"
                      >
                        Force-skip assignment
                      </AppButton>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </template>
    </div>
  </AppCard>

  <Teleport to="body">
    <div
      v-if="activeReassignAssignment"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      @click.self="closeReassignDialog"
    >
      <AppCard class="w-full max-w-xl rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60 shadow-2xl">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
              <h3 class="text-lg font-semibold text-highlighted">
                Reassign Submission
              </h3>
              <p class="text-sm text-muted">
                {{ getAssignmentProjectLabel(activeReassignAssignment) }}
              </p>
            </div>

            <AppButton
              color="neutral"
              variant="soft"
              size="sm"
              icon="i-lucide-x"
              aria-label="Close reassignment popup"
              @click="closeReassignDialog"
            />
          </div>
        </template>

        <div
          role="dialog"
          aria-modal="true"
          class="space-y-5"
        >
          <div class="space-y-1">
            <p class="text-sm text-toned">
              Current judge: {{ judgeLabelsByUserId[activeReassignAssignment.judgeUserId] ?? activeReassignAssignment.judgeUserId }}
            </p>
            <p class="text-sm text-toned">
              Reassignment is available only while review has not started for this assignment.
            </p>
          </div>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Replacement judge</span>
            <AppSelect
              v-model="getDraft(activeReassignAssignment).judgeUserId"
              :data-testid="`admin-competition-reassign-select-${activeReassignAssignment.submissionId}`"
            >
              <option value="">
                Auto-balance lowest-load judge
              </option>
              <option
                v-for="choice in getReplacementChoices(activeReassignAssignment)"
                :key="choice.value"
                :value="choice.value"
              >
                {{ choice.label }}
              </option>
            </AppSelect>
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Operational note</span>
            <AppInput
              v-model="getDraft(activeReassignAssignment).reassignReason"
              type="text"
              placeholder="Reassignment note"
            />
          </label>

          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AppButton
              color="neutral"
              variant="soft"
              @click="closeReassignDialog"
            >
              Cancel
            </AppButton>

            <AppButton
              color="warning"
              :data-testid="`admin-competition-reassign-submit-${activeReassignAssignment.submissionId}`"
              :loading="pendingActionKey === `reassign:${activeReassignAssignment.id}`"
              :disabled="pendingActionKey !== null && pendingActionKey !== `reassign:${activeReassignAssignment.id}`"
              @click="submitReassignment"
            >
              Confirm reassignment
            </AppButton>
          </div>
        </div>
      </AppCard>
    </div>
  </Teleport>
</template>
