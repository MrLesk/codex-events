<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

import type {
  SubmissionTrackOption,
  TeamSubmissionActionAvailability,
  TeamSubmissionRecord
} from '~/utils/team-submission'

import {
  formatTeamSubmissionStatus,
  getTeamSubmissionStatusColor,
  getTeamSubmissionWorkspaceStatus
} from '~/utils/team-submission'
import { createTeamSubmissionFormSchema } from '~/utils/form-schemas'
import { cloneFormValues } from '~/utils/form-values'

const form = defineModel<{
  projectName: string
  summary: string
  repositoryUrl: string
  demoUrl: string
  trackId: string | null
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
  tracks?: SubmissionTrackOption[]
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
const createActionKey = computed(() => `create-submission:${props.teamId}`)
const updateActionKey = computed(() => props.submission ? `update-submission:${props.submission.id}` : null)
const submitActionKey = computed(() => props.submission ? `submit-submission:${props.submission.id}` : null)
const withdrawActionKey = computed(() => props.submission ? `withdraw-submission:${props.submission.id}` : null)
const hasMutableSubmission = computed(() =>
  Boolean(props.submission && (props.submission.status === 'draft' || props.submission.status === 'submitted'))
)
const sortedTracks = computed(() =>
  [...(props.tracks ?? [])].sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name))
)
const requiresTrackSelection = computed(() => sortedTracks.value.length > 0)
const trackSelectionInput = computed({
  get: () => form.value.trackId ?? '',
  set: (value: string) => {
    form.value.trackId = value.trim() || null
  }
})
const isFormReadOnly = computed(() =>
  props.submission
    ? !props.canManageSubmission || !hasMutableSubmission.value
    : !props.canManageSubmission
)
const isCreatePending = computed(() => isActionPending(createActionKey.value))
const isUpdatePending = computed(() => Boolean(updateActionKey.value && isActionPending(updateActionKey.value)))
const isSubmitPending = computed(() => Boolean(submitActionKey.value && isActionPending(submitActionKey.value)))
const isWithdrawPending = computed(() => Boolean(withdrawActionKey.value && isActionPending(withdrawActionKey.value)))
const isDraftMutationDisabled = computed(() =>
  isFormReadOnly.value
  || (!props.submission && !props.createAvailability.isAllowed)
  || Boolean(props.submission && !props.updateAvailability.isAllowed)
  || isCreatePending.value
  || isUpdatePending.value
)

function isActionPending(actionKey: string) {
  return props.pendingActionKey === actionKey
}

const syncingFromModel = ref(false)
const validationSchema = computed(() =>
  toTypedSchema(createTeamSubmissionFormSchema(requiresTrackSelection.value))
)

const {
  errors,
  submitCount,
  values,
  setValues,
  handleSubmit
} = useForm({
  validationSchema,
  initialValues: cloneFormValues(form.value)
})
const submitAttempted = computed(() => submitCount.value > 0)

watch(() => form.value, (nextForm) => {
  syncingFromModel.value = true
  setValues(cloneFormValues(nextForm), submitCount.value > 0)
  syncingFromModel.value = false
}, {
  deep: true,
  immediate: true
})

watch(values, (nextValues) => {
  if (syncingFromModel.value) {
    return
  }

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

const submitProjectForm = handleSubmit(() => {
  emit('submitProject')
})

function handleSaveAttempt(event?: Event) {
  submitSubmissionForm(event)
}

function handleSubmitProjectAttempt(event?: Event) {
  submitProjectForm(event)
}
</script>

<template>
  <div
    data-testid="participant-submission-panel"
    class="space-y-6"
  >
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
      <AppCard class="rounded-xl hackathon-workspace-detail-panel">
        <template #header>
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                Project submission
              </h2>

              <AppBadge
                data-testid="participant-submission-status"
                :color="submissionStatusColor"
                variant="soft"
              >
                {{ submissionStatusLabel }}
              </AppBadge>
            </div>

            <div
              v-if="!canManageSubmission"
              data-testid="participant-submission-admin-warning"
              class="flex items-center gap-2 text-sm text-warning"
            >
              <AppIcon
                name="i-lucide-triangle-alert"
                class="size-4 shrink-0"
              />
              <p>Only team admins can manage the project submission.</p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <p
            v-if="mutationError"
            class="text-sm text-error"
          >
            {{ mutationError }}
          </p>
          <p
            v-else-if="canManageSubmission && !submission && !createAvailability.isAllowed && createAvailability.reason"
            class="text-sm text-muted"
          >
            {{ createAvailability.reason }}
          </p>
          <p
            v-else-if="canManageSubmission && submission && !updateAvailability.isAllowed && updateAvailability.reason"
            class="text-sm text-muted"
          >
            {{ updateAvailability.reason }}
          </p>

          <form
            class="space-y-4"
            @submit.prevent="handleSaveAttempt"
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
                :class="submitAttempted && errors.projectName ? 'border-error/45 focus:border-error dark:border-error/50' : ''"
                :disabled="isDraftMutationDisabled"
              />
              <p
                v-if="submitAttempted && errors.projectName"
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
                :class="submitAttempted && errors.summary ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
                :disabled="isDraftMutationDisabled"
              />
              <p
                v-if="submitAttempted && errors.summary"
                class="text-xs text-error"
              >
                {{ errors.summary }}
              </p>
            </AppFormField>

            <AppFormField
              v-if="requiresTrackSelection"
              label="Track"
              name="participant-submission-track"
            >
              <AppSelect
                id="participant-submission-track"
                v-model="trackSelectionInput"
                name="participant-submission-track"
                :disabled="isDraftMutationDisabled"
                :class="submitAttempted && errors.trackId ? 'border-error/45 focus:border-error dark:border-error/50' : ''"
              >
                <option value="">
                  Select a track
                </option>
                <option
                  v-for="track in sortedTracks"
                  :key="track.id"
                  :value="track.id"
                >
                  {{ track.name }}
                </option>
              </AppSelect>
              <p
                v-if="submitAttempted && errors.trackId"
                class="text-xs text-error"
              >
                {{ errors.trackId }}
              </p>
              <p
                v-else-if="form.trackId"
                class="text-xs text-muted"
              >
                {{ sortedTracks.find(track => track.id === form.trackId)?.description }}
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
                  :class="submitAttempted && errors.repositoryUrl ? 'border-error/45 focus:border-error dark:border-error/50' : ''"
                  :disabled="isDraftMutationDisabled"
                />
                <p
                  v-if="submitAttempted && errors.repositoryUrl"
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
                  :class="submitAttempted && errors.demoUrl ? 'border-error/45 focus:border-error dark:border-error/50' : ''"
                  :disabled="isDraftMutationDisabled"
                />
                <p
                  v-if="submitAttempted && errors.demoUrl"
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
                  @click="handleSubmitProjectAttempt"
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
      </AppCard>
    </template>
  </div>
</template>
