<script setup lang="ts">
import type {
  PublicApiDataResponse,
  PublicApiListResponse,
  PublicHackathon,
  PublicPrize
} from '~/composables/useHackathonPresentation'
import type { ApiDataResponse, HackathonRecord } from '~/utils/admin-workspace'
import type {
  ParticipantApplicationRecord,
  ParticipantApiDataResponse
} from '~/utils/participant-application'
import type {
  HackathonParticipationApiDataResponse,
  HackathonParticipationPayload,
  HackathonParticipationRecord
} from '~/utils/hackathon-participation'

import HackathonPrizeList from '~/components/public/hackathons/HackathonPrizeList.vue'
import HackathonTimeline from '~/components/public/hackathons/HackathonTimeline.vue'
import { buildAccountSettingsHref } from '~/utils/auth-navigation'
import {
  formatParticipantApplicationStatus,
  getParticipantApplicationStatusColor,
  normalizeParticipantApiError,
  summarizeParticipantApplicationStatus
} from '~/utils/participant-application'
import { getTeamFormationAvailability } from '~/utils/team-workspace'
import {
  formatTeamSubmissionStatus,
  getTeamSubmissionStateSummary,
  getTeamSubmissionWorkspaceStatus
} from '~/utils/team-submission'
import { renderMarkdown } from '~/utils/markdown'

definePageMeta({
  layout: 'profile',
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

const [
  { data: hackathonResponse, error: hackathonError },
  { data: criteriaResponse },
  { data: prizesResponse, error: prizesError }
] = await Promise.all([
  useFetch<PublicApiDataResponse<PublicHackathon>>(() => `/api/public/hackathons/${slug.value}`, {
    key: () => `account-hackathon-detail:${slug.value}`
  }),
  useFetch<PublicApiListResponse<{ name: string }>>(() => `/api/public/hackathons/${slug.value}/evaluation-criteria`, {
    key: () => `account-hackathon-criteria:${slug.value}`
  }),
  useFetch<PublicApiListResponse<PublicPrize>>(() => `/api/public/hackathons/${slug.value}/prizes`, {
    key: () => `account-hackathon-prizes:${slug.value}`
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
const criteriaCount = computed(() => criteriaResponse.value?.data.length ?? 0)
const prizes = computed(() => prizesResponse.value?.data ?? [])
const prizesErrorMessage = computed(() => prizesError.value ? 'Published awards could not be loaded right now.' : undefined)

const ownApplication = ref<ParticipantApplicationRecord | null>(null)
const participationRecord = ref<HackathonParticipationRecord | null>(null)
const workspaceErrorMessage = ref('')

if (accountActor.value?.kind === 'platform_user') {
  const requestFetch = import.meta.server ? useRequestFetch() : $fetch

  try {
    const visibleHackathonResponse = await requestFetch<ApiDataResponse<HackathonRecord>>(`/api/hackathons/slug/${slug.value}`)
    const visibleHackathonId = visibleHackathonResponse.data.id

    const ownApplicationResponse = await requestFetch<ParticipantApiDataResponse<ParticipantApplicationRecord | null>>(
      `/api/hackathons/${visibleHackathonId}/applications/me`
    )
    ownApplication.value = ownApplicationResponse.data

    const participationResponse = await requestFetch<HackathonParticipationApiDataResponse<HackathonParticipationPayload>>(
      '/api/hackathons/participation'
    )
    const allParticipationRecords = [
      ...participationResponse.data.current,
      ...participationResponse.data.past
    ]
    participationRecord.value = allParticipationRecords.find(record => record.hackathon.slug === slug.value) ?? null
  } catch (error) {
    workspaceErrorMessage.value = normalizeParticipantApiError(error).message
  }
}

const accountSettingsHref = computed(() => buildAccountSettingsHref(route.fullPath))
const registerHref = computed(() => `/hackathons/${slug.value}/register`)
const teamsHref = computed(() => `/hackathons/${slug.value}/teams`)
const activeTeamHref = computed(() =>
  participationRecord.value?.activeTeam ? `/hackathons/${slug.value}/teams/${participationRecord.value.activeTeam.id}` : null
)

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
const detailBackgroundImageUrl = computed(() => {
  const backgroundImageUrl = hackathon.value.backgroundImageUrl?.trim()

  if (backgroundImageUrl) {
    return backgroundImageUrl
  }

  const bannerImageUrl = hackathon.value.bannerImageUrl?.trim()
  return bannerImageUrl || null
})
const detailSummary = computed(() => [
  formatHackathonWindow(hackathon.value.registrationOpensAt, hackathon.value.submissionClosesAt),
  hackathon.value.city,
  formatMaxTeamMembers(hackathon.value.maxTeamMembers)
].join(' • '))

const applicationStatus = computed(() => ownApplication.value?.status ?? null)
const applicationStatusLabel = computed(() =>
  applicationStatus.value ? formatParticipantApplicationStatus(applicationStatus.value) : 'Not registered'
)
const applicationStatusColor = computed(() => {
  if (!applicationStatus.value) {
    return 'neutral'
  }

  return getParticipantApplicationStatusColor(applicationStatus.value)
})
const applicationStatusSummary = computed(() =>
  applicationStatus.value
    ? summarizeParticipantApplicationStatus(applicationStatus.value, hackathon.value.state)
    : 'Register for this hackathon to unlock participant-specific workspace details.'
)

const teamFormationAvailability = computed(() =>
  getTeamFormationAvailability(
    hackathon.value,
    applicationStatus.value,
    Boolean(participationRecord.value?.activeTeam)
  )
)
const submissionStatus = computed(() =>
  getTeamSubmissionWorkspaceStatus(participationRecord.value?.latestSubmission ?? null)
)
const submissionStatusLabel = computed(() => formatTeamSubmissionStatus(submissionStatus.value))
const submissionSummary = computed(() =>
  getTeamSubmissionStateSummary(hackathon.value, participationRecord.value?.latestSubmission ?? null)
)
const submissionWindowMessage = computed(() => {
  if (hackathon.value.state === 'submission_open') {
    return ''
  }

  if (hackathon.value.state === 'registration_open' || hackathon.value.state === 'draft') {
    return 'Submission is not open yet. You can still use this tab to review status and requirements.'
  }

  return 'Submission is closed. You can still use this tab to review your team submission status.'
})
const submissionRoleSummary = computed(() => {
  if (!participationRecord.value?.activeTeam) {
    return 'Join or create a team before working on a project submission.'
  }

  if (participationRecord.value.activeTeam.membershipRole === 'admin') {
    return 'You are a team admin and can manage submission actions when lifecycle guards allow them.'
  }

  return 'You are a team member with read-only submission visibility. Team admins manage submission actions.'
})

const descriptionMarkdown = computed(() => hackathon.value.description?.trim() ?? '')
const descriptionHtml = computed(() => descriptionMarkdown.value ? renderMarkdown(descriptionMarkdown.value) : '')

const activeSection = ref<'overview' | 'prizes' | 'judges' | 'staff' | 'team' | 'submission'>('overview')
const canViewApprovedWorkspace = computed(() => applicationStatus.value === 'approved')

useSeoMeta({
  title: () => `${hackathon.value.name} Workspace | Codex Hackathons`,
  description: () => `View your participant workspace details for ${hackathon.value.name}.`
})
</script>

<template>
  <div class="relative isolate pb-16">
    <div
      v-if="detailBackgroundImageUrl"
      class="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <img
        :src="detailBackgroundImageUrl"
        :alt="`${hackathon.name} background`"
        class="h-full w-full scale-110 object-cover opacity-55 blur-md saturate-125 contrast-105"
      >
      <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/68 dark:from-black/35 dark:via-black/55 dark:to-black/76" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.22),transparent_46%)] dark:bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.10),transparent_48%)]" />
    </div>

    <section class="relative z-10 border-b border-black/8 bg-white/42 backdrop-blur-lg dark:border-white/[0.08] dark:bg-black/48">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <NuxtLink
          to="/account/dashboard"
          class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-600 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
        >
          <AppIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          Back to dashboard
        </NuxtLink>

        <div class="mt-3 border-b border-black/8 pb-0 dark:border-white/[0.08]">
          <div class="space-y-2 pb-4">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0 space-y-2">
                <div class="flex min-w-0 flex-wrap items-center gap-3">
                  <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
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

              <AppBadge
                :color="applicationStatusColor"
                variant="soft"
                class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
              >
                {{ applicationStatusLabel }}
              </AppBadge>
            </div>

            <p class="text-[14px] text-neutral-600 dark:text-[#A3A3A3]">
              {{ applicationStatusSummary }}
            </p>
          </div>

          <nav
            v-if="canViewApprovedWorkspace"
            aria-label="Participant hackathon workspace sections"
            role="tablist"
            class="flex items-center gap-5 overflow-x-auto"
          >
            <button
              id="account-tab-overview"
              type="button"
              role="tab"
              :aria-selected="activeSection === 'overview'"
              aria-controls="account-tab-panel-overview"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activeSection === 'overview' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="activeSection = 'overview'"
            >
              Overview
            </button>
            <button
              id="account-tab-prizes"
              type="button"
              role="tab"
              :aria-selected="activeSection === 'prizes'"
              aria-controls="account-tab-panel-prizes"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activeSection === 'prizes' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="activeSection = 'prizes'"
            >
              Prizes
            </button>
            <button
              id="account-tab-judges"
              type="button"
              role="tab"
              :aria-selected="activeSection === 'judges'"
              aria-controls="account-tab-panel-judges"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activeSection === 'judges' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="activeSection = 'judges'"
            >
              Judges
            </button>
            <button
              id="account-tab-staff"
              type="button"
              role="tab"
              :aria-selected="activeSection === 'staff'"
              aria-controls="account-tab-panel-staff"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activeSection === 'staff' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="activeSection = 'staff'"
            >
              Staff
            </button>
            <button
              id="account-tab-team"
              type="button"
              role="tab"
              :aria-selected="activeSection === 'team'"
              aria-controls="account-tab-panel-team"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activeSection === 'team' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="activeSection = 'team'"
            >
              Team
            </button>
            <button
              id="account-tab-submission"
              type="button"
              role="tab"
              :aria-selected="activeSection === 'submission'"
              aria-controls="account-tab-panel-submission"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activeSection === 'submission' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="activeSection = 'submission'"
            >
              Submission
            </button>
          </nav>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="relative z-10 max-w-[68rem] space-y-7 pt-6">
      <AppAlert
        v-if="accountActorStatus === 'pending'"
        color="neutral"
        variant="soft"
        title="Loading account workspace"
        description="Resolving your account and hackathon participation details."
      />

      <template v-else-if="accountActor?.kind === 'authenticated_identity'">
        <AppAlert
          color="warning"
          variant="soft"
          title="Platform account required"
          description="Complete your platform account before entering participant hackathon workspaces."
        />

        <AppButton
          :to="accountSettingsHref"
          color="warning"
          icon="i-lucide-id-card"
        >
          Complete platform account
        </AppButton>
      </template>

      <template v-else-if="accountActor?.kind === 'platform_user'">
        <AppAlert
          v-if="workspaceErrorMessage"
          color="error"
          variant="soft"
          title="Hackathon workspace unavailable"
          :description="workspaceErrorMessage"
        />

        <template v-else-if="!ownApplication">
          <AppAlert
            color="info"
            variant="soft"
            title="Registration required"
            description="Register for this hackathon before accessing participant team and submission workspaces."
          />

          <AppButton
            :to="registerHref"
            color="primary"
            trailing-icon="i-lucide-arrow-up-right"
          >
            Register for this hackathon
          </AppButton>
        </template>

        <template v-else-if="ownApplication.status === 'submitted'">
          <AppCard class="border border-black/8 bg-white/70 p-6 dark:border-white/[0.08] dark:bg-[#111111]">
            <h2 class="text-xl font-semibold text-highlighted dark:text-white">
              Pending approval
            </h2>
            <p class="mt-2 text-sm text-neutral-600 dark:text-[#A3A3A3]">
              Your application has been submitted. A hackathon admin needs to review it before participant workspaces become available.
            </p>
            <p class="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-[#8C8C8C]">
              Application status: {{ applicationStatusLabel }}
            </p>
          </AppCard>
        </template>

        <template v-else-if="ownApplication.status === 'rejected'">
          <AppCard class="border border-red-500/20 bg-red-500/5 p-6 dark:border-red-400/20 dark:bg-red-500/10">
            <h2 class="text-xl font-semibold text-red-700 dark:text-red-300">
              Application rejected
            </h2>
            <p class="mt-2 text-sm text-red-700/80 dark:text-red-200/85">
              This application was rejected. You cannot submit another application to this hackathon.
            </p>
            <p class="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-red-700/70 dark:text-red-200/75">
              Contact hackathon staff if you need clarification on the decision.
            </p>
          </AppCard>
        </template>

        <template v-else>
          <section
            v-if="activeSection === 'overview'"
            id="account-tab-panel-overview"
            role="tabpanel"
            aria-labelledby="account-tab-overview"
            class="space-y-7"
          >
            <section
              v-if="descriptionHtml"
              class="rounded-xl border border-black/8 bg-[#F7F7F8] p-6 dark:border-white/[0.08] dark:bg-[#111111]"
            >
              <div
                class="hackathon-markdown"
                v-html="descriptionHtml"
              />
            </section>

            <section
              v-else
              class="rounded-xl border border-dashed border-black/10 bg-white p-8 text-center dark:border-white/[0.08] dark:bg-[#111111]"
            >
              <p class="text-[15px] font-medium text-highlighted dark:text-white">
                Overview will appear here once published.
              </p>
            </section>

            <HackathonTimeline
              :hackathon="hackathon"
              :criteria-count="criteriaCount"
            />
          </section>

          <section
            v-else-if="activeSection === 'prizes'"
            id="account-tab-panel-prizes"
            role="tabpanel"
            aria-labelledby="account-tab-prizes"
          >
            <HackathonPrizeList
              :prizes="prizes"
              :error-message="prizesErrorMessage"
            />
          </section>

          <section
            v-else-if="activeSection === 'judges'"
            id="account-tab-panel-judges"
            role="tabpanel"
            aria-labelledby="account-tab-judges"
          >
            <AppCard class="border border-black/8 bg-white/70 p-6 dark:border-white/[0.08] dark:bg-[#111111]">
              <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                Judges
              </h2>
              <p class="mt-2 text-sm text-neutral-600 dark:text-[#A3A3A3]">
                Judge roster publishing for participant workspaces is not exposed yet. This tab will show the official judge list once that API surface is available.
              </p>
            </AppCard>
          </section>

          <section
            v-else-if="activeSection === 'staff'"
            id="account-tab-panel-staff"
            role="tabpanel"
            aria-labelledby="account-tab-staff"
          >
            <AppCard class="border border-black/8 bg-white/70 p-6 dark:border-white/[0.08] dark:bg-[#111111]">
              <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                Staff
              </h2>
              <p class="mt-2 text-sm text-neutral-600 dark:text-[#A3A3A3]">
                Staff roster publishing for participant workspaces is not exposed yet. This tab will show hackathon staff once that API surface is available.
              </p>
            </AppCard>
          </section>

          <section
            v-else-if="activeSection === 'team'"
            id="account-tab-panel-team"
            role="tabpanel"
            aria-labelledby="account-tab-team"
            class="space-y-4"
          >
            <AppAlert
              :color="teamFormationAvailability.isOpen ? 'success' : 'neutral'"
              variant="soft"
              title="Team formation"
              :description="teamFormationAvailability.summary"
            />

            <AppCard class="border border-black/8 bg-white/70 p-6 dark:border-white/[0.08] dark:bg-[#111111]">
              <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                Team workspace
              </h2>

              <template v-if="participationRecord?.activeTeam">
                <p class="mt-2 text-sm text-neutral-600 dark:text-[#A3A3A3]">
                  Current team: <span class="font-semibold text-highlighted dark:text-white">{{ participationRecord.activeTeam.name }}</span>
                </p>
                <p class="mt-2 text-sm text-neutral-600 dark:text-[#A3A3A3]">
                  Role: {{ participationRecord.activeTeam.membershipRole }} • {{ participationRecord.activeTeam.activeMemberCount }} active members
                </p>

                <AppButton
                  v-if="activeTeamHref"
                  :to="activeTeamHref"
                  color="neutral"
                  variant="solid"
                  trailing-icon="i-lucide-arrow-up-right"
                  class="mt-4"
                >
                  Open team workspace
                </AppButton>
              </template>

              <template v-else>
                <p class="mt-2 text-sm text-neutral-600 dark:text-[#A3A3A3]">
                  You are approved for this hackathon, but you do not have an active team yet.
                </p>

                <AppButton
                  :to="teamsHref"
                  color="neutral"
                  variant="solid"
                  trailing-icon="i-lucide-arrow-up-right"
                  class="mt-4"
                >
                  Open team directory
                </AppButton>
              </template>
            </AppCard>
          </section>

          <section
            v-else
            id="account-tab-panel-submission"
            role="tabpanel"
            aria-labelledby="account-tab-submission"
            class="space-y-4"
          >
            <AppAlert
              v-if="submissionWindowMessage"
              color="neutral"
              variant="soft"
              title="Submission window"
              :description="submissionWindowMessage"
            />

            <AppCard class="border border-black/8 bg-white/70 p-6 dark:border-white/[0.08] dark:bg-[#111111]">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                  Submission
                </h2>
                <AppBadge
                  color="neutral"
                  variant="soft"
                  class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                >
                  {{ submissionStatusLabel }}
                </AppBadge>
              </div>

              <p class="mt-3 text-sm text-neutral-600 dark:text-[#A3A3A3]">
                {{ submissionSummary }}
              </p>
              <p class="mt-2 text-sm text-neutral-600 dark:text-[#A3A3A3]">
                {{ submissionRoleSummary }}
              </p>

              <AppButton
                :to="activeTeamHref ?? teamsHref"
                color="neutral"
                variant="solid"
                trailing-icon="i-lucide-arrow-up-right"
                class="mt-4"
              >
                {{ activeTeamHref ? 'Open team submission workspace' : 'Open team directory' }}
              </AppButton>
            </AppCard>
          </section>
        </template>
      </template>
    </AppContainer>
  </div>
</template>
