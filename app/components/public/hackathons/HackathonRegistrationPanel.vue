<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

import type { PublicHackathon } from '~/composables/useHackathonPresentation'
import type {
  HackathonProfileField,
  ParticipantApplicationRecord,
  ParticipantApplicationSubmissionPolicy,
  ParticipantApplicationTermsDocument,
  ParticipantRegistrationTeamIntent,
  ParticipantRegistrationTeamMemberHint
} from '~/utils/participant-application'

import {
  formatParticipantApplicationStatus,
  getParticipantApplicationStatusColor,
  summarizeParticipantApplicationStatus
} from '~/utils/participant-application'
import { buildParticipantRegistrationFormSchema } from '~/utils/form-schemas'
import { cloneFormValues } from '~/utils/form-values'

const termsAccepted = defineModel<boolean>('termsAccepted', {
  required: true
})
const teamIntent = defineModel<ParticipantRegistrationTeamIntent>('teamIntent', {
  required: true
})
const teamMemberHints = defineModel<ParticipantRegistrationTeamMemberHint[]>('teamMemberHints', {
  required: true
})
const profileForm = defineModel<{
  firstName: string
  familyName: string
  xProfileUrl: string
  linkedinProfileUrl: string
  githubProfileUrl: string
  chatgptEmail: string
  openaiOrgId: string
  lumaUsername: string
}>('profileForm', {
  required: true
})

const props = defineProps<{
  hackathon: Pick<PublicHackathon, 'slug' | 'state'>
  application: ParticipantApplicationRecord | null
  currentApplicationTerms: ParticipantApplicationTermsDocument | null
  profileFields: HackathonProfileField[]
  submissionPolicy: ParticipantApplicationSubmissionPolicy
  teamsHref: string
  maxTeamMembers: number
  isSubmitting?: boolean
  isSavingProfile?: boolean
  profileError?: string
  submissionError?: string
  submissionSuccess?: string
  isLoading?: boolean
  workspaceErrorMessage?: string
}>()

const emit = defineEmits<{
  submitApplication: []
}>()

const applicationStatusSummary = computed(() =>
  props.application
    ? summarizeParticipantApplicationStatus(props.application.status, props.hackathon.state)
    : ''
)

const canRenderSubmissionForm = computed(() =>
  props.hackathon.state === 'registration_open' && !props.application
)

const canEditRegistrationHint = computed(() => !props.isSubmitting)
const teamIntentOptions: Array<{
  value: ParticipantRegistrationTeamIntent
  label: string
  icon: string
}> = [
  {
    value: 'solo',
    label: 'Solo',
    icon: 'i-lucide-user-round'
  },
  {
    value: 'team',
    label: 'Team',
    icon: 'i-lucide-users-round'
  },
  {
    value: 'unknown',
    label: 'Not sure',
    icon: 'i-lucide-circle-help'
  }
]

const syncingFromModels = ref(false)

const primaryProfileFields = computed(() =>
  props.profileFields.filter(field => field.key !== 'chatgptEmail' && field.key !== 'openaiOrgId')
)

const hackathonCreditProfileFields = computed(() =>
  props.profileFields.filter(field => field.key === 'chatgptEmail' || field.key === 'openaiOrgId')
)

const maxTeamMemberHints = computed(() => Math.max(0, props.maxTeamMembers - 1))
const applicationTermsPageHref = computed(() => `/hackathons/${props.hackathon.slug}/application-terms`)

const requiredChipClass = 'rounded-full border border-amber-600/35 bg-amber-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700 dark:border-amber-300/35 dark:bg-amber-300/12 dark:text-amber-200'
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const registrationSchema = computed(() => buildParticipantRegistrationFormSchema({
  profileFields: props.profileFields,
  maxTeamMembers: props.maxTeamMembers,
  hasCurrentApplicationTerms: Boolean(props.currentApplicationTerms)
}))

const {
  errors,
  submitCount,
  values,
  setValues,
  handleSubmit
} = useForm({
  validationSchema: computed(() => toTypedSchema(registrationSchema.value)),
  initialValues: {
    termsAccepted: termsAccepted.value,
    teamIntent: teamIntent.value,
    teamMemberHints: cloneFormValues(teamMemberHints.value),
    profileForm: cloneFormValues(profileForm.value)
  }
})

watch([
  termsAccepted,
  teamIntent,
  teamMemberHints,
  profileForm,
  () => props.profileFields,
  () => props.maxTeamMembers,
  () => props.currentApplicationTerms?.id ?? null
], () => {
  syncingFromModels.value = true
  setValues({
    termsAccepted: termsAccepted.value,
    teamIntent: teamIntent.value,
    teamMemberHints: cloneFormValues(teamMemberHints.value),
    profileForm: cloneFormValues(profileForm.value)
  }, submitCount.value > 0)
  syncingFromModels.value = false
}, {
  deep: true,
  immediate: true
})

watch(values, (nextValues) => {
  if (syncingFromModels.value) {
    return
  }

  termsAccepted.value = nextValues.termsAccepted ?? false
  teamIntent.value = nextValues.teamIntent ?? 'unknown'
  teamMemberHints.value = cloneFormValues(nextValues.teamMemberHints ?? [])

  if (nextValues.profileForm) {
    Object.assign(profileForm.value, cloneFormValues(nextValues.profileForm))
  }
}, {
  deep: true
})

const submitAttempted = computed(() => submitCount.value > 0)

const profileFieldErrors = computed(() => {
  const currentErrors = errors.value as Record<string, string | undefined>

  return {
    firstName: currentErrors['profileForm.firstName'] ?? '',
    familyName: currentErrors['profileForm.familyName'] ?? '',
    xProfileUrl: currentErrors['profileForm.xProfileUrl'] ?? '',
    linkedinProfileUrl: currentErrors['profileForm.linkedinProfileUrl'] ?? '',
    githubProfileUrl: currentErrors['profileForm.githubProfileUrl'] ?? '',
    chatgptEmail: currentErrors['profileForm.chatgptEmail'] ?? '',
    openaiOrgId: currentErrors['profileForm.openaiOrgId'] ?? '',
    lumaUsername: currentErrors['profileForm.lumaUsername'] ?? ''
  }
})

const teamMemberEmailErrors = computed(() =>
  teamMemberHints.value.map((_, index) => {
    const currentErrors = errors.value as Record<string, string | undefined>
    return currentErrors[`teamMemberHints[${index}].email`] ?? ''
  })
)

const teamMemberHintsError = computed(() => {
  const currentErrors = errors.value as Record<string, string | undefined>
  return currentErrors.teamMemberHints ?? ''
})

const termsAcceptedError = computed(() => {
  const currentErrors = errors.value as Record<string, string | undefined>
  return currentErrors.termsAccepted ?? ''
})

const hasClientValidationErrors = computed(() => Object.keys(errors.value).length > 0)

const canSubmitFromPanel = computed(() => props.submissionPolicy.isAllowed && !hasClientValidationErrors.value)

const submissionPolicyReason = computed(() => {
  if (props.submissionPolicy.isAllowed || !props.submissionPolicy.reason) {
    return ''
  }

  if (
    props.submissionPolicy.reason === 'Complete the required profile fields before submitting this application.'
    || props.submissionPolicy.reason === 'Accept the current application terms before submitting.'
  ) {
    return ''
  }

  return props.submissionPolicy.reason
})

const missingRequiredFieldCount = computed(() => {
  let count = 0

  if (!profileForm.value.firstName.trim()) {
    count += 1
  }

  if (!profileForm.value.familyName.trim()) {
    count += 1
  }

  for (const field of props.profileFields) {
    if (!field.required) {
      continue
    }

    const value = profileForm.value[field.key]

    if (typeof value !== 'string' || value.trim().length === 0) {
      count += 1
    }
  }

  if (props.currentApplicationTerms && !termsAccepted.value) {
    count += 1
  }

  return count
})

const invalidFieldCount = computed(() => {
  const requiredKeys = new Set<string>()
  requiredKeys.add('firstName')
  requiredKeys.add('familyName')

  for (const field of props.profileFields) {
    if (field.required) {
      requiredKeys.add(field.key)
    }
  }

  if (props.currentApplicationTerms) {
    requiredKeys.add('termsAccepted')
  }

  let invalidCount = 0

  for (const key of Object.keys(profileFieldErrors.value)) {
    if (!requiredKeys.has(key)) {
      invalidCount += 1
    }
  }

  invalidCount += teamMemberEmailErrors.value.filter(error => error.length > 0).length

  return invalidCount
})

const submitReadinessText = computed(() => {
  if (missingRequiredFieldCount.value > 0) {
    return `${missingRequiredFieldCount.value} required item${missingRequiredFieldCount.value === 1 ? '' : 's'} left`
  }

  if (invalidFieldCount.value > 0) {
    return `${invalidFieldCount.value} field${invalidFieldCount.value === 1 ? '' : 's'} need attention`
  }

  return 'Ready to submit'
})

const isSubmitDisabled = computed(() => props.isSubmitting || props.isSavingProfile)

const submitApplicationForm = handleSubmit(() => {
  if (isSubmitDisabled.value || !canSubmitFromPanel.value) {
    return
  }

  emit('submitApplication')
})

function handleSubmitAttempt(event?: Event) {
  submitApplicationForm(event)
}

function getProfileFieldType(key: HackathonProfileField['key']) {
  return key === 'chatgptEmail' ? 'email' : key.includes('Url') ? 'url' : 'text'
}

function getProfileFieldPlaceholder(key: HackathonProfileField['key']) {
  switch (key) {
    case 'xProfileUrl':
      return 'https://x.com/your-name'
    case 'linkedinProfileUrl':
      return 'https://linkedin.com/in/your-name'
    case 'githubProfileUrl':
      return 'https://github.com/your-name'
    case 'chatgptEmail':
      return 'you@example.com'
    case 'openaiOrgId':
      return 'org_1234567890'
    case 'lumaUsername':
      return 'your-luma-name'
  }
}
</script>

<template>
  <section class="space-y-4">
    <div class="space-y-4">
      <AppAlert
        v-if="isLoading"
        color="neutral"
        variant="soft"
        title="Loading registration"
        description="Checking your application status and terms."
      />

      <AppAlert
        v-else-if="workspaceErrorMessage"
        color="error"
        variant="soft"
        title="Registration unavailable"
        :description="workspaceErrorMessage"
      />

      <template v-else>
        <AppAlert
          v-if="profileError"
          color="error"
          variant="soft"
          title="Profile update failed"
          :description="profileError"
        />

        <AppAlert
          v-if="submissionError"
          color="error"
          variant="soft"
          title="Application submission failed"
          :description="submissionError"
        />

        <AppAlert
          v-if="submissionSuccess"
          color="success"
          variant="soft"
          :description="submissionSuccess"
        />

        <template v-if="application">
          <div class="rounded-xl border border-black/8 bg-white/80 px-4 py-4 dark:border-white/[0.08] dark:bg-[#171717]/80">
            <div class="flex flex-wrap items-center gap-3">
              <p class="text-[14px] font-medium text-highlighted dark:text-white">
                Application status
              </p>
              <AppBadge
                :color="getParticipantApplicationStatusColor(application.status)"
                variant="soft"
                class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
              >
                {{ formatParticipantApplicationStatus(application.status) }}
              </AppBadge>
            </div>

            <p class="mt-2 text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
              {{ applicationStatusSummary }}
            </p>

            <AppButton
              v-if="application.status === 'approved'"
              :to="teamsHref"
              color="neutral"
              variant="solid"
              class="mt-4 h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
            >
              Open teams
              <template #trailing>
                <AppIcon
                  name="i-lucide-arrow-up-right"
                  class="size-3.5"
                />
              </template>
            </AppButton>
          </div>
        </template>

        <template v-else-if="canRenderSubmissionForm">
          <form
            class="space-y-4 rounded-xl border border-black/8 bg-white/80 px-4 pb-20 pt-4 dark:border-white/[0.08] dark:bg-[#171717]/80 md:pb-4"
            @submit.prevent="handleSubmitAttempt"
          >
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <p class="text-[13px] font-medium text-highlighted dark:text-white">
                  Participant profile
                </p>
              </div>

              <div class="grid gap-3 md:grid-cols-2">
                <label class="space-y-1">
                  <span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-600 dark:text-[#A3A3A3]">
                    <span>First name</span>
                    <span :class="requiredChipClass">
                      Required
                    </span>
                  </span>
                  <input
                    v-model="profileForm.firstName"
                    type="text"
                    :disabled="isSubmitting || isSavingProfile"
                    class="w-full rounded-lg border bg-white px-3 py-2 text-sm text-highlighted outline-none transition dark:bg-[#111111] dark:text-white"
                    :class="submitAttempted && profileFieldErrors.firstName
                      ? 'border-error/45 focus:border-error dark:border-error/50'
                      : 'border-black/8 focus:border-black/25 dark:border-white/[0.08]'"
                    placeholder="Ada"
                  >
                  <p
                    v-if="submitAttempted && profileFieldErrors.firstName"
                    class="text-[11px] text-error"
                  >
                    {{ profileFieldErrors.firstName }}
                  </p>
                </label>

                <label class="space-y-1">
                  <span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-600 dark:text-[#A3A3A3]">
                    <span>Family name</span>
                    <span :class="requiredChipClass">
                      Required
                    </span>
                  </span>
                  <input
                    v-model="profileForm.familyName"
                    type="text"
                    :disabled="isSubmitting || isSavingProfile"
                    class="w-full rounded-lg border bg-white px-3 py-2 text-sm text-highlighted outline-none transition dark:bg-[#111111] dark:text-white"
                    :class="submitAttempted && profileFieldErrors.familyName
                      ? 'border-error/45 focus:border-error dark:border-error/50'
                      : 'border-black/8 focus:border-black/25 dark:border-white/[0.08]'"
                    placeholder="Lovelace"
                  >
                  <p
                    v-if="submitAttempted && profileFieldErrors.familyName"
                    class="text-[11px] text-error"
                  >
                    {{ profileFieldErrors.familyName }}
                  </p>
                </label>
              </div>
            </div>

            <div class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <p class="text-[13px] font-medium text-highlighted dark:text-white">
                  Profile fields
                </p>
              </div>

              <div class="grid gap-3 md:grid-cols-2">
                <label
                  v-for="field in primaryProfileFields"
                  :key="field.key"
                  class="space-y-1"
                >
                  <span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-600 dark:text-[#A3A3A3]">
                    <span>{{ field.label }}</span>
                    <span
                      v-if="field.required"
                      :class="requiredChipClass"
                      aria-label="Required field"
                    >
                      Required
                    </span>
                  </span>
                  <input
                    v-model="profileForm[field.key]"
                    :type="getProfileFieldType(field.key) === 'email' ? 'email' : 'text'"
                    :inputmode="getProfileFieldType(field.key) === 'url' ? 'url' : undefined"
                    :disabled="isSubmitting || isSavingProfile"
                    class="w-full rounded-lg border bg-white px-3 py-2 text-sm text-highlighted outline-none transition dark:bg-[#111111] dark:text-white"
                    :class="submitAttempted && profileFieldErrors[field.key]
                      ? 'border-error/45 focus:border-error dark:border-error/50'
                      : 'border-black/8 focus:border-black/25 dark:border-white/[0.08]'"
                    :placeholder="getProfileFieldPlaceholder(field.key)"
                  >
                  <p
                    v-if="submitAttempted && profileFieldErrors[field.key]"
                    class="text-[11px] text-error"
                  >
                    {{ profileFieldErrors[field.key] }}
                  </p>
                </label>
              </div>
            </div>

            <section
              v-if="hackathonCreditProfileFields.length > 0"
              class="space-y-3 rounded-lg border border-black/8 px-3 py-3 dark:border-white/[0.08]"
            >
              <p class="text-[13px] font-medium text-highlighted dark:text-white">
                Hackathon profile fields
              </p>
              <p class="text-[12px] text-neutral-500 dark:text-[#8C8C8C]">
                Required fields in this section are used for Codex credit attribution in this hackathon.
              </p>

              <div class="grid gap-3 md:grid-cols-2">
                <label
                  v-for="field in hackathonCreditProfileFields"
                  :key="field.key"
                  class="space-y-1"
                >
                  <span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-600 dark:text-[#A3A3A3]">
                    <span>{{ field.label }}</span>
                    <span
                      v-if="field.required"
                      :class="requiredChipClass"
                      aria-label="Required field"
                    >
                      Required
                    </span>
                  </span>
                  <input
                    v-model="profileForm[field.key]"
                    :type="getProfileFieldType(field.key) === 'email' ? 'email' : 'text'"
                    :inputmode="getProfileFieldType(field.key) === 'url' ? 'url' : undefined"
                    :disabled="isSubmitting || isSavingProfile"
                    class="w-full rounded-lg border bg-white px-3 py-2 text-sm text-highlighted outline-none transition dark:bg-[#111111] dark:text-white"
                    :class="submitAttempted && profileFieldErrors[field.key]
                      ? 'border-error/45 focus:border-error dark:border-error/50'
                      : 'border-black/8 focus:border-black/25 dark:border-white/[0.08]'"
                    :placeholder="getProfileFieldPlaceholder(field.key)"
                  >
                  <p
                    v-if="submitAttempted && profileFieldErrors[field.key]"
                    class="text-[11px] text-error"
                  >
                    {{ profileFieldErrors[field.key] }}
                  </p>
                  <p
                    v-if="field.key === 'openaiOrgId'"
                    class="text-[11px] text-neutral-500 dark:text-[#8C8C8C]"
                  >
                    Find your org ID at
                    <a
                      href="https://platform.openai.com/orgid"
                      target="_blank"
                      rel="noreferrer"
                      class="text-primary underline-offset-2 hover:underline"
                    >
                      platform.openai.com/orgid
                    </a>
                  </p>
                </label>
              </div>
            </section>

            <AppAlert
              v-if="submissionPolicyReason"
              color="neutral"
              variant="soft"
              :description="submissionPolicyReason"
            />

            <div class="space-y-2">
              <p class="text-[14px] font-medium text-highlighted dark:text-white">
                Applying as
              </p>
              <div class="grid gap-2 sm:grid-cols-3">
                <button
                  v-for="option in teamIntentOptions"
                  :key="option.value"
                  type="button"
                  class="flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors"
                  :class="teamIntent === option.value
                    ? 'border-black/25 bg-black/6 text-highlighted dark:border-white/25 dark:bg-white/[0.08] dark:text-white'
                    : 'border-black/8 text-neutral-600 hover:border-black/20 dark:border-white/[0.08] dark:text-[#A3A3A3] dark:hover:border-white/[0.2]'"
                  :aria-pressed="teamIntent === option.value"
                  :disabled="!canEditRegistrationHint"
                  @click="teamIntent = option.value"
                >
                  <span class="inline-flex items-center gap-2 text-[13px] font-medium">
                    <AppIcon
                      :name="option.icon"
                      class="size-3.5"
                    />
                    {{ option.label }}
                  </span>
                  <AppIcon
                    v-if="teamIntent === option.value"
                    name="i-lucide-check"
                    class="size-3.5"
                  />
                </button>
              </div>
              <p class="text-[12px] text-neutral-500 dark:text-[#8C8C8C]">
                Tell us if you apply with teammates so we can review and approve your group together after a positive review.
              </p>
            </div>

            <div
              v-if="teamIntent === 'team'"
              class="space-y-3"
            >
              <p class="text-[14px] font-medium text-highlighted dark:text-white">
                Teammates (up to {{ maxTeamMemberHints }})
              </p>
              <p class="text-[13px] text-neutral-500 dark:text-[#8C8C8C]">
                Add name or email.
              </p>
              <p
                v-if="submitAttempted && teamMemberHintsError"
                class="text-[11px] text-error"
              >
                {{ teamMemberHintsError }}
              </p>
              <div
                v-for="(member, index) in teamMemberHints"
                :key="index"
                class="rounded-lg border border-black/8 px-3 py-3 dark:border-white/[0.08]"
              >
                <p class="mb-2 text-[12px] font-medium text-neutral-600 dark:text-[#A3A3A3]">
                  Teammate {{ index + 1 }}
                </p>
                <div class="grid gap-3 md:grid-cols-2">
                  <input
                    v-model="member.fullName"
                    type="text"
                    :disabled="!canEditRegistrationHint"
                    class="rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:text-white"
                    placeholder="Name and family name"
                  >
                  <input
                    v-model="member.email"
                    type="email"
                    :disabled="!canEditRegistrationHint"
                    class="rounded-lg border bg-white px-3 py-2 text-sm text-highlighted outline-none transition dark:bg-[#111111] dark:text-white"
                    :class="submitAttempted && teamMemberEmailErrors[index]
                      ? 'border-error/45 focus:border-error dark:border-error/50'
                      : 'border-black/8 focus:border-black/25 dark:border-white/[0.08]'"
                    placeholder="Email"
                  >
                </div>
                <p
                  v-if="submitAttempted && teamMemberEmailErrors[index]"
                  class="mt-2 text-[11px] text-error"
                >
                  {{ teamMemberEmailErrors[index] }}
                </p>
              </div>
            </div>

            <AppCheckbox
              v-if="currentApplicationTerms"
              v-model="termsAccepted"
              :disabled="isSubmitting"
            >
              <span>
                I accept
                <NuxtLink
                  :to="applicationTermsPageHref"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="ml-1 inline-flex items-center gap-1 font-semibold text-sky-700 underline decoration-2 underline-offset-2 transition-colors hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                  @click.stop
                >
                  Application Terms
                  <AppIcon
                    name="i-lucide-external-link"
                    class="size-3.5"
                  />
                </NuxtLink>.
              </span>
            </AppCheckbox>

            <p
              v-if="submitAttempted && termsAcceptedError"
              class="text-[11px] text-error"
            >
              {{ termsAcceptedError }}
            </p>
            <AppAlert
              v-if="!currentApplicationTerms"
              color="warning"
              variant="soft"
              title="Application terms unavailable"
              description="Current terms are not available right now."
            />

            <AppButton
              type="submit"
              color="neutral"
              variant="solid"
              :loading="isSubmitting || isSavingProfile"
              :disabled="isSubmitDisabled"
              class="hidden h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC] md:inline-flex"
            >
              Submit application
            </AppButton>

            <div class="sticky bottom-0 -mx-4 border-t border-black/8 bg-white/80 px-4 py-3 backdrop-blur md:hidden dark:border-white/[0.08] dark:bg-[#171717]/80">
              <div class="flex items-center justify-between gap-3">
                <p class="text-[12px] font-medium text-neutral-600 dark:text-[#A3A3A3]">
                  {{ submitReadinessText }}
                </p>
                <AppButton
                  type="submit"
                  color="neutral"
                  variant="solid"
                  :loading="isSubmitting || isSavingProfile"
                  :disabled="isSubmitDisabled"
                  class="h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                >
                  Submit application
                </AppButton>
              </div>
            </div>
          </form>
        </template>

        <template v-else>
          <AppAlert
            color="neutral"
            variant="soft"
            title="Applications are not open"
            description="This hackathon is outside the registration window."
          />
        </template>
      </template>
    </div>
  </section>
</template>
