<script setup lang="ts">
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
  missingProfileFields: Array<Pick<HackathonProfileField, 'key' | 'label'>>
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

const isTermsDialogOpen = ref(false)

const primaryProfileFields = computed(() =>
  props.profileFields.filter(field => field.key !== 'chatgptEmail' && field.key !== 'openaiOrgId')
)

const hackathonCreditProfileFields = computed(() =>
  props.profileFields.filter(field => field.key === 'chatgptEmail' || field.key === 'openaiOrgId')
)

const currentTermsTitle = computed(() => props.currentApplicationTerms?.title?.trim() || 'Application Terms')

function openTermsDialog() {
  if (!props.currentApplicationTerms) {
    return
  }

  isTermsDialogOpen.value = true
}

function closeTermsDialog() {
  isTermsDialogOpen.value = false
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

function openTermsInNewTab() {
  if (!props.currentApplicationTerms || !import.meta.client) {
    return
  }

  const win = window.open('', '_blank', 'noopener,noreferrer')

  if (!win) {
    return
  }

  const title = escapeHtml(currentTermsTitle.value)
  const content = escapeHtml(props.currentApplicationTerms.content).replaceAll('\n', '<br />')

  win.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>${title}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:860px;margin:40px auto;padding:0 20px;line-height:1.55;color:#0f172a}h1{font-size:24px;margin:0 0 20px}p{margin:0}</style></head><body><h1>${title}</h1><p>${content}</p></body></html>`)
  win.document.close()
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
          <div class="rounded-xl border border-black/8 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-[#171717]">
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
            class="space-y-4 rounded-xl border border-black/8 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-[#171717]"
            @submit.prevent="emit('submitApplication')"
          >
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
                      class="text-[12px] font-semibold text-amber-600 dark:text-amber-400"
                      aria-label="Required field"
                    >*</span>
                  </span>
                  <input
                    v-model="profileForm[field.key]"
                    :type="getProfileFieldType(field.key)"
                    :required="field.required"
                    :disabled="isSubmitting || isSavingProfile"
                    class="w-full rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:text-white"
                    :placeholder="getProfileFieldPlaceholder(field.key)"
                  >
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
                These fields might be needed to credit Codex credits for this hackathon.
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
                      class="text-[12px] font-semibold text-amber-600 dark:text-amber-400"
                      aria-label="Required field"
                    >*</span>
                  </span>
                  <input
                    v-model="profileForm[field.key]"
                    :type="getProfileFieldType(field.key)"
                    :required="field.required"
                    :disabled="isSubmitting || isSavingProfile"
                    class="w-full rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:text-white"
                    :placeholder="getProfileFieldPlaceholder(field.key)"
                  >
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
              v-if="missingProfileFields.length > 0"
              color="warning"
              variant="soft"
              title="Required profile fields missing"
              :description="`Complete: ${missingProfileFields.map(field => field.label).join(', ')}`"
            />

            <AppAlert
              v-if="!submissionPolicy.isAllowed && submissionPolicy.reason && currentApplicationTerms"
              color="neutral"
              variant="soft"
              :description="submissionPolicy.reason"
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
                Teammates (up to {{ maxTeamMembers }})
              </p>
              <p class="text-[13px] text-neutral-500 dark:text-[#8C8C8C]">
                Add name or email.
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
                    class="rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:text-white"
                    placeholder="Email"
                  >
                </div>
              </div>
            </div>

            <AppCheckbox
              v-if="currentApplicationTerms"
              v-model="termsAccepted"
              :disabled="isSubmitting"
            >
              <span>
                I accept
                <button
                  type="button"
                  class="font-medium text-primary underline-offset-2 hover:underline"
                  @click.stop.prevent="openTermsDialog"
                >
                  Application Terms
                </button>.
              </span>
            </AppCheckbox>
            <AppAlert
              v-else
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
              :disabled="!submissionPolicy.isAllowed || isSubmitting || isSavingProfile"
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

    <Teleport to="body">
      <div
        v-if="isTermsDialogOpen && currentApplicationTerms"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
        role="dialog"
        aria-modal="true"
        :aria-label="currentTermsTitle"
        @click.self="closeTermsDialog"
      >
        <div class="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/[0.08] dark:bg-[#111111]">
          <div class="flex items-center justify-between border-b border-black/8 px-4 py-3 dark:border-white/[0.08]">
            <p class="text-sm font-semibold text-highlighted dark:text-white">
              {{ currentTermsTitle }}
            </p>
            <button
              type="button"
              class="rounded-md border border-black/10 px-2 py-1 text-xs text-neutral-600 hover:text-highlighted dark:border-white/[0.12] dark:text-[#A3A3A3] dark:hover:text-white"
              @click="closeTermsDialog"
            >
              Close
            </button>
          </div>

          <div class="max-h-[65vh] overflow-y-auto px-4 py-4">
            <div class="whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-[#D4D4D4]">
              {{ currentApplicationTerms.content }}
            </div>
          </div>

          <div class="flex items-center justify-end border-t border-black/8 px-4 py-3 dark:border-white/[0.08]">
            <button
              type="button"
              class="text-xs font-medium text-primary underline-offset-2 hover:underline"
              @click="openTermsInNewTab"
            >
              Open in new tab
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>
