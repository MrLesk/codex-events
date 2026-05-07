<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

import { formatHackathonLocation, type PublicHackathon } from '~/domains/hackathons/presentation'
import type {
  HackathonProfileField,
  ParticipantApplicationSubmittedTransition,
  ParticipantApplicationSubmissionPolicy,
  ParticipantApplicationTermsDocument,
  ParticipantRegistrationTeamIntent,
  ParticipantRegistrationTeamMemberHint
} from '~/domains/applications/participant-application'

import { areParticipantTeamMemberHintsEqual } from '~/domains/applications/participant-application'
import { buildParticipantRegistrationFormSchema } from '~/domains/applications/participant-application-form'
import { cloneFormValues } from '~/utils/form-values'

const termsAccepted = defineModel<boolean>('termsAccepted', {
  required: true
})
const inPersonAttendanceCommitment = defineModel<boolean>('inPersonAttendanceCommitment', {
  required: true
})
const whyThisHackathon = defineModel<string>('whyThisHackathon', {
  required: true
})
const proofOfExecutionUrl = defineModel<string>('proofOfExecutionUrl', {
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
  lumaEmail: string
}>('profileForm', {
  required: true
})

const props = defineProps<{
  hackathon: Pick<PublicHackathon, 'slug' | 'state' | 'city' | 'country' | 'autoApproveApplications' | 'inPersonEvent' | 'requireWhyThisHackathon' | 'requireProofOfExecution'>
  currentApplicationTerms: ParticipantApplicationTermsDocument | null
  profileFields: HackathonProfileField[]
  submissionPolicy: ParticipantApplicationSubmissionPolicy
  inPersonCommitmentDateLabel: string
  maxTeamMembers: number
  isSubmitting?: boolean
  isSavingProfile?: boolean
  profileError?: string
  submissionError?: string
  submissionTransition?: ParticipantApplicationSubmittedTransition | null
  isLoading?: boolean
  workspaceErrorMessage?: string
}>()

const emit = defineEmits<{
  submitApplication: []
}>()

const canRenderSubmissionForm = computed(() => props.hackathon.state === 'registration_open')
const hackathonLocationLabel = computed(() => formatHackathonLocation(props.hackathon))

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
    label: 'I\'ll decide later',
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
const inlineSectionClass = 'space-y-3 border-t border-black/8 pt-4 dark:border-white/[0.08]'
const inlineSectionBodyClass = 'space-y-3'

const registrationSchema = computed(() => buildParticipantRegistrationFormSchema({
  profileFields: props.profileFields,
  maxTeamMembers: props.maxTeamMembers,
  hasCurrentApplicationTerms: Boolean(props.currentApplicationTerms),
  isInPersonEvent: props.hackathon.inPersonEvent,
  requireWhyThisHackathon: props.hackathon.requireWhyThisHackathon,
  requireProofOfExecution: props.hackathon.requireProofOfExecution
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
    inPersonAttendanceCommitment: inPersonAttendanceCommitment.value,
    whyThisHackathon: whyThisHackathon.value,
    proofOfExecutionUrl: proofOfExecutionUrl.value,
    teamIntent: teamIntent.value,
    teamMemberHints: cloneFormValues(teamMemberHints.value),
    profileForm: cloneFormValues(profileForm.value)
  }
})

watch([
  termsAccepted,
  inPersonAttendanceCommitment,
  whyThisHackathon,
  proofOfExecutionUrl,
  teamIntent,
  teamMemberHints,
  profileForm,
  () => props.profileFields,
  () => props.maxTeamMembers,
  () => props.currentApplicationTerms?.id ?? null,
  () => props.hackathon.inPersonEvent
], () => {
  syncingFromModels.value = true
  setValues({
    termsAccepted: termsAccepted.value,
    inPersonAttendanceCommitment: inPersonAttendanceCommitment.value,
    whyThisHackathon: whyThisHackathon.value,
    proofOfExecutionUrl: proofOfExecutionUrl.value,
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
  inPersonAttendanceCommitment.value = nextValues.inPersonAttendanceCommitment ?? false
  whyThisHackathon.value = nextValues.whyThisHackathon ?? ''
  proofOfExecutionUrl.value = nextValues.proofOfExecutionUrl ?? ''
  teamIntent.value = nextValues.teamIntent ?? 'unknown'

  const nextTeamMemberHints = cloneFormValues(nextValues.teamMemberHints ?? [])

  if (!areParticipantTeamMemberHintsEqual(teamMemberHints.value, nextTeamMemberHints)) {
    teamMemberHints.value = nextTeamMemberHints
  }

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
    lumaEmail: currentErrors['profileForm.lumaEmail'] ?? ''
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

const inPersonAttendanceCommitmentError = computed(() => {
  const currentErrors = errors.value as Record<string, string | undefined>
  return currentErrors.inPersonAttendanceCommitment ?? ''
})

const whyThisHackathonError = computed(() => {
  const currentErrors = errors.value as Record<string, string | undefined>
  return currentErrors.whyThisHackathon ?? ''
})

const proofOfExecutionUrlError = computed(() => {
  const currentErrors = errors.value as Record<string, string | undefined>
  return currentErrors.proofOfExecutionUrl ?? ''
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
    || props.submissionPolicy.reason === 'Confirm in-person attendance commitment before submitting this application.'
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

  if (props.hackathon.inPersonEvent && !inPersonAttendanceCommitment.value) {
    count += 1
  }

  if (props.hackathon.requireWhyThisHackathon && !whyThisHackathon.value.trim()) {
    count += 1
  }

  if (props.hackathon.requireProofOfExecution && !proofOfExecutionUrl.value.trim()) {
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

  if (props.hackathon.inPersonEvent) {
    requiredKeys.add('inPersonAttendanceCommitment')
  }

  if (props.hackathon.requireWhyThisHackathon) {
    requiredKeys.add('whyThisHackathon')
  }

  if (props.hackathon.requireProofOfExecution) {
    requiredKeys.add('proofOfExecutionUrl')
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
  return key === 'chatgptEmail' || key === 'lumaEmail'
    ? 'email'
    : key.includes('Url')
      ? 'url'
      : 'text'
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
      return 'org-1234567890'
    case 'lumaEmail':
      return 'you@example.com'
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
        <article
          v-if="submissionTransition"
          class="rounded-[1.75rem] border border-success/30 bg-success/10 px-6 py-6 shadow-[0_24px_54px_-42px_rgba(16,110,66,0.45)]"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-full border border-success/30 bg-white/80 text-success-700 dark:bg-black/20 dark:text-success-300">
              <AppIcon
                name="i-lucide-loader-circle"
                class="size-5 animate-spin"
              />
            </div>

            <div class="space-y-2">
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-success-700 dark:text-success-300">
                {{ submissionTransition.eyebrow }}
              </p>
              <h2 class="text-[24px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                {{ submissionTransition.title }}
              </h2>
              <p class="max-w-2xl text-[14px] leading-6 text-neutral-700 dark:text-[#B4B4B4]">
                {{ submissionTransition.description }}
              </p>
            </div>
          </div>
        </article>

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

          <template v-if="canRenderSubmissionForm">
            <form
              class="space-y-4 rounded-xl border border-black/8 bg-white/80 px-4 pb-20 pt-4 dark:border-white/[0.08] dark:bg-[#171717]/80 md:pb-4"
              @submit.prevent="handleSubmitAttempt"
            >
              <div class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-[13px] font-medium text-highlighted dark:text-white">
                    About you
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
                    <AppInput
                      v-model="profileForm.firstName"
                      type="text"
                      :disabled="isSubmitting || isSavingProfile"
                      :class="submitAttempted && profileFieldErrors.firstName
                        ? 'border-error/45 focus:border-error dark:border-error/50'
                        : 'focus:border-primary'"
                      placeholder="Ada"
                    />
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
                    <AppInput
                      v-model="profileForm.familyName"
                      type="text"
                      :disabled="isSubmitting || isSavingProfile"
                      :class="submitAttempted && profileFieldErrors.familyName
                        ? 'border-error/45 focus:border-error dark:border-error/50'
                        : 'focus:border-primary'"
                      placeholder="Lovelace"
                    />
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
                    Links and accounts
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
                    <AppInput
                      v-model="profileForm[field.key]"
                      :type="getProfileFieldType(field.key) === 'email' ? 'email' : 'text'"
                      :inputmode="getProfileFieldType(field.key) === 'url' ? 'url' : undefined"
                      :disabled="isSubmitting || isSavingProfile"
                      :class="submitAttempted && profileFieldErrors[field.key]
                        ? 'border-error/45 focus:border-error dark:border-error/50'
                        : 'focus:border-primary'"
                      :placeholder="getProfileFieldPlaceholder(field.key)"
                    />
                    <p
                      v-if="submitAttempted && profileFieldErrors[field.key]"
                      class="text-[11px] text-error"
                    >
                      {{ profileFieldErrors[field.key] }}
                    </p>
                    <p
                      v-if="field.key === 'lumaEmail'"
                      class="text-[11px] text-neutral-500 dark:text-[#8C8C8C]"
                    >
                      Luma registration is mandatory for this hackathon. Enter the email you used on the Luma event.
                    </p>
                  </label>
                </div>

                <div
                  v-if="hackathonCreditProfileFields.length > 0"
                  :class="inlineSectionClass"
                >
                  <div class="space-y-1">
                    <p class="text-[13px] font-medium text-highlighted dark:text-white">
                      OpenAI account details
                    </p>
                    <p class="text-[12px] text-neutral-500 dark:text-[#8C8C8C]">
                      We use these details to connect your application to the right OpenAI account.
                    </p>
                  </div>

                  <div :class="inlineSectionBodyClass">
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
                        <AppInput
                          v-model="profileForm[field.key]"
                          :type="getProfileFieldType(field.key) === 'email' ? 'email' : 'text'"
                          :inputmode="getProfileFieldType(field.key) === 'url' ? 'url' : undefined"
                          :disabled="isSubmitting || isSavingProfile"
                          :class="submitAttempted && profileFieldErrors[field.key]
                            ? 'border-error/45 focus:border-error dark:border-error/50'
                            : 'focus:border-primary'"
                          :placeholder="getProfileFieldPlaceholder(field.key)"
                        />
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
                          Use your OpenAI organization ID. Find it at
                          <a
                            href="https://platform.openai.com/orgid"
                            target="_blank"
                            rel="noreferrer"
                            class="inline-flex items-center gap-1 text-sky-700 underline-offset-2 transition-colors hover:text-sky-800 hover:underline dark:text-sky-300 dark:hover:text-sky-200"
                          >
                            platform.openai.com/orgid
                            <AppIcon
                              name="i-lucide-external-link"
                              class="size-3.5"
                            />
                          </a>
                        </p>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <AppAlert
                v-if="submissionPolicyReason"
                color="neutral"
                variant="soft"
                :description="submissionPolicyReason"
              />

              <section :class="inlineSectionClass">
                <div>
                  <p class="text-[13px] font-medium text-highlighted dark:text-white">
                    Your application
                  </p>
                </div>

                <div :class="inlineSectionBodyClass">
                  <label class="space-y-1">
                    <span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-600 dark:text-[#A3A3A3]">
                      <span>Why this hackathon</span>
                      <span
                        v-if="hackathon.requireWhyThisHackathon"
                        :class="requiredChipClass"
                      >
                        Required
                      </span>
                    </span>
                    <AppTextarea
                      v-model="whyThisHackathon"
                      rows="5"
                      :disabled="isSubmitting || isSavingProfile"
                      :class="submitAttempted && whyThisHackathonError
                        ? 'border-error/45 focus:border-error dark:border-error/50'
                        : 'focus:border-primary'"
                      placeholder="Share what motivates you to apply and what build direction or track you'd like to participate in."
                    />
                    <p
                      v-if="submitAttempted && whyThisHackathonError"
                      class="text-[11px] text-error"
                    >
                      {{ whyThisHackathonError }}
                    </p>
                  </label>

                  <label class="space-y-1">
                    <span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-600 dark:text-[#A3A3A3]">
                      <span>Proof of execution links</span>
                      <span
                        v-if="hackathon.requireProofOfExecution"
                        :class="requiredChipClass"
                      >
                        Required
                      </span>
                    </span>
                    <AppInput
                      v-model="proofOfExecutionUrl"
                      type="url"
                      :disabled="isSubmitting || isSavingProfile"
                      :class="submitAttempted && proofOfExecutionUrlError
                        ? 'border-error/45 focus:border-error dark:border-error/50'
                        : 'focus:border-primary'"
                      placeholder="https://github.com/your-project, https://demo.example.com"
                    />
                    <p class="text-[11px] text-neutral-500 dark:text-[#8C8C8C]">
                      Share link(s) that show something you have already built or shipped. Separate multiple links with commas.
                    </p>
                    <p
                      v-if="submitAttempted && proofOfExecutionUrlError"
                      class="text-[11px] text-error"
                    >
                      {{ proofOfExecutionUrlError }}
                    </p>
                  </label>
                </div>
              </section>

              <div class="space-y-2">
                <p class="text-[14px] font-medium text-highlighted dark:text-white">
                  How are you planning to participate?
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
                  This does not create your team yet. If you are approved, you can still create a team or join one later while team formation is open.
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
                  Add the teammates you expect to work with. This helps us review your application, but it does not create your team yet.
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
                    <AppInput
                      v-model="member.fullName"
                      type="text"
                      :disabled="!canEditRegistrationHint"
                      class="focus:border-primary"
                      placeholder="Name and family name"
                    />
                    <AppInput
                      v-model="member.email"
                      type="email"
                      :disabled="!canEditRegistrationHint"
                      :class="submitAttempted && teamMemberEmailErrors[index]
                        ? 'border-error/45 focus:border-error dark:border-error/50'
                        : 'focus:border-primary'"
                      placeholder="Email"
                    />
                  </div>
                  <p
                    v-if="submitAttempted && teamMemberEmailErrors[index]"
                    class="mt-2 text-[11px] text-error"
                  >
                    {{ teamMemberEmailErrors[index] }}
                  </p>
                </div>
              </div>

              <section
                v-if="hackathon.inPersonEvent"
                :class="inlineSectionClass"
              >
                <p class="text-[13px] font-medium text-highlighted dark:text-white">
                  In-person attendance commitment
                </p>

                <div :class="inlineSectionBodyClass">
                  <AppCheckbox
                    v-model="inPersonAttendanceCommitment"
                    :disabled="isSubmitting"
                  >
                    If approved, I commit to attending in person on {{ inPersonCommitmentDateLabel }} in {{ hackathonLocationLabel }}.
                  </AppCheckbox>
                  <p
                    v-if="submitAttempted && inPersonAttendanceCommitmentError"
                    class="text-[11px] text-error"
                  >
                    {{ inPersonAttendanceCommitmentError }}
                  </p>
                </div>
              </section>

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

              <p class="text-[12px] text-neutral-500 dark:text-[#8C8C8C]">
                <template v-if="hackathon.autoApproveApplications">
                  After you apply, you can create a team or join one while team formation is open.
                </template>
                <template v-else>
                  After you apply, we will review your application. If you are approved, you can create a team or join one while team formation is open.
                </template>
              </p>
            </form>
          </template>

          <template v-else>
            <AppAlert
              color="neutral"
              variant="soft"
              title="Registration closed"
              description="Registration closed while you were on this page. Head back to the hackathon page for the latest status."
            />
          </template>
        </template>
      </template>
    </div>
  </section>
</template>
