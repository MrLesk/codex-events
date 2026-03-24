<script setup lang="ts">
import type {
  TeamSubmissionActionAvailability,
  TeamSubmissionRecord
} from '~/utils/team-submission'

import {
  formatTeamSubmissionStatus,
  getTeamSubmissionStateSummary,
  getTeamSubmissionStatusColor,
  getTeamSubmissionWorkspaceStatus
} from '~/utils/team-submission'

const form = defineModel<{
  projectName: string
  summary: string
  repositoryUrl: string
  demoUrl: string
}>('form', {
  required: true
})

const props = defineProps<{
  teamId: string
  hackathonState: 'draft' | 'registration_open' | 'submission_open' | 'judging_preparation' | 'judge_review' | 'shortlist' | 'winners_announced' | 'completed'
  submission: TeamSubmissionRecord | null
  status: 'idle' | 'pending' | 'success' | 'error'
  errorMessage?: string
  mutationError?: string
  canManageSubmission?: boolean
  createAvailability: TeamSubmissionActionAvailability
  updateAvailability: TeamSubmissionActionAvailability
  submitAvailability: TeamSubmissionActionAvailability
  withdrawAvailability: TeamSubmissionActionAvailability
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  createDraft: []
  saveChanges: []
  submitProject: []
  withdrawSubmission: []
}>()

const submissionStatus = computed(() => getTeamSubmissionWorkspaceStatus(props.submission))
const submissionStatusLabel = computed(() => formatTeamSubmissionStatus(submissionStatus.value))
const submissionStatusColor = computed(() => getTeamSubmissionStatusColor(submissionStatus.value))
const submissionSummary = computed(() => getTeamSubmissionStateSummary({
  state: props.hackathonState
}, props.submission))
const createActionKey = computed(() => `create-submission:${props.teamId}`)
const updateActionKey = computed(() => props.submission ? `update-submission:${props.submission.id}` : null)
const submitActionKey = computed(() => props.submission ? `submit-submission:${props.submission.id}` : null)
const withdrawActionKey = computed(() => props.submission ? `withdraw-submission:${props.submission.id}` : null)
const hasMutableSubmission = computed(() =>
  Boolean(props.submission && (props.submission.status === 'draft' || props.submission.status === 'submitted'))
)
const isFormReadOnly = computed(() =>
  props.submission
    ? !props.canManageSubmission || !hasMutableSubmission.value
    : !props.canManageSubmission
)
const isCreatePending = computed(() => isActionPending(createActionKey.value))
const isUpdatePending = computed(() => Boolean(updateActionKey.value && isActionPending(updateActionKey.value)))
const isSubmitPending = computed(() => Boolean(submitActionKey.value && isActionPending(submitActionKey.value)))
const isWithdrawPending = computed(() => Boolean(withdrawActionKey.value && isActionPending(withdrawActionKey.value)))

function isActionPending(actionKey: string) {
  return props.pendingActionKey === actionKey
}
</script>

<template>
  <AppCard
    data-testid="participant-submission-panel"
    class="border border-default/70 bg-elevated/90"
  >
    <template #header>
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="text-lg font-semibold text-highlighted">
            Project Submission
          </h2>

          <AppBadge
            :color="submissionStatusColor"
            variant="soft"
            data-testid="participant-submission-status"
          >
            {{ submissionStatusLabel }}
          </AppBadge>
        </div>

        <p class="text-sm text-muted">
          {{ submissionSummary }}
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <AppAlert
        v-if="status === 'pending'"
        color="neutral"
        variant="soft"
        title="Loading submission"
        description="Resolving the current submission record for this team."
      />

      <AppAlert
        v-else-if="status === 'error' && errorMessage"
        color="error"
        variant="soft"
        title="Submission unavailable"
        :description="errorMessage"
      />

      <template v-else>
        <div class="grid gap-4 md:grid-cols-3">
          <div class="app-inset-card-tight px-4 py-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Current status
            </p>
            <p class="mt-2 text-lg font-semibold text-highlighted">
              {{ submissionStatusLabel }}
            </p>
          </div>

          <div class="app-inset-card-tight px-4 py-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Submitted at
            </p>
            <p class="mt-2 text-sm font-medium text-highlighted">
              {{ submission?.submittedAt ?? 'Not submitted yet' }}
            </p>
          </div>

          <div class="app-inset-card-tight px-4 py-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Last updated
            </p>
            <p class="mt-2 text-sm font-medium text-highlighted">
              {{ submission?.updatedAt ?? 'No submission record yet' }}
            </p>
          </div>
        </div>

        <div
          v-if="submission"
          class="app-inset-card px-5 py-5"
        >
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Current project snapshot
            </p>
            <p
              data-testid="participant-submission-project-name"
              class="text-xl font-semibold text-highlighted"
            >
              {{ submission.projectName ?? 'Untitled project draft' }}
            </p>
            <p
              v-if="submission.summary"
              class="text-sm leading-7 text-toned whitespace-pre-wrap"
            >
              {{ submission.summary }}
            </p>
            <div class="flex flex-wrap gap-3 text-sm text-toned">
              <span>Repository: {{ submission.repositoryUrl ?? 'Not provided' }}</span>
              <span>Demo: {{ submission.demoUrl ?? 'Not provided' }}</span>
            </div>
          </div>
        </div>

        <div class="app-inset-card px-5 py-5">
          <div class="space-y-1">
            <h3 class="text-lg font-semibold text-highlighted">
              {{ submission ? 'Submission details' : 'Start the first draft' }}
            </h3>
            <p
              v-if="mutationError"
              class="text-sm text-error"
            >
              {{ mutationError }}
            </p>
            <p
              v-else-if="!submission && !createAvailability.isAllowed && createAvailability.reason"
              class="text-sm text-muted"
            >
              {{ createAvailability.reason }}
            </p>
            <p
              v-else-if="submission && !updateAvailability.isAllowed && updateAvailability.reason"
              class="text-sm text-muted"
            >
              {{ updateAvailability.reason }}
            </p>
            <p
              v-else
              class="text-sm text-muted"
            >
              Team admins manage the canonical project fields here while submission actions remain available.
            </p>
          </div>

          <form
            class="mt-5 space-y-4"
            @submit.prevent="submission ? emit('saveChanges') : emit('createDraft')"
          >
            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Project name</span>
              <input
                v-model="form.projectName"
                type="text"
                class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isFormReadOnly || (!submission && !createAvailability.isAllowed) || isCreatePending || isUpdatePending"
              >
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Summary</span>
              <textarea
                v-model="form.summary"
                class="min-h-32 rounded-2xl border border-default bg-elevated px-4 py-3 text-sm leading-7 text-highlighted outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isFormReadOnly || (!submission && !createAvailability.isAllowed) || isCreatePending || isUpdatePending"
              />
            </label>

            <div class="grid gap-4 lg:grid-cols-2">
              <label class="grid gap-2">
                <span class="text-sm font-medium text-toned">Repository URL</span>
                <input
                  v-model="form.repositoryUrl"
                  type="url"
                  class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isFormReadOnly || (!submission && !createAvailability.isAllowed) || isCreatePending || isUpdatePending"
                >
              </label>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-toned">Demo URL</span>
                <input
                  v-model="form.demoUrl"
                  type="url"
                  class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isFormReadOnly || (!submission && !createAvailability.isAllowed) || isCreatePending || isUpdatePending"
                >
              </label>
            </div>

            <div class="flex flex-wrap gap-3">
              <AppButton
                v-if="!submission"
                type="submit"
                color="primary"
                :loading="isCreatePending"
                :disabled="!createAvailability.isAllowed || isCreatePending"
                data-testid="participant-submission-create"
              >
                Create draft
              </AppButton>

              <template v-else>
                <AppButton
                  type="submit"
                  color="primary"
                  :loading="isUpdatePending"
                  :disabled="!updateAvailability.isAllowed || isUpdatePending"
                  data-testid="participant-submission-save"
                >
                  Save changes
                </AppButton>

                <AppButton
                  type="button"
                  color="primary"
                  variant="soft"
                  :loading="isSubmitPending"
                  :disabled="!submitAvailability.isAllowed || isSubmitPending"
                  data-testid="participant-submission-submit"
                  @click="emit('submitProject')"
                >
                  Submit project
                </AppButton>

                <AppButton
                  type="button"
                  color="warning"
                  variant="soft"
                  :loading="isWithdrawPending"
                  :disabled="!withdrawAvailability.isAllowed || isWithdrawPending"
                  data-testid="participant-submission-withdraw"
                  @click="emit('withdrawSubmission')"
                >
                  Withdraw submission
                </AppButton>
              </template>
            </div>
          </form>
        </div>
      </template>
    </div>
  </AppCard>
</template>
