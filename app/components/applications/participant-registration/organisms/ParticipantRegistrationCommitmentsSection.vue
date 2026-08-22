<script setup lang="ts">
import type { ParticipantApplicationTermsDocument } from '~/domains/applications/participant-application'
import ParticipantRegistrationField from '~/components/applications/participant-registration/molecules/ParticipantRegistrationField.vue'

const props = defineProps<{
  eventSlug: string
  eventLocationLabel: string
  inPersonEvent: boolean
  inPersonCommitmentDateLabel: string
  inPersonAttendanceCommitment: boolean
  termsAccepted: boolean
  currentApplicationTerms: ParticipantApplicationTermsDocument | null
  errors: Record<string, string>
  disabled?: boolean
}>()

const emit = defineEmits<{
  updateInPersonAttendanceCommitment: [value: boolean]
  updateTermsAccepted: [value: boolean]
}>()

const applicationTermsPageHref = computed(() => `/events/${props.eventSlug}/application-terms`)
</script>

<template>
  <div class="space-y-5">
    <section
      v-if="props.inPersonEvent"
      id="registration-section-attendance"
      tabindex="-1"
      class="scroll-mt-24 space-y-3 border-b border-black/8 pb-5 outline-none dark:border-white/[0.08]"
    >
      <h2 class="text-[14px] font-semibold text-highlighted">
        In-person attendance commitment
      </h2>
      <ParticipantRegistrationField
        field-id="inPersonAttendanceCommitment"
        label="Attendance confirmation"
        required
        :error="props.errors.inPersonAttendanceCommitment"
      >
        <AppCheckbox
          :model-value="props.inPersonAttendanceCommitment"
          :disabled="props.disabled"
          @update:model-value="emit('updateInPersonAttendanceCommitment', $event)"
        >
          If approved, I commit to attending in person on {{ props.inPersonCommitmentDateLabel }} in {{ props.eventLocationLabel }}.
        </AppCheckbox>
      </ParticipantRegistrationField>
    </section>

    <section
      v-if="props.currentApplicationTerms"
      id="registration-section-terms"
      tabindex="-1"
      class="scroll-mt-24 space-y-3 border-b border-black/8 pb-5 outline-none dark:border-white/[0.08]"
    >
      <h2 class="text-[14px] font-semibold text-highlighted">
        Application terms
      </h2>
      <ParticipantRegistrationField
        field-id="termsAccepted"
        label="Application Terms"
        required
        :error="props.errors.termsAccepted"
      >
        <AppCheckbox
          :model-value="props.termsAccepted"
          :disabled="props.disabled"
          @update:model-value="emit('updateTermsAccepted', $event)"
        >
          <span>
            I accept the
            <NuxtLink
              :to="applicationTermsPageHref"
              target="_blank"
              rel="noopener noreferrer"
              class="ml-1 inline-flex items-center gap-1 font-semibold text-sky-700 underline decoration-2 underline-offset-2 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
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
      </ParticipantRegistrationField>
    </section>
  </div>
</template>
