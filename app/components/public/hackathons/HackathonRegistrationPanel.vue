<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'
import type {
  ParticipantApplicationRecord,
  ParticipantApplicationSubmissionPolicy,
  ParticipantApplicationTermsDocument,
  ParticipantRegistrationTeamIntent,
  ParticipantRegistrationTeamMemberHint,
  RequiredProfileField
} from '~/utils/participant-application'

import {
  formatParticipantApplicationStatus,
  getParticipantApplicationStatusColor,
  summarizeParticipantApplicationStatus
} from '~/utils/participant-application'

const termsAccepted = defineModel<boolean>('termsAccepted', {
  required: true
})
const teamIntent = defineModel<ParticipantRegistrationTeamIntent>('teamIntent', {
  required: true
})
const teamMemberHints = defineModel<ParticipantRegistrationTeamMemberHint[]>('teamMemberHints', {
  required: true
})

const props = defineProps<{
  hackathon: Pick<PublicHackathon, 'slug' | 'state'>
  application: ParticipantApplicationRecord | null
  currentApplicationTerms: ParticipantApplicationTermsDocument | null
  missingProfileFields: RequiredProfileField[]
  submissionPolicy: ParticipantApplicationSubmissionPolicy
  teamsHref: string
  accountSettingsHref: string
  maxTeamMembers: number
  isSubmitting?: boolean
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

const currentTermsLabel = computed(() => {
  if (!props.currentApplicationTerms) {
    return ''
  }

  return `${props.currentApplicationTerms.title} (version ${props.currentApplicationTerms.version})`
})

const canRenderSubmissionForm = computed(() =>
  props.hackathon.state === 'registration_open' && !props.application
)

const canEditRegistrationHint = computed(() => !props.isSubmitting)
</script>

<template>
  <AppCard class="rounded-xl border border-black/8 bg-[#F7F7F8] dark:border-white/[0.08] dark:bg-[#111111]">
    <template #header>
      <div class="space-y-2">
        <h2 class="text-[18px] font-semibold text-highlighted dark:text-white">
          Hackathon registration
        </h2>
        <p class="text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
          Submit your application to unlock team formation once approved.
        </p>
      </div>
    </template>

    <div class="space-y-4">
      <AppAlert
        v-if="isLoading"
        color="neutral"
        variant="soft"
        title="Loading registration state"
        description="Resolving your application status and current terms for this hackathon."
      />

      <AppAlert
        v-else-if="workspaceErrorMessage"
        color="error"
        variant="soft"
        title="Registration state unavailable"
        :description="workspaceErrorMessage"
      />

      <template v-else>
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
          <div class="rounded-xl border border-black/8 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-[#171717]">
            <div class="flex flex-wrap items-center gap-3">
              <p class="text-[14px] font-medium text-highlighted dark:text-white">
                Your application status
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
              Open team formation
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
          <AppAlert
            v-if="missingProfileFields.length > 0"
            color="warning"
            variant="soft"
            title="Complete required profile fields first"
            description="This hackathon requires additional profile data before you can submit an application."
          />

          <div
            v-if="missingProfileFields.length > 0"
            class="rounded-xl border border-black/8 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-[#171717]"
          >
            <p class="text-[13px] font-medium text-highlighted dark:text-white">
              Missing fields
            </p>
            <ul class="mt-2 list-disc space-y-1 pl-5 text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
              <li
                v-for="field in missingProfileFields"
                :key="field.key"
              >
                {{ field.label }}
              </li>
            </ul>

            <AppButton
              :to="accountSettingsHref"
              color="warning"
              variant="soft"
              class="mt-4"
            >
              Complete profile in account settings
            </AppButton>
          </div>

          <AppAlert
            v-else-if="!currentApplicationTerms"
            color="warning"
            variant="soft"
            title="Application terms unavailable"
            description="The current application terms are not available right now. Please try again later."
          />

          <form
            v-else
            class="space-y-4 rounded-xl border border-black/8 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-[#171717]"
            @submit.prevent="emit('submitApplication')"
          >
            <div class="space-y-2">
              <p class="text-[14px] font-medium text-highlighted dark:text-white">
                Team-size intent
              </p>
              <div class="grid gap-2 sm:grid-cols-3">
                <label class="flex items-center gap-2 rounded-lg border border-black/8 px-3 py-2 text-[13px] text-neutral-600 dark:border-white/[0.08] dark:text-[#A3A3A3]">
                  <input
                    v-model="teamIntent"
                    type="radio"
                    value="solo"
                    :disabled="!canEditRegistrationHint"
                  >
                  Applying solo
                </label>
                <label class="flex items-center gap-2 rounded-lg border border-black/8 px-3 py-2 text-[13px] text-neutral-600 dark:border-white/[0.08] dark:text-[#A3A3A3]">
                  <input
                    v-model="teamIntent"
                    type="radio"
                    value="team"
                    :disabled="!canEditRegistrationHint"
                  >
                  Applying as team
                </label>
                <label class="flex items-center gap-2 rounded-lg border border-black/8 px-3 py-2 text-[13px] text-neutral-600 dark:border-white/[0.08] dark:text-[#A3A3A3]">
                  <input
                    v-model="teamIntent"
                    type="radio"
                    value="unknown"
                    :disabled="!canEditRegistrationHint"
                  >
                  Not sure yet
                </label>
              </div>
            </div>

            <div
              v-if="teamIntent === 'team'"
              class="space-y-3"
            >
              <p class="text-[14px] font-medium text-highlighted dark:text-white">
                Team member hints (up to {{ maxTeamMembers }})
              </p>
              <p class="text-[13px] text-neutral-500 dark:text-[#8C8C8C]">
                Enter name and family name and/or email for expected team members.
              </p>
              <div
                v-for="(member, index) in teamMemberHints"
                :key="index"
                class="rounded-lg border border-black/8 px-3 py-3 dark:border-white/[0.08]"
              >
                <p class="mb-2 text-[12px] font-medium text-neutral-600 dark:text-[#A3A3A3]">
                  Member {{ index + 1 }}
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
                    class="rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:text-white"
                    placeholder="Email (optional)"
                  >
                </div>
              </div>
            </div>

            <p class="text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
              You must accept the exact current application terms before submitting.
            </p>

            <AppCheckbox
              v-model="termsAccepted"
              :disabled="isSubmitting"
            >
              I accept {{ currentTermsLabel }}.
            </AppCheckbox>

            <p
              v-if="!submissionPolicy.isAllowed && submissionPolicy.reason"
              class="text-[13px] text-neutral-500 dark:text-[#8C8C8C]"
            >
              {{ submissionPolicy.reason }}
            </p>

            <AppButton
              type="submit"
              color="neutral"
              variant="solid"
              :loading="isSubmitting"
              :disabled="!submissionPolicy.isAllowed || isSubmitting"
              class="h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
            >
              Submit application
            </AppButton>
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
  </AppCard>
</template>
