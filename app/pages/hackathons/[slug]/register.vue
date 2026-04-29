<script setup lang="ts">
import {
  formatHackathonDate,
  formatHackathonLocation,
  formatHackathonWindow,
  formatMaxTeamMembers,
  getHackathonEarliestStartAt,
  type PublicHackathon
} from '~/domains/hackathons/presentation'
import type {
  ParticipantApplicationRecord,
  ParticipantApiDataResponse,
  ParticipantCurrentTermsResponse,
  ParticipantApplicationTermsDocument,
  ParticipantApplicationSubmittedTransition,
  ParticipantRegistrationTeamMemberHint,
  VisibleHackathonRecord
} from '~/domains/applications/participant-application'

import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'
import ParticipantApplicationRegistrationPanel from '~/components/applications/ParticipantApplicationRegistrationPanel.vue'
import {
  createParticipantTeamMemberHintRows,
  getParticipantApplicationSubmissionPolicy,
  listHackathonProfileFields,
  normalizeParticipantApiError,
  normalizeParticipantProfileUrl,
  normalizeParticipantTeamMemberHintsForSubmission,
  resolveParticipantApplicationSubmittedTransition,
  resolveParticipantRegistrationEntry
} from '~/domains/applications/participant-application'

definePageMeta({
  layout: 'hackathon-detail',
  middleware: ['require-auth']
})

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())
const { actor: accountActor, status: accountActorStatus } = await useAccountLifecycleActor()

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const {
  data: hackathonData,
  error: hackathonError
} = await useApiResponse<PublicHackathon>(() => `public-hackathon-register:${slug.value}`, () => `/api/public/hackathons/${slug.value}`, {
  watch: [slug]
})

if (hackathonError.value) {
  throw createError({
    statusCode: hackathonError.value.statusCode ?? hackathonError.value.status ?? 500,
    statusMessage: hackathonError.value.statusMessage ?? 'Unable to load the requested hackathon.'
  })
}

if (!hackathonData.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const hackathon = computed(() => hackathonData.value!)
const detailBackgroundImageUrl = computed(() => {
  const backgroundImageUrl = hackathon.value.backgroundImageUrl?.trim()

  if (backgroundImageUrl) {
    return backgroundImageUrl
  }

  const bannerImageUrl = hackathon.value.bannerImageUrl?.trim()
  return bannerImageUrl || null
})
const detailBackgroundImageStyle = computed(() => detailBackgroundImageUrl.value
  ? { backgroundImage: `url(${JSON.stringify(detailBackgroundImageUrl.value)})` }
  : undefined)
const applicationTermsAccepted = ref(false)
const inPersonAttendanceCommitment = ref(false)
const whyThisHackathon = ref('')
const proofOfExecutionUrl = ref('')
const registrationTeamIntent = ref<'solo' | 'team' | 'unknown'>('unknown')
const registrationTeamMembers = ref<ParticipantRegistrationTeamMemberHint[]>([])
const profileFields = computed(() => listHackathonProfileFields(hackathon.value))
const visibleProfileFields = computed(() => profileFields.value.filter(field => field.visible))
const detailSummary = computed(() => [
  formatHackathonWindow(hackathon.value.registrationOpensAt, hackathon.value.submissionClosesAt),
  formatHackathonLocation(hackathon.value),
  formatMaxTeamMembers(hackathon.value.maxTeamMembers)
].join(' • '))
const inPersonCommitmentDateLabel = computed(() =>
  formatHackathonDate(getHackathonEarliestStartAt(hackathon.value))
)
const profileForm = reactive({
  firstName: '',
  familyName: '',
  xProfileUrl: '',
  linkedinProfileUrl: '',
  githubProfileUrl: '',
  chatgptEmail: '',
  openaiOrgId: '',
  lumaEmail: ''
})
const isSavingProfile = ref(false)
const profileSaveError = ref('')
const hasExistingApplication = ref(false)
const currentApplicationTerms = ref<ParticipantApplicationTermsDocument | null>(null)
const workspaceErrorMessage = ref('')
const submissionError = ref('')
const isSubmitting = ref(false)
const submissionTransition = ref<ParticipantApplicationSubmittedTransition | null>(null)
const visibleHackathonId = ref<string | null>(null)

watch(() => accountActor.value, (actor) => {
  if (actor?.kind !== 'platform_user') {
    return
  }

  profileForm.firstName = actor.platformUser.firstName
  profileForm.familyName = actor.platformUser.familyName
  profileForm.xProfileUrl = actor.platformUser.xProfileUrl ?? ''
  profileForm.linkedinProfileUrl = actor.platformUser.linkedinProfileUrl ?? ''
  profileForm.githubProfileUrl = actor.platformUser.githubProfileUrl
    ?? actor.sessionUser.githubProfileUrl
    ?? ''
  profileForm.chatgptEmail = actor.platformUser.chatgptEmail ?? ''
  profileForm.openaiOrgId = actor.platformUser.openaiOrgId ?? ''
  profileForm.lumaEmail = actor.platformUser.lumaEmail ?? ''
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

const accountActorCacheKey = computed(() => {
  if (accountActor.value.kind !== 'platform_user') {
    return accountActor.value.kind
  }

  return `${accountActor.value.platformUser.id}:${accountActor.value.hasAcceptedCurrentPlatformDocuments ? 'accepted' : 'unaccepted'}`
})
const registrationRouteState = await useApiData<{
  visibleHackathonId: string | null
  hasExistingApplication: boolean
  currentApplicationTerms: ParticipantApplicationTermsDocument | null
  workspaceErrorMessage: string
  redirectTo: {
    to: string
    external?: boolean
  } | null
}>(
  () => `public-hackathon-register-state:${slug.value}:${accountActorCacheKey.value}`,
  async ({ apiFetch, signal }) => {
    if (accountActor.value.kind !== 'platform_user' || !accountActor.value.hasAcceptedCurrentPlatformDocuments) {
      return {
        visibleHackathonId: null,
        hasExistingApplication: false,
        currentApplicationTerms: null,
        workspaceErrorMessage: '',
        redirectTo: null
      }
    }

    try {
      const visibleHackathonResponse = await apiFetch<ParticipantApiDataResponse<VisibleHackathonRecord>>(
        `/api/hackathons/slug/${slug.value}`,
        {
          signal
        }
      )
      const resolvedVisibleHackathonId = visibleHackathonResponse.data.id
      const ownApplicationResponse = await apiFetch<ParticipantApiDataResponse<ParticipantApplicationRecord | null>>(
        `/api/hackathons/${resolvedVisibleHackathonId}/applications/me`,
        {
          signal
        }
      )
      const resolvedHasExistingApplication = Boolean(ownApplicationResponse.data)
      const routeResolution = resolveParticipantRegistrationEntry({
        actorKind: accountActor.value.kind,
        hasAcceptedCurrentPlatformDocuments: accountActor.value.hasAcceptedCurrentPlatformDocuments,
        hackathonSlug: slug.value,
        hackathonState: hackathon.value.state,
        registrationOpensAt: hackathon.value.registrationOpensAt,
        registrationClosesAt: hackathon.value.registrationClosesAt,
        hasExistingApplication: resolvedHasExistingApplication
      })

      if (routeResolution) {
        return {
          visibleHackathonId: resolvedVisibleHackathonId,
          hasExistingApplication: resolvedHasExistingApplication,
          currentApplicationTerms: null,
          workspaceErrorMessage: '',
          redirectTo: {
            to: routeResolution.to,
            external: routeResolution.external
          }
        }
      }

      const currentTermsResponse = await apiFetch<ParticipantApiDataResponse<ParticipantCurrentTermsResponse>>(
        `/api/hackathons/${resolvedVisibleHackathonId}/terms/current`,
        {
          signal
        }
      )

      return {
        visibleHackathonId: resolvedVisibleHackathonId,
        hasExistingApplication: resolvedHasExistingApplication,
        currentApplicationTerms: currentTermsResponse.data.application_terms,
        workspaceErrorMessage: '',
        redirectTo: null
      }
    } catch (error) {
      return {
        visibleHackathonId: null,
        hasExistingApplication: false,
        currentApplicationTerms: null,
        workspaceErrorMessage: normalizeParticipantApiError(error).message,
        redirectTo: null
      }
    }
  },
  {
    default: () => ({
      visibleHackathonId: null,
      hasExistingApplication: false,
      currentApplicationTerms: null,
      workspaceErrorMessage: '',
      redirectTo: null
    }),
    watch: [
      slug,
      accountActorCacheKey,
      computed(() => hackathon.value.state),
      computed(() => hackathon.value.registrationOpensAt),
      computed(() => hackathon.value.registrationClosesAt)
    ]
  }
)

async function navigateToRegistrationRedirect(redirectTo: {
  to: string
  external?: boolean
} | null) {
  if (!redirectTo) {
    return
  }

  await navigateTo(
    redirectTo.to,
    redirectTo.external ? { external: true } : undefined
  )
}

await navigateToRegistrationRedirect(registrationRouteState.data.value.redirectTo)

watch(() => registrationRouteState.data.value, (state) => {
  visibleHackathonId.value = state.visibleHackathonId
  hasExistingApplication.value = state.hasExistingApplication
  currentApplicationTerms.value = state.currentApplicationTerms
  workspaceErrorMessage.value = state.workspaceErrorMessage
}, { immediate: true })

watch(() => registrationRouteState.data.value.redirectTo, async (redirectTo) => {
  await navigateToRegistrationRedirect(redirectTo)
})

const participantSubmissionPolicy = computed(() =>
  getParticipantApplicationSubmissionPolicy({
    hackathonState: hackathon.value.state,
    registrationOpensAt: hackathon.value.registrationOpensAt,
    registrationClosesAt: hackathon.value.registrationClosesAt,
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
  submissionTransition.value = null
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
        lumaEmail: profileForm.lumaEmail
      }
    })
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

    const nextSubmissionTransition = resolveParticipantApplicationSubmittedTransition(slug.value)

    hasExistingApplication.value = true
    submissionTransition.value = nextSubmissionTransition

    await nextTick()
    await navigateTo(nextSubmissionTransition.to, { replace: true })
  } catch (error) {
    if (submissionTransition.value) {
      submissionTransition.value = null
      submissionError.value = 'Your application was submitted. Open the hackathon workspace from your account to keep going.'
    } else {
      submissionError.value = normalizeParticipantApiError(error).message
    }
  } finally {
    isSubmitting.value = false
    isSavingProfile.value = false
  }
}

useSeoMeta({
  title: () => `Apply to ${hackathon.value.name} | Codex Hackathons`,
  description: () => `Complete your application for ${hackathon.value.name}.`
})
</script>

<template>
  <div class="relative isolate">
    <div
      v-if="detailBackgroundImageUrl"
      class="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        class="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat opacity-55 blur-md saturate-125 contrast-105"
        :style="detailBackgroundImageStyle"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/68 dark:from-black/35 dark:via-black/55 dark:to-black/76" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.22),transparent_46%)] dark:bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.10),transparent_48%)]" />
    </div>

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
                <HackathonStateBadge
                  :state="hackathon.state"
                  :registration-opens-at="hackathon.registrationOpensAt"
                  :registration-closes-at="hackathon.registrationClosesAt"
                />
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
        <ParticipantApplicationRegistrationPanel
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
          :submission-transition="submissionTransition"
          :workspace-error-message="workspaceErrorMessage"
          @submit-application="submitParticipantApplication"
        />
      </template>
    </AppContainer>
  </div>
</template>
