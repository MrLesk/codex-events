<script setup lang="ts">
import { formatEventLocation, type PublicEvent } from '~/domains/events/presentation'
import type {
  EventProfileField,
  ParticipantApplicationSubmittedTransition,
  ParticipantApplicationSubmissionPolicy,
  ParticipantApplicationTermsDocument,
  ParticipantRegistrationTrackOption,
  ParticipantRegistrationTeamIntent,
  ParticipantRegistrationTeamMemberHint
} from '~/domains/applications/participant-application'
import type {
  ParticipantRegistrationAdditionalSection,
  ParticipantRegistrationFormState
} from '~/domains/applications/participant-registration-experience'
import type { ParticipantRegistrationProfileFormKey } from '~/domains/applications/participant-application-form'

import ParticipantRegistrationApplicationSection from '~/components/applications/participant-registration/organisms/ParticipantRegistrationApplicationSection.vue'
import ParticipantRegistrationCommitmentsSection from '~/components/applications/participant-registration/organisms/ParticipantRegistrationCommitmentsSection.vue'
import ParticipantRegistrationParticipationSection from '~/components/applications/participant-registration/organisms/ParticipantRegistrationParticipationSection.vue'
import ParticipantRegistrationProfileSection from '~/components/applications/participant-registration/organisms/ParticipantRegistrationProfileSection.vue'
import ParticipantRegistrationProgressRail from '~/components/applications/participant-registration/organisms/ParticipantRegistrationProgressRail.vue'
import { useParticipantRegistrationForm } from '~/composables/useParticipantRegistrationForm'

const form = defineModel<ParticipantRegistrationFormState>({ required: true })

const props = withDefaults(defineProps<{
  event: Pick<PublicEvent,
  | 'eventType'
  | 'slug'
  | 'state'
  | 'city'
  | 'country'
  | 'autoApproveApplications'
  | 'inPersonEvent'
  | 'applicationWhyThisEventVisible'
  | 'applicationProofOfExecutionVisible'
  | 'applicationTeamIntentVisible'
  | 'applicationAiKnowledgeVisible'
  | 'requireWhyThisEvent'
  | 'requireProofOfExecution'
  | 'requireTeamIntent'
  | 'requireAiKnowledge'
  >
  trackOptions?: ParticipantRegistrationTrackOption[]
  currentApplicationTerms: ParticipantApplicationTermsDocument | null
  profileFields: EventProfileField[]
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
  sectionLabel?: string
  submitLabel?: string
  submissionErrorTitle?: string
  additionalSections?: ParticipantRegistrationAdditionalSection[]
  combineRegistrationSections?: boolean
  hidePostSubmissionText?: boolean
}>(), {
  trackOptions: () => [],
  sectionLabel: undefined,
  submitLabel: 'Submit application',
  submissionErrorTitle: 'Application submission failed',
  additionalSections: () => [],
  combineRegistrationSections: false,
  hidePostSubmissionText: false
})

const emit = defineEmits<{
  submitAttempt: []
  submitApplication: []
}>()

const formRoot = useTemplateRef<HTMLElement>('formRoot')
const submissionErrorRoot = useTemplateRef<HTMLElement>('submissionErrorRoot')
const controller = useParticipantRegistrationForm({
  form,
  configuration: () => ({
    event: props.event,
    profileFields: props.profileFields,
    trackOptions: props.trackOptions,
    maxTeamMembers: props.maxTeamMembers,
    hasCurrentApplicationTerms: Boolean(props.currentApplicationTerms),
    combineRegistrationSections: props.combineRegistrationSections
  }),
  additionalSections: () => props.additionalSections
})
const isBusy = computed(() => Boolean(props.isSubmitting || props.isSavingProfile))
const canRenderSubmissionForm = computed(() => props.event.state === 'registration_open')
const eventLocationLabel = computed(() => formatEventLocation(props.event))
const submissionPolicyReason = computed(() => {
  if (props.submissionPolicy.isAllowed || !props.submissionPolicy.reason) {
    return ''
  }

  const validationReasons = new Set([
    'Complete the required profile fields before submitting this application.',
    'Accept the current application terms before submitting.',
    'Confirm in-person attendance commitment before submitting this application.'
  ])

  return validationReasons.has(props.submissionPolicy.reason) ? '' : props.submissionPolicy.reason
})
const postSubmissionText = computed(() => {
  if (props.event.eventType === 'hackathon') {
    return props.event.autoApproveApplications
      ? 'After you apply, you can create a team or join one while team formation is open.'
      : 'After you apply, we will review your application. If approved, you can create a team or join one while team formation is open.'
  }

  return props.event.autoApproveApplications
    ? 'After you apply, your event workspace will show the details available to approved participants.'
    : 'After you apply, we will review your application and update your event workspace after a decision.'
})

function updateProfileField(key: ParticipantRegistrationProfileFormKey, value: string) {
  form.value.profileForm[key] = value
}

function updateTeamMember(index: number, key: keyof ParticipantRegistrationTeamMemberHint, value: string) {
  const member = form.value.teamMemberHints[index]
  if (member) {
    member[key] = value
  }
}

async function handleSubmitAttempt() {
  emit('submitAttempt')
  await nextTick()

  if (!formRoot.value || isBusy.value) {
    return
  }

  const valid = await controller.validateSubmitAttempt(formRoot.value)
  if (!valid || !props.submissionPolicy.isAllowed) {
    return
  }

  emit('submitApplication')
}

watch(() => props.profileError || props.submissionError, async (error) => {
  if (!error) {
    return
  }

  await nextTick()
  submissionErrorRoot.value?.scrollIntoView({ block: 'center' })
  submissionErrorRoot.value?.focus({ preventScroll: true })
})
</script>

<template>
  <section class="space-y-4">
    <AppAlert
      v-if="props.isLoading"
      color="neutral"
      variant="soft"
      title="Loading registration"
      description="Checking your application status and terms."
    />

    <AppAlert
      v-else-if="props.workspaceErrorMessage"
      color="error"
      variant="soft"
      title="Registration unavailable"
      :description="props.workspaceErrorMessage"
    />

    <article
      v-else-if="props.submissionTransition"
      class="rounded-xl border border-success/30 bg-success/10 px-6 py-6"
    >
      <div class="flex items-start gap-4">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <AppIcon
            name="i-lucide-loader-circle"
            class="size-5 animate-spin motion-reduce:animate-none"
          />
        </span>
        <div class="space-y-1.5">
          <h2 class="text-[20px] font-semibold text-highlighted">
            {{ props.submissionTransition.title }}
          </h2>
          <p class="text-[13px] leading-5 text-toned">
            {{ props.submissionTransition.description }}
          </p>
        </div>
      </div>
    </article>

    <template v-else-if="canRenderSubmissionForm">
      <div
        v-if="props.profileError || props.submissionError"
        ref="submissionErrorRoot"
        tabindex="-1"
        class="outline-none"
      >
        <AppAlert
          color="error"
          variant="soft"
          :title="props.profileError ? 'We could not update your details' : props.submissionErrorTitle"
          :description="props.profileError || props.submissionError"
        />
      </div>

      <form
        ref="formRoot"
        class="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8"
        data-testid="participant-registration-form"
        novalidate
        @submit.prevent="handleSubmitAttempt"
      >
        <div class="min-w-0 space-y-5 pb-24 lg:pb-4">
          <div
            class="space-y-3 rounded-xl border border-black/8 bg-white/88 p-4 lg:hidden dark:border-white/[0.08] dark:bg-[#171717]/88"
            data-testid="registration-mobile-progress"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-[13px] font-semibold text-highlighted">
                Registration progress
              </p>
              <p class="text-[12px] tabular-nums text-toned">
                {{ controller.progressPercent.value }}%
              </p>
            </div>
            <AppMeter
              :value="controller.progressPercent.value"
              size="sm"
              :tone="controller.progressPercent.value === 100 ? 'success' : 'info'"
              label="Required items"
            />
            <p class="text-[11px] text-muted">
              {{ controller.readinessText.value }}
            </p>
          </div>

          <ParticipantRegistrationProfileSection
            :profile-form="form.profileForm"
            :profile-fields="props.profileFields"
            :errors="controller.displayedErrors.value"
            :disabled="isBusy"
            :section-label="props.sectionLabel"
            @update-field="updateProfileField"
          />

          <AppAlert
            v-if="submissionPolicyReason"
            color="neutral"
            variant="soft"
            :description="submissionPolicyReason"
          />

          <ParticipantRegistrationApplicationSection
            :event="props.event"
            :track-options="props.trackOptions"
            :selected-track-id="form.selectedTrackId"
            :ai-knowledge-level="form.aiKnowledgeLevel"
            :why-this-event="form.whyThisEvent"
            :proof-of-execution-url="form.proofOfExecutionUrl"
            :errors="controller.displayedErrors.value"
            :disabled="isBusy"
            @update-selected-track-id="form.selectedTrackId = $event"
            @update-ai-knowledge-level="form.aiKnowledgeLevel = $event"
            @update-why-this-event="form.whyThisEvent = $event"
            @update-proof-of-execution-url="form.proofOfExecutionUrl = $event"
          />

          <ParticipantRegistrationParticipationSection
            :visible="props.event.applicationTeamIntentVisible"
            :required="props.event.requireTeamIntent"
            :event-type="props.event.eventType"
            :team-intent="form.teamIntent"
            :team-member-hints="form.teamMemberHints"
            :max-team-members="props.maxTeamMembers"
            :errors="controller.displayedErrors.value"
            :disabled="isBusy"
            @update-team-intent="form.teamIntent = $event as ParticipantRegistrationTeamIntent"
            @update-team-member="updateTeamMember"
          />

          <ParticipantRegistrationCommitmentsSection
            :event-slug="props.event.slug"
            :event-location-label="eventLocationLabel"
            :in-person-event="props.event.inPersonEvent"
            :in-person-commitment-date-label="props.inPersonCommitmentDateLabel"
            :in-person-attendance-commitment="form.inPersonAttendanceCommitment"
            :terms-accepted="form.termsAccepted"
            :current-application-terms="props.currentApplicationTerms"
            :errors="controller.displayedErrors.value"
            :disabled="isBusy"
            @update-in-person-attendance-commitment="form.inPersonAttendanceCommitment = $event"
            @update-terms-accepted="form.termsAccepted = $event"
          />

          <slot name="additional-section" />

          <section
            id="registration-section-confirmation"
            tabindex="-1"
            class="scroll-mt-24 space-y-3 outline-none"
          >
            <h2 class="text-[14px] font-semibold text-highlighted">
              Review and submit
            </h2>
            <p class="text-[12px] text-muted">
              {{ controller.readinessText.value }}
            </p>
            <AppButton
              v-if="!props.combineRegistrationSections"
              type="submit"
              color="neutral"
              variant="solid"
              :loading="isBusy"
              :disabled="isBusy"
              class="hidden bg-black text-white hover:bg-black/90 lg:inline-flex dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
            >
              {{ props.submitLabel }}
            </AppButton>
          </section>

          <p
            v-if="!props.hidePostSubmissionText"
            class="text-[11px] leading-4 text-muted"
          >
            {{ postSubmissionText }}
          </p>
        </div>

        <div class="hidden lg:block">
          <ParticipantRegistrationProgressRail
            :sections="controller.experience.value.sections"
            :completed-required-count="controller.experience.value.completedRequiredCount"
            :required-count="controller.experience.value.requiredCount"
            :progress-percent="controller.progressPercent.value"
            :submit-label="props.submitLabel"
            :show-submit="props.combineRegistrationSections"
            :submitting="isBusy"
            @navigate="formRoot && controller.navigateToSection(formRoot, $event)"
          />
        </div>

        <div class="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/92 px-4 py-3 backdrop-blur lg:hidden dark:border-white/10 dark:bg-[#111111]/92">
          <div class="mx-auto flex max-w-[68rem] items-center justify-between gap-3">
            <p class="min-w-0 truncate text-[12px] font-medium text-toned">
              {{ controller.readinessText.value }}
            </p>
            <AppButton
              type="submit"
              color="neutral"
              variant="solid"
              :loading="isBusy"
              :disabled="isBusy"
              class="shrink-0 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
            >
              {{ props.submitLabel }}
            </AppButton>
          </div>
        </div>
      </form>
    </template>

    <AppAlert
      v-else
      color="neutral"
      variant="soft"
      title="Registration closed"
      description="Registration closed while you were on this page. Head back to the event page for the latest status."
    />
  </section>
</template>
