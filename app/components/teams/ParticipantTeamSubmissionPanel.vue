<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

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
import { formatTimestamp } from '~/utils/date-formatting'
import { teamSubmissionFormSchema } from '~/utils/form-schemas'
import { cloneFormValues } from '~/utils/form-values'

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

const {
  errors,
  submitCount,
  values,
  setValues,
  handleSubmit
} = useForm({
  validationSchema: toTypedSchema(teamSubmissionFormSchema),
  initialValues: cloneFormValues(form.value)
})

watch(() => form.value, (nextForm) => {
  setValues(cloneFormValues(nextForm), false)
}, {
  deep: true,
  immediate: true
})

watch(values, (nextValues) => {
  Object.assign(form.value, cloneFormValues(nextValues))
}, {
  deep: true
})

const submitSubmissionForm = handleSubmit(() => {
  if (props.submission) {
    emit('saveChanges')
    return
  }

  emit('createDraft')
})
</script>

<template>
  <AppCard
    data-testid="participant-submission-panel"
    class="rounded-xl hackathon-workspace-detail-panel"
  >
    <template #header>
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="text-xl font-semibold text-highlighted dark:text-white">
            Project submission
          </h2>

          <AppBadge
            :color="submissionStatusColor"
            variant="soft"
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
        <div class="app-inset-card px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Submission summary
          </p>
          <p class="mt-2 text-sm leading-7 text-toned">
            {{ submissionSummary }}
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div class="app-inset-card px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Current status
            </p>
            <p
              data-testid="participant-submission-status"
              class="mt-2 text-lg font-semibold text-highlighted"
            >
              {{ submissionStatusLabel }}
            </p>
          </div>

          <div class="app-inset-card px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Submitted at
            </p>
            <p class="mt-2 text-sm font-medium text-highlighted">
              {{ formatTimestamp(submission?.submittedAt, 'Not submitted yet') }}
            </p>
          </div>

          <div class="app-inset-card px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Last updated
            </p>
            <p class="mt-2 text-sm font-medium text-highlighted">
              {{ formatTimestamp(submission?.updatedAt, 'No submission record yet') }}
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
          <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
            <h3 class="text-lg font-semibold text-highlighted dark:text-white">
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
            @submit.prevent="submitSubmissionForm"
          >
            <AppFormField
              label="Project name"
              name="participant-submission-project-name"
            >
              <AppInput
                id="participant-submission-project-name"
                v-model="form.projectName"
                name="participant-submission-project-name"
                size="xl"
                class="w-full"
                :disabled="isFormReadOnly || (!submission && !createAvailability.isAllowed) || isCreatePending || isUpdatePending"
              />
              <p
                v-if="submitCount > 0 && errors.projectName"
                class="text-xs text-error"
              >
                {{ errors.projectName }}
              </p>
            </AppFormField>

            <AppFormField
              label="Summary"
              name="participant-submission-summary"
            >
              <AppTextarea
                id="participant-submission-summary"
                v-model="form.summary"
                name="participant-submission-summary"
                rows="5"
                :disabled="isFormReadOnly || (!submission && !createAvailability.isAllowed) || isCreatePending || isUpdatePending"
              />
              <p
                v-if="submitCount > 0 && errors.summary"
                class="text-xs text-error"
              >
                {{ errors.summary }}
              </p>
            </AppFormField>

            <div class="grid gap-4 lg:grid-cols-2">
              <AppFormField
                label="Repository URL"
                name="participant-submission-repository-url"
              >
                <AppInput
                  id="participant-submission-repository-url"
                  v-model="form.repositoryUrl"
                  name="participant-submission-repository-url"
                  type="text"
                  size="xl"
                  class="w-full"
                  :class="submitCount > 0 && errors.repositoryUrl ? 'border-error/45 focus:border-error dark:border-error/50' : ''"
                  :disabled="isFormReadOnly || (!submission && !createAvailability.isAllowed) || isCreatePending || isUpdatePending"
                />
                <p
                  v-if="submitCount > 0 && errors.repositoryUrl"
                  class="text-xs text-error"
                >
                  {{ errors.repositoryUrl }}
                </p>
              </AppFormField>

              <AppFormField
                label="Demo URL"
                name="participant-submission-demo-url"
              >
                <AppInput
                  id="participant-submission-demo-url"
                  v-model="form.demoUrl"
                  name="participant-submission-demo-url"
                  type="text"
                  size="xl"
                  class="w-full"
                  :class="submitCount > 0 && errors.demoUrl ? 'border-error/45 focus:border-error dark:border-error/50' : ''"
                  :disabled="isFormReadOnly || (!submission && !createAvailability.isAllowed) || isCreatePending || isUpdatePending"
                />
                <p
                  v-if="submitCount > 0 && errors.demoUrl"
                  class="text-xs text-error"
                >
                  {{ errors.demoUrl }}
                </p>
              </AppFormField>
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
