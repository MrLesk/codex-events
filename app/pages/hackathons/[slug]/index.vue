<script setup lang="ts">
import type {
  PublicApiDataResponse,
  PublicApiListResponse,
  PublicEvaluationCriterion,
  PublicHackathon,
  PublicPrize
} from '~/composables/useHackathonPresentation'

import HackathonCriteriaList from '~/components/public/hackathons/HackathonCriteriaList.vue'
import HackathonPrizeList from '~/components/public/hackathons/HackathonPrizeList.vue'
import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'
import HackathonTermsReferences from '~/components/public/hackathons/HackathonTermsReferences.vue'
import HackathonTimeline from '~/components/public/hackathons/HackathonTimeline.vue'
import {
  formatParticipantApplicationStatus,
  getHackathonApplicationAvailabilityMessage,
  getParticipantApplicationStatusColor,
  summarizeParticipantApplicationStatus
} from '~/utils/participant-application'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const [
  { data: hackathonResponse, error: hackathonError },
  { data: criteriaResponse, error: criteriaError },
  { data: prizesResponse, error: prizesError }
] = await Promise.all([
  useFetch<PublicApiDataResponse<PublicHackathon>>(() => `/api/public/hackathons/${slug.value}`, {
    key: () => `public-hackathon-detail:${slug.value}`
  }),
  useFetch<PublicApiListResponse<PublicEvaluationCriterion>>(() => `/api/public/hackathons/${slug.value}/evaluation-criteria`, {
    key: () => `public-hackathon-criteria:${slug.value}`
  }),
  useFetch<PublicApiListResponse<PublicPrize>>(() => `/api/public/hackathons/${slug.value}/prizes`, {
    key: () => `public-hackathon-prizes:${slug.value}`
  })
])

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
const criteria = computed(() => criteriaResponse.value?.data ?? [])
const prizes = computed(() => prizesResponse.value?.data ?? [])
const requiredProfiles = computed(() => listRequiredProfiles(hackathon.value))
const heroImage = computed(() => hackathon.value.bannerImageUrl ?? hackathon.value.backgroundImageUrl)
const criteriaErrorMessage = computed(() => criteriaError.value ? 'Public scoring dimensions could not be loaded right now.' : undefined)
const prizesErrorMessage = computed(() => prizesError.value ? 'Published awards could not be loaded right now.' : undefined)
const user = useUser()
const loginHref = computed(() => `/auth/login?returnTo=${encodeURIComponent(route.fullPath || `/hackathons/${slug.value}`)}`)
const acceptCurrentApplicationTerms = ref(false)
const participantApplication = useParticipantApplication(hackathon, slug)

watch(() => participantApplication.currentApplicationTerms.value?.id ?? null, () => {
  acceptCurrentApplicationTerms.value = false
})

watch(() => participantApplication.ownApplication.value?.id ?? null, (applicationId) => {
  if (applicationId) {
    acceptCurrentApplicationTerms.value = false
  }
})

const participantActor = computed(() => participantApplication.actor.value)
const participantPanelLoading = computed(() => {
  if (!user.value?.sub) {
    return false
  }

  if (participantApplication.actorStatus.value === 'idle' || participantApplication.actorStatus.value === 'pending' || !participantActor.value) {
    return true
  }

  if (participantActor.value?.kind !== 'platform_user') {
    return false
  }

  if (
    participantApplication.visibleHackathonStatus.value === 'idle'
    || participantApplication.ownApplicationStatus.value === 'idle'
    || participantApplication.visibleHackathonStatus.value === 'pending'
    || participantApplication.ownApplicationStatus.value === 'pending'
  ) {
    return true
  }

  return !participantApplication.ownApplication.value
    && hackathon.value.state === 'registration_open'
    && (
      participantApplication.currentTermsStatus.value === 'idle'
      || participantApplication.currentTermsStatus.value === 'pending'
    )
})
const participantApplicationStatusLabel = computed(() =>
  participantApplication.ownApplication.value
    ? formatParticipantApplicationStatus(participantApplication.ownApplication.value.status)
    : ''
)
const participantApplicationStatusSummary = computed(() =>
  participantApplication.ownApplication.value
    ? summarizeParticipantApplicationStatus(participantApplication.ownApplication.value.status, hackathon.value.state)
    : getHackathonApplicationAvailabilityMessage(hackathon.value.state)
)

async function submitParticipantApplication() {
  if (!participantApplication.currentApplicationTerms.value) {
    participantApplication.submissionError.value = 'The current application terms are unavailable.'
    participantApplication.submissionSuccess.value = ''
    return
  }

  if (!acceptCurrentApplicationTerms.value) {
    participantApplication.submissionError.value = 'You must accept the current application terms before applying.'
    participantApplication.submissionSuccess.value = ''
    return
  }

  await participantApplication.submitApplication(participantApplication.currentApplicationTerms.value.id)
}

useSeoMeta({
  title: () => `${hackathon.value.name} | Codex Hackathons`,
  description: () => hackathon.value.description
})
</script>

<template>
  <div class="pb-24">
    <section class="relative isolate overflow-hidden border-b border-default/80">
      <img
        v-if="heroImage"
        :src="heroImage"
        :alt="hackathon.name"
        class="absolute inset-0 h-full w-full object-cover"
      >
      <div
        v-else
        class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,91,112,0.4),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(102,115,139,0.25),transparent_24%),linear-gradient(135deg,rgba(15,20,34,0.96),rgba(34,42,57,0.88)_44%,rgba(102,115,139,0.78))]"
      />

      <div class="absolute inset-0 bg-gradient-to-b from-codex-950/30 via-codex-950/55 to-[var(--ui-bg)]" />

      <UContainer class="relative py-18 sm:py-24">
        <NuxtLink
          to="/hackathons"
          class="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white/92 backdrop-blur transition-colors hover:bg-white/16"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          Back to hackathons
        </NuxtLink>

        <div class="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_22rem] xl:items-start">
          <div class="space-y-6 text-inverted">
            <HackathonStateBadge :state="hackathon.state" />

            <div class="space-y-4">
              <h1
                data-testid="public-hackathon-detail-title"
                class="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl"
              >
                {{ hackathon.name }}
              </h1>

              <p class="max-w-3xl text-base leading-8 text-white/82 sm:text-lg">
                {{ hackathon.description }}
              </p>
            </div>

            <div class="flex flex-wrap gap-3">
              <UBadge
                color="neutral"
                variant="outline"
                class="rounded-full border-white/22 bg-white/8 px-3 py-1.5 text-white"
              >
                {{ hackathon.city }} · {{ hackathon.address }}
              </UBadge>

              <UBadge
                color="neutral"
                variant="outline"
                class="rounded-full border-white/22 bg-white/8 px-3 py-1.5 text-white"
              >
                {{ formatMaxTeamMembers(hackathon.maxTeamMembers) }}
              </UBadge>

              <UBadge
                v-if="requiredProfiles.length === 0"
                color="neutral"
                variant="outline"
                class="rounded-full border-white/22 bg-white/8 px-3 py-1.5 text-white"
              >
                No required profile links
              </UBadge>

              <UBadge
                v-for="profile in requiredProfiles"
                :key="profile"
                color="neutral"
                variant="outline"
                class="rounded-full border-white/22 bg-white/8 px-3 py-1.5 text-white"
              >
                {{ profile }} required
              </UBadge>
            </div>
          </div>

          <UCard
            variant="subtle"
            :ui="{ root: 'border border-white/16 bg-white/10 text-white shadow-[0_28px_72px_-48px_rgba(0,0,0,0.72)] backdrop-blur' }"
          >
            <div class="space-y-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
                Public visibility
              </p>
              <p class="text-xl font-semibold tracking-[-0.03em] text-white">
                This detail page stays inside the public contract.
              </p>
              <p class="text-sm leading-7 text-white/76">
                Operational queues, team workspaces, assignment loads, and admin controls remain in their role-specific surfaces.
              </p>
            </div>
          </UCard>
        </div>
      </UContainer>
    </section>

    <UContainer class="space-y-6 pt-10">
      <HackathonTimeline :hackathon="hackathon" />

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <UCard
          variant="subtle"
          :ui="{ root: 'border border-default/80 bg-elevated/85 backdrop-blur shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)]' }"
        >
          <div class="space-y-6">
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Program snapshot
              </p>
              <h2 class="text-2xl font-semibold tracking-[-0.03em] text-highlighted">
                What participants can assess before they commit
              </h2>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="rounded-2xl border border-default/80 bg-default/60 p-5">
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Registration opens
                </p>
                <p class="mt-3 text-lg font-semibold text-highlighted">
                  {{ formatHackathonDate(hackathon.registrationOpensAt) }}
                </p>
              </div>

              <div class="rounded-2xl border border-default/80 bg-default/60 p-5">
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Submission closes
                </p>
                <p class="mt-3 text-lg font-semibold text-highlighted">
                  {{ formatHackathonDate(hackathon.submissionClosesAt) }}
                </p>
              </div>
            </div>

            <p class="text-sm leading-8 text-toned">
              Team formation, applications, judging, and redemption actions remain guarded by lifecycle rules and actor permissions. This public page is intentionally limited to the information a visitor can safely evaluate before entering those workflows.
            </p>
          </div>
        </UCard>

        <HackathonTermsReferences :hackathon="hackathon" />
      </div>

      <UCard
        data-testid="participant-application-panel"
        variant="subtle"
        :ui="{ root: 'border border-default/80 bg-elevated/88 backdrop-blur shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)]' }"
      >
        <div class="space-y-6">
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Participant application
            </p>
            <h2 class="text-2xl font-semibold tracking-[-0.03em] text-highlighted">
              Apply before team formation begins.
            </h2>
            <p class="text-sm leading-7 text-toned">
              This panel uses the canonical participant application workflow: exact-version application-terms acceptance, required-profile validation, and hackathon-admin review outcomes.
            </p>
          </div>

          <UAlert
            v-if="participantPanelLoading"
            color="neutral"
            variant="soft"
            title="Loading participant application state"
            description="Resolving the authenticated actor, application status, and current terms for this hackathon."
          />

          <UAlert
            v-else-if="participantApplication.actorErrorMessage.value"
            color="error"
            variant="soft"
            title="Unable to resolve participant access"
            :description="participantApplication.actorErrorMessage.value"
          />

          <template v-else-if="participantActor?.kind === 'anonymous'">
            <UAlert
              color="primary"
              variant="soft"
              title="Sign in to apply"
              description="Public program detail stays visible without authentication, but application submission requires a real Auth0-backed session."
            />

            <UButton
              :to="loginHref"
              color="primary"
              icon="i-lucide-log-in"
            >
              Sign in with Auth0
            </UButton>
          </template>

          <template v-else-if="participantActor?.kind === 'authenticated_identity'">
            <UAlert
              color="warning"
              variant="soft"
              title="Platform account required"
              description="Complete the platform account before entering the participant application workflow for this hackathon."
            />

            <UButton
              to="/onboarding/account"
              color="warning"
              icon="i-lucide-id-card"
            >
              Complete platform account
            </UButton>
          </template>

          <UAlert
            v-else-if="participantApplication.visibleHackathonErrorMessage.value"
            color="error"
            variant="soft"
            title="Unable to resolve hackathon access"
            :description="participantApplication.visibleHackathonErrorMessage.value"
          />

          <UAlert
            v-else-if="!participantApplication.visibleHackathonId.value"
            color="error"
            variant="soft"
            title="Participant application unavailable"
            description="The authenticated participant workspace could not resolve this visible hackathon."
          />

          <UAlert
            v-else-if="participantApplication.ownApplicationErrorMessage.value"
            color="error"
            variant="soft"
            title="Unable to load your application"
            :description="participantApplication.ownApplicationErrorMessage.value"
          />

          <template v-else-if="participantApplication.ownApplication.value">
            <div class="grid gap-6 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
              <div class="rounded-[1.5rem] border border-default bg-default px-5 py-5">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Current status
                </p>
                <div class="mt-3 flex flex-wrap items-center gap-3">
                  <UBadge
                    data-testid="participant-application-status"
                    :color="getParticipantApplicationStatusColor(participantApplication.ownApplication.value.status)"
                    variant="soft"
                  >
                    {{ participantApplicationStatusLabel }}
                  </UBadge>
                  <span class="text-sm text-toned">
                    {{ participantApplicationStatusSummary }}
                  </span>
                </div>

                <dl class="mt-5 grid gap-4">
                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Submitted
                    </dt>
                    <dd class="mt-1 text-sm text-highlighted">
                      {{ formatHackathonDate(participantApplication.ownApplication.value.submittedAt) }}
                    </dd>
                  </div>

                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Reviewed
                    </dt>
                    <dd class="mt-1 text-sm text-highlighted">
                      {{ participantApplication.ownApplication.value.reviewedAt ? formatHackathonDate(participantApplication.ownApplication.value.reviewedAt) : 'Awaiting review' }}
                    </dd>
                  </div>
                </dl>
              </div>

              <div class="rounded-[1.5rem] border border-default bg-default px-5 py-5">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Accepted application terms
                </p>
                <div
                  v-if="participantApplication.ownApplication.value.applicationTermsDocument"
                  class="mt-3 space-y-4"
                >
                  <div class="space-y-1">
                    <p class="text-lg font-semibold text-highlighted">
                      {{ participantApplication.ownApplication.value.applicationTermsDocument.title }}
                    </p>
                    <p class="text-sm text-toned">
                      Version {{ participantApplication.ownApplication.value.applicationTermsDocument.version }} accepted on {{ formatHackathonDate(participantApplication.ownApplication.value.applicationTermsAcceptedAt) }}.
                    </p>
                  </div>

                  <div class="max-h-56 overflow-y-auto rounded-2xl border border-default/70 bg-elevated/70 px-4 py-4 text-sm leading-7 text-toned whitespace-pre-wrap">
                    {{ participantApplication.ownApplication.value.applicationTermsDocument.content }}
                  </div>
                </div>

                <UAlert
                  v-else
                  class="mt-3"
                  color="neutral"
                  variant="soft"
                  title="Accepted terms unavailable"
                  description="The exact application terms document reference was recorded, but its content could not be loaded for this view."
                />
              </div>
            </div>

            <div
              v-if="participantApplication.ownApplication.value.status === 'approved'"
              class="flex flex-wrap gap-3"
            >
              <UButton
                :to="`/hackathons/${slug}/teams`"
                color="primary"
                icon="i-lucide-users"
                data-testid="participant-team-workspace-link"
              >
                Open team workspace
              </UButton>
            </div>
          </template>

          <UAlert
            v-else-if="hackathon.state !== 'registration_open'"
            color="neutral"
            variant="soft"
            title="Applications are closed"
            :description="participantApplicationStatusSummary"
          />

          <template v-else-if="participantApplication.missingProfileFields.value.length > 0">
            <UAlert
              color="warning"
              variant="soft"
              title="Profile update required before applying"
              description="This hackathon checks required profile fields before an application can be submitted."
            />

            <div
              data-testid="participant-application-missing-profiles"
              class="rounded-[1.5rem] border border-default bg-default px-5 py-5"
            >
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Missing required fields
              </p>
              <ul class="mt-3 grid gap-2 text-sm text-toned">
                <li
                  v-for="field in participantApplication.missingProfileFields.value"
                  :key="field.key"
                >
                  {{ field.label }}
                </li>
              </ul>
            </div>

            <UButton
              to="/account"
              color="warning"
              icon="i-lucide-id-card"
            >
              Update account profile
            </UButton>
          </template>

          <UAlert
            v-else-if="participantApplication.currentTermsErrorMessage.value"
            color="error"
            variant="soft"
            title="Unable to load current application terms"
            :description="participantApplication.currentTermsErrorMessage.value"
          />

          <UAlert
            v-else-if="!participantApplication.currentApplicationTerms.value"
            color="warning"
            variant="soft"
            title="Application terms unavailable"
            description="This hackathon does not currently expose application terms for participant acceptance."
          />

          <template v-else>
            <div class="grid gap-6 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
              <div class="rounded-[1.5rem] border border-default bg-default px-5 py-5">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Eligibility check
                </p>
                <p class="mt-3 text-sm text-toned">
                  {{ participantApplicationStatusSummary }}
                </p>
                <div class="mt-3 grid gap-4">
                  <div class="rounded-2xl border border-default/70 bg-elevated/70 px-4 py-4">
                    <p class="text-sm font-semibold text-highlighted">
                      Registration is open
                    </p>
                    <p class="mt-1 text-sm text-toned">
                      You can submit one application for this hackathon while the registration window is active.
                    </p>
                  </div>

                  <div class="rounded-2xl border border-default/70 bg-elevated/70 px-4 py-4">
                    <p class="text-sm font-semibold text-highlighted">
                      Profile requirements satisfied
                    </p>
                    <p class="mt-1 text-sm text-toned">
                      Your current platform profile satisfies the required social-link rules for this hackathon.
                    </p>
                  </div>
                </div>
              </div>

              <div class="rounded-[1.5rem] border border-default bg-default px-5 py-5">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Current application terms
                </p>
                <div class="mt-3 space-y-4">
                  <div class="space-y-1">
                    <p class="text-lg font-semibold text-highlighted">
                      {{ participantApplication.currentApplicationTerms.value.title }}
                    </p>
                    <p class="text-sm text-toned">
                      Version {{ participantApplication.currentApplicationTerms.value.version }} published {{ formatHackathonDate(participantApplication.currentApplicationTerms.value.publishedAt) }}.
                    </p>
                  </div>

                  <div class="max-h-56 overflow-y-auto rounded-2xl border border-default/70 bg-elevated/70 px-4 py-4 text-sm leading-7 text-toned whitespace-pre-wrap">
                    {{ participantApplication.currentApplicationTerms.value.content }}
                  </div>

                  <label class="flex items-start gap-3 rounded-2xl border border-default/70 bg-elevated/70 px-4 py-4 text-sm text-toned">
                    <input
                      v-model="acceptCurrentApplicationTerms"
                      type="checkbox"
                      class="mt-1 size-4 rounded border-default"
                    >
                    <span>I accept the current application terms exactly as shown above and understand this acceptance will be recorded on submission.</span>
                  </label>

                  <UAlert
                    v-if="participantApplication.submissionError.value"
                    color="error"
                    variant="soft"
                    title="Application submission failed"
                    :description="participantApplication.submissionError.value"
                  />

                  <UAlert
                    v-if="participantApplication.submissionSuccess.value"
                    color="success"
                    variant="soft"
                    :description="participantApplication.submissionSuccess.value"
                  />

                  <UButton
                    data-testid="participant-application-submit"
                    color="primary"
                    :loading="participantApplication.isSubmitting.value"
                    @click="submitParticipantApplication"
                  >
                    Submit application
                  </UButton>
                </div>
              </div>
            </div>
          </template>
        </div>
      </UCard>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <HackathonCriteriaList
          :criteria="criteria"
          :error-message="criteriaErrorMessage"
        />

        <HackathonPrizeList
          :prizes="prizes"
          :error-message="prizesErrorMessage"
        />
      </div>
    </UContainer>
  </div>
</template>
