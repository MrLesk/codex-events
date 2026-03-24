<script setup lang="ts">
import type {
  JudgeAssignmentSummary,
  HackathonState
} from '~/utils/admin-workspace'

import {
  formatAdminJudgeAssignmentStatus,
  getAdminJudgeAssignmentInterventionPolicy,
  getJudgeAssignmentStatusColor
} from '~/utils/admin-workspace'

type JudgeChoice = {
  value: string
  label: string
}

const props = defineProps<{
  hackathonState: HackathonState
  assignments: JudgeAssignmentSummary[]
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

const actionableAssignments = computed(() =>
  props.assignments.filter((assignment) => {
    const policy = getAdminJudgeAssignmentInterventionPolicy(props.hackathonState, assignment.status)
    return policy.canReassign || policy.canForceSkip
  })
)
</script>

<template>
  <AppCard class="border border-default/70 bg-elevated/90">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Judging Oversight
        </h2>
        <p class="text-sm text-muted">
          Admin interventions stay limited to active assignments and follow the documented lifecycle guards.
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
        description="Current judging assignments are still loading for the competition workspace."
      />

      <template v-else>
        <AppAlert
          v-if="actionableAssignments.length === 0"
          color="neutral"
          variant="soft"
          title="No active admin interventions"
          description="There are no visible active assignments that currently allow reassignment or force-skip."
        />

        <div
          v-else
          class="grid gap-4"
        >
          <article
            v-for="assignment in actionableAssignments"
            :key="assignment.id"
            :data-testid="`admin-competition-assignment-${assignment.submissionId}`"
            class="rounded-[1.5rem] border border-default bg-default px-5 py-5"
          >
            <div class="space-y-5">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="space-y-2">
                  <div class="space-y-1">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Blind submission
                    </p>
                    <h3 class="text-lg font-semibold text-highlighted">
                      {{ assignment.blindSubmission?.projectName ?? assignment.submissionId }}
                    </h3>
                  </div>

                  <div class="grid gap-2 text-sm text-toned md:grid-cols-2">
                    <p>
                      <span class="font-medium text-highlighted">Current judge:</span>
                      <span :data-testid="`admin-competition-assignment-judge-${assignment.submissionId}`">{{ assignment.judgeUserId }}</span>
                    </p>
                    <p>
                      <span class="font-medium text-highlighted">Assignment ID:</span>
                      {{ assignment.id }}
                    </p>
                  </div>
                </div>

                <AppBadge
                  :color="getJudgeAssignmentStatusColor(assignment.status)"
                  variant="soft"
                  class="self-start"
                >
                  {{ formatAdminJudgeAssignmentStatus(assignment.status) }}
                </AppBadge>
              </div>

              <div
                v-if="getAdminJudgeAssignmentInterventionPolicy(hackathonState, assignment.status).canReassign"
                class="grid gap-4 rounded-[1.25rem] border border-default/70 bg-elevated/70 px-4 py-4"
              >
                <div class="space-y-1">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                    Reassign
                  </h4>
                  <p class="text-sm text-toned">
                    Reassignment is available only while review has not started for this assignment.
                  </p>
                </div>

                <div class="grid gap-4 lg:grid-cols-[0.45fr_0.55fr]">
                  <label class="grid gap-2">
                    <span class="text-sm font-medium text-toned">Preferred replacement judge</span>
                    <select
                      v-model="getDraft(assignment).judgeUserId"
                      class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                      :data-testid="`admin-competition-reassign-select-${assignment.submissionId}`"
                    >
                      <option value="">
                        Auto-balance lowest-load judge
                      </option>
                      <option
                        v-for="choice in getReplacementChoices(assignment)"
                        :key="choice.value"
                        :value="choice.value"
                      >
                        {{ choice.label }}
                      </option>
                    </select>
                  </label>

                  <label class="grid gap-2">
                    <span class="text-sm font-medium text-toned">Operational note</span>
                    <input
                      v-model="getDraft(assignment).reassignReason"
                      type="text"
                      class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                      placeholder="Reassignment note"
                    >
                  </label>
                </div>

                <AppButton
                  color="warning"
                  :data-testid="`admin-competition-reassign-submit-${assignment.submissionId}`"
                  :loading="pendingActionKey === `reassign:${assignment.id}`"
                  :disabled="pendingActionKey !== null && pendingActionKey !== `reassign:${assignment.id}`"
                  @click="emit('reassign', {
                    assignmentId: assignment.id,
                    judgeUserId: getDraft(assignment).judgeUserId || undefined,
                    reason: getDraft(assignment).reassignReason.trim() || undefined
                  })"
                >
                  Reassign assignment
                </AppButton>
              </div>

              <div
                v-if="getAdminJudgeAssignmentInterventionPolicy(hackathonState, assignment.status).canForceSkip"
                class="grid gap-4 rounded-[1.25rem] border border-default/70 bg-elevated/70 px-4 py-4"
              >
                <div class="space-y-1">
                  <h4 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                    Force-skip
                  </h4>
                  <p class="text-sm text-toned">
                    Use this only when the assigned judge cannot finish an active review and the submission must be redistributed.
                  </p>
                </div>

                <label class="grid gap-2">
                  <span class="text-sm font-medium text-toned">Operational note</span>
                  <input
                    v-model="getDraft(assignment).forceSkipReason"
                    type="text"
                    class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                    placeholder="Force-skip note"
                  >
                </label>

                <AppButton
                  color="error"
                  variant="soft"
                  :data-testid="`admin-competition-force-skip-submit-${assignment.submissionId}`"
                  :loading="pendingActionKey === `force-skip:${assignment.id}`"
                  :disabled="pendingActionKey !== null && pendingActionKey !== `force-skip:${assignment.id}`"
                  @click="emit('forceSkip', {
                    assignmentId: assignment.id,
                    reason: getDraft(assignment).forceSkipReason.trim() || undefined
                  })"
                >
                  Force-skip assignment
                </AppButton>
              </div>
            </div>
          </article>
        </div>
      </template>
    </div>
  </AppCard>
</template>
