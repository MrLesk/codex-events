<script setup lang="ts">
import type {
  PublicApiDataResponse,
  PublicApiListResponse,
  PublicHackathon,
  PublicPrize
} from '~/composables/useHackathonPresentation'
import type {
  HackathonParticipationApiDataResponse,
  HackathonParticipationPayload,
  HackathonParticipationRecord
} from '~/utils/hackathon-participation'

import AccountHackathonAdminOperationsPanel from '~/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue'
import AccountHackathonAdminSettingsPanel from '~/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue'
import AccountHackathonCompetitionPanel from '~/components/account/hackathons/AccountHackathonCompetitionPanel.vue'
import AccountHackathonJudgePanel from '~/components/account/hackathons/AccountHackathonJudgePanel.vue'
import HackathonAgendaPanel from '~/components/public/hackathons/HackathonAgendaPanel.vue'
import HackathonOverviewPanel from '~/components/public/hackathons/HackathonOverviewPanel.vue'
import HackathonPrizeList from '~/components/public/hackathons/HackathonPrizeList.vue'
import HackathonTimeline from '~/components/public/hackathons/HackathonTimeline.vue'
import {
  formatParticipantApplicationStatus,
  getParticipantApplicationStatusColor,
  summarizeParticipantApplicationStatus
} from '~/utils/participant-application'
import { getTeamFormationAvailability } from '~/utils/team-workspace'
import {
  formatTeamSubmissionStatus,
  getTeamSubmissionStateSummary,
  getTeamSubmissionWorkspaceStatus
} from '~/utils/team-submission'
import { normalizeTabQueryValue, resolveTabQueryValue } from '~/utils/tab-query'

definePageMeta({
  layout: 'profile',
  middleware: ['require-platform-account']
})

interface AccountHackathonAccessRecord {
  id: string
  slug: string
  name: string
  description: string
  state: PublicHackathon['state']
  city: string
  country: string
  address: string
  bannerImageUrl: string | null
  backgroundImageUrl: string | null
  registrationOpensAt: string
  registrationClosesAt: string
  submissionOpensAt: string
  submissionClosesAt: string
  applicationStatus: 'submitted' | 'approved' | 'rejected' | null
  team: {
    id: string
    name: string
    slug: string
    role: 'member' | 'admin'
  } | null
  submissionStatus: 'draft' | 'submitted' | 'withdrawn' | 'locked' | 'disqualified' | null
  roles: Array<'hackathon_admin' | 'judge'>
}

interface AccountHackathonsResponse {
  data: {
    current: AccountHackathonAccessRecord[]
    past: AccountHackathonAccessRecord[]
  }
}

const allWorkspaceTabs = [
  'overview',
  'prizes',
  'details',
  'judges',
  'staff',
  'judging',
  'operations',
  'settings'
] as const
type WorkspaceSectionTab = (typeof allWorkspaceTabs)[number]

const workspaceTabLabels: Record<WorkspaceSectionTab, string> = {
  overview: 'Overview',
  prizes: 'Prizes',
  details: 'Details',
  judges: 'Judges',
  staff: 'Staff',
  judging: 'Judging',
  operations: 'Operations',
  settings: 'Settings'
}

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())
const { actor } = useAccountLifecycleActor()

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const [
  { data: hackathonResponse, error: hackathonError },
  { data: criteriaResponse },
  { data: prizesResponse }
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

const requestFetch = import.meta.server ? useRequestFetch() : $fetch
const accountHackathonsResponse = await requestFetch<AccountHackathonsResponse>('/api/account/hackathons')
const accessRecord = computed(() => [
  ...accountHackathonsResponse.data.current,
  ...accountHackathonsResponse.data.past
].find(record => record.slug === slug.value) ?? null)

if (!accessRecord.value) {
  throw createError({
    statusCode: 401,
    statusMessage: 'This hackathon is not available in your account workspace.'
  })
}

const participationResponse = await requestFetch<HackathonParticipationApiDataResponse<HackathonParticipationPayload>>(
  '/api/hackathons/participation'
)
const participationRecord = computed<HackathonParticipationRecord | null>(() => {
  const records = [
    ...participationResponse.data.current,
    ...participationResponse.data.past
  ]

  return records.find(record => record.hackathon.slug === slug.value) ?? null
})

const hackathon = computed(() => hackathonResponse.value!.data)
const criteriaCount = computed(() => criteriaResponse.value?.data.length ?? 0)
const prizes = computed(() => prizesResponse.value?.data ?? [])
const hasPublishedPrizes = computed(() => prizes.value.length > 0)

const canJudge = computed(() => accessRecord.value?.roles.includes('judge') ?? false)
const canAdmin = computed(() => {
  if (actor.value.kind !== 'platform_user') {
    return false
  }

  return actor.value.isPlatformAdmin || (accessRecord.value?.roles.includes('hackathon_admin') ?? false)
})
const workspaceBackLink = computed(() => canAdmin.value
  ? {
      to: '/account/admin',
      label: 'Back to Admin dashboard'
    }
  : {
      to: '/account',
      label: 'Back to my hackathons'
    })
const applicationStatus = computed(() =>
  participationRecord.value?.application?.status ?? accessRecord.value?.applicationStatus ?? null
)
const hasParticipantContext = computed(() =>
  Boolean(applicationStatus.value || participationRecord.value?.activeTeam || participationRecord.value?.latestTeam)
)

const availableTabs = computed<WorkspaceSectionTab[]>(() => {
  const tabs: WorkspaceSectionTab[] = ['overview']

  if (hasPublishedPrizes.value) {
    tabs.push('prizes')
  }

  tabs.push('details', 'judges', 'staff')

  if (canJudge.value) {
    tabs.push('judging')
  }

  if (canAdmin.value) {
    tabs.push('operations', 'settings')
  }

  return tabs
})
const visibleTabs = computed(() =>
  availableTabs.value.map(tab => ({
    id: tab,
    label: workspaceTabLabels[tab]
  }))
)
const activeSection = computed<WorkspaceSectionTab>(() =>
  resolveTabQueryValue(route.query.tab, availableTabs.value, 'overview')
)

async function selectWorkspaceSection(nextSection: WorkspaceSectionTab) {
  if (normalizeTabQueryValue(route.query.tab) === nextSection) {
    return
  }

  const nextQuery = {
    ...route.query
  }

  if (nextSection === 'overview') {
    delete nextQuery.tab
  } else {
    nextQuery.tab = nextSection
  }

  await navigateTo({
    path: route.path,
    query: nextQuery,
    hash: route.hash
  })
}

watchEffect(() => {
  const normalizedTab = normalizeTabQueryValue(route.query.tab)
  const resolvedTab = resolveTabQueryValue(route.query.tab, availableTabs.value, 'overview')

  if (!normalizedTab && resolvedTab === 'overview') {
    return
  }

  if (normalizedTab === resolvedTab) {
    return
  }

  const nextQuery = {
    ...route.query
  }

  if (resolvedTab === 'overview') {
    delete nextQuery.tab
  } else {
    nextQuery.tab = resolvedTab
  }

  void navigateTo({
    path: route.path,
    query: nextQuery,
    hash: route.hash
  }, { replace: true })
})

const teamsHref = computed(() => `/hackathons/${slug.value}/teams`)
const activeTeamHref = computed(() =>
  participationRecord.value?.activeTeam ? `/hackathons/${slug.value}/teams/${participationRecord.value.activeTeam.id}` : null
)
const applicationStatusLabel = computed(() =>
  applicationStatus.value ? formatParticipantApplicationStatus(applicationStatus.value) : ''
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
    : ''
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
const submissionRoleSummary = computed(() => {
  if (!participationRecord.value?.activeTeam) {
    return 'Join or create a team before working on a project submission.'
  }

  if (participationRecord.value.activeTeam.membershipRole === 'admin') {
    return 'You are a team admin and can manage submission actions when lifecycle guards allow them.'
  }

  return 'You are a team member with read-only submission visibility. Team admins manage submission actions.'
})

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
const detailBackgroundImageStyle = computed(() => detailBackgroundImageUrl.value
  ? { backgroundImage: `url(${JSON.stringify(detailBackgroundImageUrl.value)})` }
  : undefined)
const detailSummary = computed(() => [
  formatHackathonWindow(hackathon.value.registrationOpensAt, hackathon.value.submissionClosesAt),
  formatHackathonLocation(hackathon.value),
  formatMaxTeamMembers(hackathon.value.maxTeamMembers)
].join(' • '))

useSeoMeta({
  title: () => `${hackathon.value.name} | Codex Hackathons`,
  description: () => `View the account workspace for ${hackathon.value.name}.`
})
</script>

<template>
  <div class="relative isolate pb-16">
    <div
      v-if="detailBackgroundImageUrl"
      class="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        class="hackathon-detail-background-media"
        :style="detailBackgroundImageStyle"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/68 dark:from-black/35 dark:via-black/55 dark:to-black/76" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.22),transparent_46%)] dark:bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.10),transparent_48%)]" />
    </div>

    <section class="relative z-10 border-b border-black/8 bg-white/42 backdrop-blur-lg dark:border-white/[0.08] dark:bg-black/48">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <NuxtLink
          :to="workspaceBackLink.to"
          class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-600 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
        >
          <AppIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          {{ workspaceBackLink.label }}
        </NuxtLink>

        <div class="mt-3 border-b border-black/8 pb-0 dark:border-white/[0.08]">
          <div class="space-y-2 pb-4">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0 flex flex-wrap items-center gap-3">
                  <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                    {{ hackathon.name }}
                  </h1>
                  <span
                    class="rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider"
                    :class="headerStateClass"
                  >
                    {{ headerStateLabel }}
                  </span>
                  <AppBadge
                    v-if="applicationStatus"
                    :color="applicationStatusColor"
                    variant="soft"
                    class="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                  >
                    {{ applicationStatusLabel }}
                  </AppBadge>
                </div>
              </div>

              <p class="text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
                {{ detailSummary }}
              </p>
            </div>

            <p
              v-if="applicationStatusSummary"
              class="text-[14px] text-neutral-600 dark:text-[#A3A3A3]"
            >
              {{ applicationStatusSummary }}
            </p>
          </div>

          <nav
            aria-label="Account hackathon sections"
            role="tablist"
            class="flex items-center gap-5 overflow-x-auto"
          >
            <button
              v-for="tab in visibleTabs"
              :id="`account-tab-${tab.id}`"
              :key="tab.id"
              type="button"
              role="tab"
              :aria-selected="activeSection === tab.id"
              :aria-controls="`account-tab-panel-${tab.id}`"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activeSection === tab.id ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="void selectWorkspaceSection(tab.id)"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="relative z-10 max-w-[68rem] space-y-7 pt-6">
      <section
        v-if="activeSection === 'overview'"
        id="account-tab-panel-overview"
        role="tabpanel"
        aria-labelledby="account-tab-overview"
        class="space-y-7"
      >
        <HackathonOverviewPanel :description="hackathon.description" />

        <section
          v-if="hasParticipantContext"
          class="space-y-4"
        >
          <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
            <p class="text-[20px] font-medium text-highlighted dark:text-white">
              Your participation
            </p>
            <p class="text-[14px] text-neutral-600 dark:text-[#A3A3A3]">
              Track your application, team, and project here as they become available.
            </p>
          </div>

          <AppAlert
            v-if="applicationStatus && applicationStatus !== 'approved'"
            :color="applicationStatus === 'submitted' ? 'warning' : 'error'"
            variant="soft"
            title="Application status"
            :description="applicationStatusSummary"
          />

          <template v-else-if="applicationStatus === 'approved'">
            <AppAlert
              :color="teamFormationAvailability.isOpen ? 'success' : 'neutral'"
              variant="soft"
              title="Team formation"
              :description="teamFormationAvailability.summary"
            />

            <section class="grid gap-4 lg:grid-cols-2">
              <AppCard class="hackathon-workspace-detail-inset p-6">
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

              <AppCard class="hackathon-workspace-detail-inset p-6">
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
        </section>
      </section>

      <section
        v-else-if="activeSection === 'prizes'"
        id="account-tab-panel-prizes"
        role="tabpanel"
        aria-labelledby="account-tab-prizes"
      >
        <HackathonPrizeList :prizes="prizes" />
      </section>

      <section
        v-else-if="activeSection === 'details'"
        id="account-tab-panel-details"
        role="tabpanel"
        aria-labelledby="account-tab-details"
        class="space-y-7"
      >
        <HackathonTimeline
          :hackathon="hackathon"
          :criteria-count="criteriaCount"
        />

        <HackathonAgendaPanel :agenda-items="hackathon.agendaItems" />
      </section>

      <section
        v-else-if="activeSection === 'judges'"
        id="account-tab-panel-judges"
        role="tabpanel"
        aria-labelledby="account-tab-judges"
      >
        <AppCard class="hackathon-workspace-detail-panel p-6">
          <h2 class="text-xl font-semibold text-highlighted dark:text-white">
            Judges
          </h2>
          <p class="mt-2 text-sm text-neutral-600 dark:text-[#A3A3A3]">
            Judge roster publishing is not exposed yet. This tab is reserved for the official hackathon judge list.
          </p>
        </AppCard>
      </section>

      <section
        v-else-if="activeSection === 'staff'"
        id="account-tab-panel-staff"
        role="tabpanel"
        aria-labelledby="account-tab-staff"
      >
        <AppCard class="hackathon-workspace-detail-panel p-6">
          <h2 class="text-xl font-semibold text-highlighted dark:text-white">
            Staff
          </h2>
          <p class="mt-2 text-sm text-neutral-600 dark:text-[#A3A3A3]">
            Staff roster publishing is not exposed yet. This tab is reserved for the official hackathon staff list.
          </p>
        </AppCard>
      </section>

      <section
        v-else-if="activeSection === 'judging'"
        id="account-tab-panel-judging"
        role="tabpanel"
        aria-labelledby="account-tab-judging"
      >
        <AccountHackathonJudgePanel :slug="slug" />
      </section>

      <section
        v-else-if="activeSection === 'operations'"
        id="account-tab-panel-operations"
        role="tabpanel"
        aria-labelledby="account-tab-operations"
        class="space-y-8"
      >
        <AccountHackathonAdminOperationsPanel :slug="slug" />
        <AccountHackathonCompetitionPanel :slug="slug" />
      </section>

      <section
        v-else
        id="account-tab-panel-settings"
        role="tabpanel"
        aria-labelledby="account-tab-settings"
      >
        <AccountHackathonAdminSettingsPanel :slug="slug" />
      </section>
    </AppContainer>
  </div>
</template>
