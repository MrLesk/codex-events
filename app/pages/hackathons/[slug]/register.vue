<script setup lang="ts">
import type {
  PublicApiDataResponse,
  PublicHackathon
} from '~/composables/useHackathonPresentation'
import type { ApiDataResponse, HackathonRecord } from '~/utils/admin-workspace'
import type {
  ParticipantApplicationRecord,
  ParticipantApiDataResponse,
  ParticipantCurrentTermsResponse,
  ParticipantApplicationTermsDocument,
  ParticipantRegistrationTeamMemberHint
} from '~/utils/participant-application'

import HackathonDetailBackground from '~/components/hackathons/HackathonDetailBackground.vue'
import HackathonRegistrationPanel from '~/components/public/hackathons/HackathonRegistrationPanel.vue'
import {
  createParticipantTeamMemberHintRows,
  getParticipantApplicationSubmissionPolicy,
  listHackathonProfileFields,
  normalizeParticipantApiError,
  normalizeParticipantProfileUrl,
  normalizeParticipantTeamMemberHintsForSubmission,
  resolveParticipantRegistrationEntry
} from '~/utils/participant-application'

definePageMeta({
  layout: 'hackathon-detail',
  middleware: ['require-auth']
})

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())
const { actor: accountActor, status: accountActorStatus, refresh: refreshAccountActor } = await useAccountLifecycleActor()

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const {
  data: hackathonResponse,
  error: hackathonError
} = await useFetch<PublicApiDataResponse<PublicHackathon>>(() => `/api/public/hackathons/${slug.value}`, {
  key: () => `public-hackathon-register:${slug.value}`
})

if (hackathonError.value) {
  throw createError({
    statusCode: hackathonError.value.statusCode ?? hackathonError.value.status ?? 500,
    statusMessage: hackathonError.value.statusMessage ?? 'Unable to load the requested hackathon.'
  })
}

if (!hackathonResponse.value?.data) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const hackathon = computed(() => hackathonResponse.value!.data)
const detailBackgroundImageUrl = computed(() => {
  const backgroundImageUrl = hackathon.value.backgroundImageUrl?.trim()

  if (backgroundImageUrl) {
    return backgroundImageUrl
  }

  const bannerImageUrl = hackathon.value.bannerImageUrl?.trim()
  return bannerImageUrl || null
})
const applicationTermsAccepted = ref(false)
const inPersonAttendanceCommitment = ref(false)
const whyThisHackathon = ref('')
const proofOfExecutionUrl = ref('')
const registrationTeamIntent = ref<'solo' | 'team' | 'unknown'>('unknown')
const registrationTeamMembers = ref<ParticipantRegistrationTeamMemberHint[]>([])
const profileFields = computed(() => listHackathonProfileFields(hackathon.value))
const visibleProfileFields = computed(() => profileFields.value.filter(field => field.visible))
const headerStateLabel = computed(() => formatHackathonStateLabel(hackathon.value.state).toUpperCase())
const headerStateClass = computed(() => {
  if (hackathon.value.state === 'submission_open') {
    return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
  }

  if (hackathon.value.state === 'registration_open') {
    return 'border border-sky-600/35 bg-sky-500/16 text-sky-800 dark:border-sky-400/35 dark:bg-sky-500/14 dark:text-sky-300'
  }

  if (hackathon.value.state === 'winners_announced') {
    return 'bg-green-500/10 text-green-400 border border-green-500/20'
  }

  return 'bg-white/[0.05] text-[#A3A3A3] border border-white/[0.08]'
})
const detailSummary = computed(() => [
  formatHackathonWindow(hackathon.value.registrationOpensAt, hackathon.value.submissionClosesAt),
  hackathon.value.city,
  formatMaxTeamMembers(hackathon.value.maxTeamMembers)
].join(' • '))
const inPersonCommitmentDateLabel = computed(() => {
  const earliestAgendaStart = [...hackathon.value.agendaItems]
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))[0]?.startsAt

  return formatHackathonDate(earliestAgendaStart ?? hackathon.value.registrationOpensAt)
})
const profileForm = reactive({
  firstName: '',
  familyName: '',
  xProfileUrl: '',
  linkedinProfileUrl: '',
  githubProfileUrl: '',
  chatgptEmail: '',
  openaiOrgId: '',
  lumaUsername: ''
})
const isSavingProfile = ref(false)
const profileSaveError = ref('')
const hasExistingApplication = ref(false)
const currentApplicationTerms = ref<ParticipantApplicationTermsDocument | null>(null)
const workspaceErrorMessage = ref('')
const submissionError = ref('')
const isSubmitting = ref(false)
const visibleHackathonId = ref<string | null>(null)

watch(() => accountActor.value, (actor) => {
  if (actor?.kind !== 'platform_user') {
    return
  }

  profileForm.firstName = actor.platformUser.firstName
  profileForm.familyName = actor.platformUser.familyName
  profileForm.xProfileUrl = actor.platformUser.xProfileUrl ?? ''
  profileForm.linkedinProfileUrl = actor.platformUser.linkedinProfileUrl ?? ''
  profileForm.githubProfileUrl = actor.platformUser.githubProfileUrl ?? ''
  profileForm.chatgptEmail = actor.platformUser.chatgptEmail ?? ''
  profileForm.openaiOrgId = actor.platformUser.openaiOrgId ?? ''
  profileForm.lumaUsername = actor.platformUser.lumaUsername ?? ''
}, { immediate: true })

watch(() => hackathon.value.maxTeamMembers, (maxTeamMembers) => {
  const nextRows = createParticipantTeamMemberHintRows(maxTeamMembers)
  const previousRows = registrationTeamMembers.value

  registrationTeamMembers.value = nextRows.map((row, index) => ({
    fullName: previousRows[index]?.fullName ?? row.fullName,
    email: previousRows[index]?.email ?? row.email
  }))
}, { immediate: true })

watch(() => currentApplicationTerms.value?.id ?? null, () => {
  applicationTermsAccepted.value = false
})

watch(() => hackathon.value.inPersonEvent, (isInPersonEvent) => {
  if (!isInPersonEvent) {
    inPersonAttendanceCommitment.value = false
  }
}, { immediate: true })

if (accountActor.value?.kind === 'platform_user') {
  const requestFetch = import.meta.server ? useRequestFetch() : $fetch

  try {
    const visibleHackathonResponse = await requestFetch<ApiDataResponse<HackathonRecord>>(`/api/hackathons/slug/${slug.value}`)
    visibleHackathonId.value = visibleHackathonResponse.data.id

    const ownApplicationResponse = await requestFetch<ParticipantApiDataResponse<ParticipantApplicationRecord | null>>(
      `/api/hackathons/${visibleHackathonId.value}/applications/me`
    )
    hasExistingApplication.value = Boolean(ownApplicationResponse.data)

    const routeResolution = resolveParticipantRegistrationEntry({
      actorKind: accountActor.value.kind,
      hackathonSlug: slug.value,
      hackathonState: hackathon.value.state,
      hasExistingApplication: hasExistingApplication.value
    })

    if (routeResolution) {
      await navigateTo(routeResolution.to, routeResolution.external ? { external: true } : undefined)
    } else {
      const currentTermsResponse = await requestFetch<ParticipantApiDataResponse<ParticipantCurrentTermsResponse>>(
        `/api/hackathons/${visibleHackathonId.value}/terms/current`
      )
      currentApplicationTerms.value = currentTermsResponse.data.application_terms
    }
  } catch (error) {
    workspaceErrorMessage.value = normalizeParticipantApiError(error).message
  }
}

const participantSubmissionPolicy = computed(() =>
  getParticipantApplicationSubmissionPolicy({
    hackathonState: hackathon.value.state,
    applicationStatus: hasExistingApplication.value ? 'submitted' : null,
    missingRequiredProfileFieldCount: missingRequiredProfileFields.value.length,
    hasCurrentApplicationTerms: Boolean(currentApplicationTerms.value),
    hasAcceptedCurrentTerms: applicationTermsAccepted.value,
    requiresInPersonAttendanceCommitment: hackathon.value.inPersonEvent,
    hasAcceptedInPersonAttendanceCommitment: inPersonAttendanceCommitment.value
  })
)

const missingRequiredProfileFields = computed(() =>
  visibleProfileFields.value.filter((field) => {
    if (!field.required) {
      return false
    }

    const value = profileForm[field.key]
    return typeof value !== 'string' || value.trim().length === 0
  })
)

async function submitParticipantApplication() {
  if (!participantSubmissionPolicy.value.isAllowed || !currentApplicationTerms.value) {
    return
  }

  if (accountActor.value?.kind !== 'platform_user') {
    return
  }

  if (!visibleHackathonId.value) {
    submissionError.value = 'The current hackathon application route could not be resolved.'
    return
  }

  profileSaveError.value = ''
  submissionError.value = ''
  isSubmitting.value = true
  isSavingProfile.value = true

  try {
    await $fetch('/api/account', {
      method: 'PATCH',
      body: {
        firstName: profileForm.firstName,
        familyName: profileForm.familyName,
        xProfileUrl: normalizeParticipantProfileUrl(profileForm.xProfileUrl),
        linkedinProfileUrl: normalizeParticipantProfileUrl(profileForm.linkedinProfileUrl),
        githubProfileUrl: normalizeParticipantProfileUrl(profileForm.githubProfileUrl),
        chatgptEmail: profileForm.chatgptEmail,
        openaiOrgId: profileForm.openaiOrgId,
        lumaUsername: profileForm.lumaUsername
      }
    })
    await refreshAccountActor()
  } catch (error) {
    profileSaveError.value = normalizeParticipantApiError(error).message
    isSubmitting.value = false
    isSavingProfile.value = false
    return
  }

  try {
    const applicationPayload: Record<string, unknown> = {
      applicationTermsDocumentId: currentApplicationTerms.value.id,
      whyThisHackathon: whyThisHackathon.value,
      proofOfExecutionUrl: proofOfExecutionUrl.value,
      registrationTeamIntent: registrationTeamIntent.value,
      registrationTeamMembers: normalizeParticipantTeamMemberHintsForSubmission(
        registrationTeamMembers.value,
        hackathon.value.maxTeamMembers
      )
    }

    if (hackathon.value.inPersonEvent) {
      applicationPayload.inPersonAttendanceCommitment = inPersonAttendanceCommitment.value
    }

    await $fetch(`/api/hackathons/${visibleHackathonId.value}/applications`, {
      method: 'POST',
      body: applicationPayload
    })

    const ownApplicationResponse = await $fetch<ParticipantApiDataResponse<ParticipantApplicationRecord | null>>(
      `/api/hackathons/${visibleHackathonId.value}/applications/me`
    )
    hasExistingApplication.value = Boolean(ownApplicationResponse.data)
    applicationTermsAccepted.value = false
    inPersonAttendanceCommitment.value = false
    whyThisHackathon.value = ''
    proofOfExecutionUrl.value = ''
    await navigateTo({
      path: `/account/hackathons/${slug.value}`,
      query: {
        notice: 'application_submitted'
      }
    })
  } catch (error) {
    submissionError.value = normalizeParticipantApiError(error).message
  } finally {
    isSubmitting.value = false
    isSavingProfile.value = false
  }
}

useSeoMeta({
  title: () => `Register | ${hackathon.value.name} | Codex Hackathons`,
  description: () => `Submit your registration for ${hackathon.value.name}.`
})
</script>

<template>
  <div class="relative isolate">
    <HackathonDetailBackground
      :image-url="detailBackgroundImageUrl"
      :alt="`${hackathon.name} background`"
    />

    <section class="relative z-10 border-b border-black/8 bg-white/52 backdrop-blur-lg dark:border-white/[0.08] dark:bg-black/56">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <section class="pb-0">
          <NuxtLink
            :to="`/hackathons/${slug}`"
            class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-600 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
          >
            <AppIcon
              name="i-lucide-arrow-left"
              class="size-4"
            />
            Back to hackathon detail
          </NuxtLink>

          <div class="mt-3 border-b border-black/8 pb-0 dark:border-white/[0.08]">
            <div class="space-y-2 pb-4">
              <div class="min-w-0 flex flex-wrap items-center gap-3">
                <h1
                  data-testid="public-hackathon-register-title"
                  class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white"
                >
                  {{ hackathon.name }}
                </h1>
                <span
                  class="rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider"
                  :class="headerStateClass"
                >
                  {{ headerStateLabel }}
                </span>
              </div>

              <p class="text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
                {{ detailSummary }}
              </p>
            </div>

            <nav
              aria-hidden="true"
              class="flex items-center gap-5 overflow-x-auto"
            >
              <span class="invisible border-b-2 pb-3 text-[14px] font-medium">
                Overview
              </span>
              <span class="invisible inline-flex items-center gap-2 border-b-2 pb-3 text-[14px] font-medium">
                Prizes
                <span class="rounded-full px-1.5 py-0.5 text-[11px]">
                  0
                </span>
              </span>
            </nav>
          </div>
        </section>
      </AppContainer>
    </section>

    <AppContainer class="relative z-10 max-w-[68rem] space-y-8 pb-10 pt-6 sm:pb-14">
      <AppAlert
        v-if="accountActorStatus === 'pending'"
        color="neutral"
        variant="soft"
        title="Loading account access"
        description="Checking your account."
      />

      <template v-else-if="accountActor?.kind === 'platform_user'">
        <HackathonRegistrationPanel
          v-model:terms-accepted="applicationTermsAccepted"
          v-model:in-person-attendance-commitment="inPersonAttendanceCommitment"
          v-model:why-this-hackathon="whyThisHackathon"
          v-model:proof-of-execution-url="proofOfExecutionUrl"
          v-model:team-intent="registrationTeamIntent"
          v-model:team-member-hints="registrationTeamMembers"
          v-model:profile-form="profileForm"
          :hackathon="hackathon"
          :in-person-commitment-date-label="inPersonCommitmentDateLabel"
          :current-application-terms="currentApplicationTerms"
          :profile-fields="visibleProfileFields"
          :submission-policy="participantSubmissionPolicy"
          :max-team-members="hackathon.maxTeamMembers"
          :is-submitting="isSubmitting"
          :is-saving-profile="isSavingProfile"
          :profile-error="profileSaveError"
          :submission-error="submissionError"
          :workspace-error-message="workspaceErrorMessage"
          @submit-application="submitParticipantApplication"
        />
      </template>
    </AppContainer>
  </div>
</template>
