<script setup lang="ts">
import type {
  PublicApiDataResponse,
  PublicApiListResponse,
  PublicHackathon,
  PublicPrize
} from '~/composables/useHackathonPresentation'
import type {
  HackathonParticipationApiDataResponse,
  HackathonParticipationRankSummary,
  HackathonParticipationPayload,
  HackathonParticipationRecord
} from '~/utils/hackathon-participation'
import type {
  ParticipantApiDataResponse,
  ParticipantApplicationRecord
} from '~/utils/participant-application'
import type { WinnerEntry } from '~/utils/admin-workspace'

import AccountHackathonAdminOperationsPanel from '~/components/account/hackathons/AccountHackathonAdminOperationsPanel.vue'
import AccountHackathonParticipationRankNotice from '~/components/account/hackathons/AccountHackathonParticipationRankNotice.vue'
import AccountHackathonPublishedRosterPanel from '~/components/account/hackathons/AccountHackathonPublishedRosterPanel.vue'
import AccountHackathonParticipantWorkspacePanel from '~/components/account/hackathons/AccountHackathonParticipantWorkspacePanel.vue'
import AccountHackathonParticipantTeamPanel from '~/components/account/hackathons/AccountHackathonParticipantTeamPanel.vue'
import AccountHackathonAdminSettingsPanel from '~/components/account/hackathons/AccountHackathonAdminSettingsPanel.vue'
import AccountHackathonCreditsPanel from '~/components/account/hackathons/AccountHackathonCreditsPanel.vue'
import AccountHackathonJudgePanel from '~/components/account/hackathons/AccountHackathonJudgePanel.vue'
import AccountHackathonParticipantVisibilityPanel from '~/components/account/hackathons/AccountHackathonParticipantVisibilityPanel.vue'
import AccountHackathonRoleRosterPanel from '~/components/account/hackathons/AccountHackathonRoleRosterPanel.vue'
import HackathonAgendaPanel from '~/components/public/hackathons/HackathonAgendaPanel.vue'
import HackathonOverviewPanel from '~/components/public/hackathons/HackathonOverviewPanel.vue'
import HackathonPrizeList from '~/components/public/hackathons/HackathonPrizeList.vue'
import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'
import HackathonTracksPanel from '~/components/public/hackathons/HackathonTracksPanel.vue'
import HackathonTimeline from '~/components/public/hackathons/HackathonTimeline.vue'
import HackathonWinnersShowcase from '~/components/public/hackathons/HackathonWinnersShowcase.vue'
import {
  hasHackathonAdminAccess,
  hasHackathonJudgingAccess,
  hasHackathonParticipantVisibilityAccess
} from '~/utils/admin-workspace'
import {
  canAccessAccountHackathonWorkspace,
  getAccountHackathonWorkspaceBackLink,
  getAccountHackathonTabAccess,
  getAccountHackathonTabLabel,
  resolveAccountHackathonScopedId,
  type AccountHackathonWorkspaceTab
} from '~/utils/account-hackathon-tabs'
import { getAccountHackathonSeoContent } from '~/utils/account-hackathon-seo'
import {
  createEmptyPublishedHackathonRosterLoadState,
  loadPublishedHackathonRoster,
  type PublishedHackathonRosterMember
} from '~/utils/hackathon-published-roster'
import { getHackathonParticipationOutcomeNotice } from '~/utils/hackathon-participation'
import {
  formatParticipantApplicationStatus,
  getParticipantApplicationWithdrawalAvailability,
  getParticipantApplicationStatusColor,
  isParticipantApplicationSubmittedNotice,
  normalizeParticipantApiError,
  shouldShowParticipantOverviewStatusBanner,
  summarizeParticipantApplicationStatus
} from '~/utils/participant-application'
import {
  hasHackathonEnteredSubmissionPhase
} from '~/utils/team-submission'
import { normalizeJudgeAssignmentIdQueryValue } from '~/utils/judging-query'
import { buildAccountHackathonTeamsTabHref, normalizeTeamSlugQueryValue } from '~/utils/team-query'
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
  applicationStatus: 'submitted' | 'approved' | 'rejected' | 'withdrawn' | null
  team: {
    id: string
    name: string
    slug: string
    role: 'member' | 'admin'
  } | null
  submissionStatus: 'draft' | 'submitted' | 'withdrawn' | 'locked' | 'disqualified' | null
  roles: Array<'hackathon_admin' | 'judge' | 'staff'>
}

interface AccountHackathonsResponse {
  data: {
    current: AccountHackathonAccessRecord[]
    past: AccountHackathonAccessRecord[]
  }
}

type AccountWorkspaceHackathon = Omit<PublicHackathon, 'tracks'> & {
  id: string
  discordServerUrl?: string | null
  tracks?: Array<{
    id: string
    name: string
    description: string
    displayOrder: number
  }>
}

type AccountPrizeSummary = PublicPrize & {
  id: string
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

const {
  data: hackathonResponse,
  error: hackathonError
} = await useFetch<PublicApiDataResponse<AccountWorkspaceHackathon>>(() => `/api/hackathons/slug/${slug.value}`, {
  key: () => `account-hackathon-detail:${slug.value}`
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

const requestFetch = import.meta.server ? useRequestFetch() : $fetch
const shouldPrefetchPublishedJudgesRoster = actor.value.kind === 'platform_user'
const shouldPrefetchPublishedStaffRoster = actor.value.kind === 'platform_user'
const shouldPrefetchWinners = hackathonResponse.value.data.state === 'completed'
const shouldPrefetchParticipationRank = actor.value.kind === 'platform_user'
  && hackathonResponse.value.data.state === 'completed'
const [
  prizesResponse,
  accountHackathonsResponse,
  participationResponse,
  publishedJudgesRoster,
  publishedStaffRoster,
  winnersResponse,
  participationRankResponse
] = await Promise.all([
  requestFetch<PublicApiListResponse<AccountPrizeSummary>>(`/api/hackathons/${hackathonResponse.value.data.id}/prizes`),
  requestFetch<AccountHackathonsResponse>('/api/account/hackathons'),
  requestFetch<HackathonParticipationApiDataResponse<HackathonParticipationPayload>>('/api/hackathons/participation'),
  shouldPrefetchPublishedJudgesRoster
    ? loadPublishedHackathonRoster(
        path => requestFetch<PublicApiListResponse<PublishedHackathonRosterMember>>(path),
        {
          hackathonId: hackathonResponse.value.data.id,
          role: 'judge'
        }
      )
    : Promise.resolve(createEmptyPublishedHackathonRosterLoadState()),
  shouldPrefetchPublishedStaffRoster
    ? loadPublishedHackathonRoster(
        path => requestFetch<PublicApiListResponse<PublishedHackathonRosterMember>>(path),
        {
          hackathonId: hackathonResponse.value.data.id,
          role: 'staff'
        }
      )
    : Promise.resolve(createEmptyPublishedHackathonRosterLoadState()),
  shouldPrefetchWinners
    ? requestFetch<PublicApiListResponse<WinnerEntry>>(`/api/hackathons/${hackathonResponse.value.data.id}/winners`)
    : Promise.resolve({
      data: []
    } satisfies PublicApiListResponse<WinnerEntry>),
  shouldPrefetchParticipationRank
    ? requestFetch<HackathonParticipationApiDataResponse<HackathonParticipationRankSummary | null>>(
        `/api/hackathons/${hackathonResponse.value.data.id}/rank/me`
      )
    : Promise.resolve({
      data: null
    } satisfies HackathonParticipationApiDataResponse<HackathonParticipationRankSummary | null>)
])
const toast = useToast()
const accountHackathonsData = ref(accountHackathonsResponse.data)
const participationData = ref(participationResponse.data)
const isWithdrawApplicationPending = ref(false)
const withdrawApplicationErrorMessage = ref('')
const accessRecord = computed(() => [
  ...accountHackathonsData.value.current,
  ...accountHackathonsData.value.past
].find(record => record.slug === slug.value) ?? null)

const participationRecord = computed<HackathonParticipationRecord | null>(() => {
  const records = [
    ...participationData.value.current,
    ...participationData.value.past
  ]

  return records.find(record => record.hackathon.slug === slug.value) ?? null
})

const hackathon = computed(() => hackathonResponse.value!.data)
const workspaceHackathonId = computed(() => resolveAccountHackathonScopedId({
  accessRecordId: accessRecord.value?.id,
  hackathonId: hackathon.value.id
}))
const prizes = computed(() => prizesResponse.data)
const winners = computed(() => winnersResponse.data)
const participationRank = computed(() => participationRankResponse.data)
const hasPublishedPrizes = computed(() => prizes.value.length > 0)
const canJudge = computed(() =>
  actor.value.kind === 'platform_user'
    ? hasHackathonJudgingAccess(actor.value, hackathon.value.id)
    : false
)
const canAdmin = computed(() => {
  if (actor.value.kind !== 'platform_user') {
    return false
  }

  return hasHackathonAdminAccess(actor.value, hackathon.value.id)
})
const canViewParticipantsAndTeams = computed(() =>
  actor.value.kind === 'platform_user'
    ? hasHackathonParticipantVisibilityAccess(actor.value, hackathon.value.id)
    : false
)

if (!canAccessAccountHackathonWorkspace({
  hasAccessRecord: Boolean(accessRecord.value),
  canJudge: canJudge.value,
  canManage: canAdmin.value,
  canViewParticipantsAndTeams: canViewParticipantsAndTeams.value
})) {
  await navigateTo(`/hackathons/${slug.value}`, {
    redirectCode: 302,
    replace: true
  })
}

const workspaceBackLink = computed(() => getAccountHackathonWorkspaceBackLink({
  canManage: canAdmin.value,
  canViewParticipantsAndTeams: canViewParticipantsAndTeams.value
}))
const applicationStatus = computed(() =>
  participationRecord.value?.application?.status ?? accessRecord.value?.applicationStatus ?? null
)
const canClaimCredits = computed(() => applicationStatus.value === 'approved')
const hasParticipantContext = computed(() =>
  Boolean(applicationStatus.value || participationRecord.value?.activeTeam || participationRecord.value?.latestTeam)
)

const tabAccess = computed(() =>
  getAccountHackathonTabAccess({
    hasApprovedParticipantAccess: applicationStatus.value === 'approved',
    hasPublishedPrizes: hasPublishedPrizes.value,
    hackathonState: hackathon.value.state,
    canJudge: canJudge.value,
    canManage: canAdmin.value,
    canViewParticipantsAndTeams: canViewParticipantsAndTeams.value
  })
)
const availableTabs = computed(() => tabAccess.value.availableTabs)
function buildWorkspaceSectionLocation(nextSection: AccountHackathonWorkspaceTab) {
  const nextQuery = {
    ...route.query
  }

  if (nextSection !== 'teams') {
    delete nextQuery.team
  }

  if (nextSection !== 'judging') {
    delete nextQuery.assignment
  }

  if (nextSection === 'overview') {
    delete nextQuery.tab
  } else {
    nextQuery.tab = nextSection
  }

  return {
    path: route.path,
    query: nextQuery,
    hash: route.hash
  }
}

const visibleTabs = computed(() =>
  availableTabs.value.map(tab => ({
    id: tab,
    label: getAccountHackathonTabLabel(tab, {
      hackathonState: hackathon.value.state
    }),
    to: buildWorkspaceSectionLocation(tab)
  }))
)
const activeSection = computed<AccountHackathonWorkspaceTab>(() =>
  resolveTabQueryValue(route.query.tab, availableTabs.value, 'overview')
)
const selectedTeamSlug = computed(() => normalizeTeamSlugQueryValue(route.query.team))
const selectedJudgeAssignmentId = computed(() => normalizeJudgeAssignmentIdQueryValue(route.query.assignment))
const activeSectionSeo = computed(() => getAccountHackathonSeoContent(activeSection.value, hackathon.value.name))

watchEffect(() => {
  const normalizedTab = normalizeTabQueryValue(route.query.tab)
  const resolvedTab = resolveTabQueryValue(route.query.tab, availableTabs.value, 'overview')

  if (!normalizedTab && resolvedTab === 'overview') {
    return
  }

  if (normalizedTab === resolvedTab) {
    return
  }

  void navigateTo(buildWorkspaceSectionLocation(resolvedTab), { replace: true })
})

onMounted(() => {
  if (!applicationSubmittedNoticeVisible.value || !isParticipantApplicationSubmittedNotice(route.query.notice)) {
    return
  }

  const nextQuery = {
    ...route.query
  }

  delete nextQuery.notice

  void navigateTo({
    path: route.path,
    query: nextQuery,
    hash: route.hash
  }, { replace: true })
})

const teamTabTargetSlug = computed(() =>
  participationRecord.value?.activeTeam?.slug
  ?? accessRecord.value?.team?.slug
  ?? selectedTeamSlug.value
)
const workspaceTabHref = computed(() => `/account/hackathons/${slug.value}?tab=workspace`)
const teamsTabHref = computed(() => buildAccountHackathonTeamsTabHref(slug.value, teamTabTargetSlug.value))
const detailsTabHref = computed(() => `/account/hackathons/${slug.value}?tab=details`)
const applicationSubmittedNoticeVisible = ref(isParticipantApplicationSubmittedNotice(route.query.notice))
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
const participantOutcomeNotice = computed(() =>
  participationRecord.value
    ? getHackathonParticipationOutcomeNotice(participationRecord.value)
    : null
)
const participantRankTeamName = computed(() =>
  participationRecord.value?.activeTeam?.name
  ?? participationRecord.value?.latestTeam?.name
  ?? null
)
const showHeaderApplicationStatusSummary = computed(() =>
  Boolean(applicationStatusSummary.value) && applicationStatus.value !== 'approved'
)
const showOverviewApplicationStatusBanner = computed(() =>
  shouldShowParticipantOverviewStatusBanner(applicationStatus.value, hackathon.value.state)
)
const showApprovedOverviewActions = computed(() =>
  applicationStatus.value === 'approved' && !hasHackathonEnteredSubmissionPhase(hackathon.value)
)
const applicationStatusNoticeTitle = computed(() => {
  switch (applicationStatus.value) {
    case 'submitted':
      return 'Approval pending'
    case 'approved':
      return 'Approved for this hackathon'
    case 'rejected':
      return 'Not approved'
    case 'withdrawn':
      return 'Participation withdrawn'
    default:
      return 'Application status'
  }
})
const applicationStatusNoticeColor = computed(() => {
  if (!applicationStatus.value) {
    return 'neutral'
  }

  if (applicationStatus.value === 'submitted') {
    return 'warning'
  }

  if (applicationStatus.value === 'rejected') {
    return 'error'
  }

  return 'neutral'
})
const withdrawApplicationAvailability = computed(() =>
  getParticipantApplicationWithdrawalAvailability({
    applicationStatus: applicationStatus.value,
    hasActiveTeamMembership: Boolean(participationRecord.value?.activeTeam)
  })
)
const withdrawalDescription = 'If you withdraw, you will no longer be eligible to participate or attend in person through this application.'

const approvedOverviewTeamActionTitle = computed(() =>
  participationRecord.value?.activeTeam ? 'Continue in your workspace' : 'Open your workspace'
)
const approvedOverviewTeamActionDescription = computed(() => {
  const activeTeam = participationRecord.value?.activeTeam

  if (activeTeam) {
    return `You're already on ${activeTeam.name}. Use Workspace to manage your team state and submission in one place.`
  }

  return 'Everyone participates through a team. Workspace is where you confirm solo participation or create a team, while Teams is where you browse the wider directory.'
})
const approvedOverviewDetailsActionDescription = 'Check the schedule, location, and full address before the hackathon starts.'
const showTeamAndSubmissionCards = computed(() => hasHackathonEnteredSubmissionPhase(hackathon.value))
const canViewRestrictedHackathonDetails = computed(() =>
  applicationStatus.value === 'approved'
  || canJudge.value
  || canViewParticipantsAndTeams.value
)

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
function updateAccessRecordApplicationStatus(nextStatus: ParticipantApplicationRecord['status']) {
  const patchRecords = (records: AccountHackathonAccessRecord[]) =>
    records.map(record => record.slug === slug.value
      ? {
          ...record,
          applicationStatus: nextStatus
        }
      : record)

  accountHackathonsData.value = {
    current: patchRecords(accountHackathonsData.value.current),
    past: patchRecords(accountHackathonsData.value.past)
  }
}

function updateParticipationRecordApplication(nextApplication: ParticipantApplicationRecord) {
  const patchRecords = (records: HackathonParticipationRecord[]) =>
    records.map(record => record.hackathon.slug === slug.value
      ? {
          ...record,
          application: {
            id: nextApplication.id,
            status: nextApplication.status,
            submittedAt: nextApplication.submittedAt,
            withdrawnAt: nextApplication.withdrawnAt,
            reviewedAt: nextApplication.reviewedAt,
            updatedAt: nextApplication.updatedAt
          }
        }
      : record)

  participationData.value = {
    current: patchRecords(participationData.value.current),
    past: patchRecords(participationData.value.past)
  }
}

async function withdrawOwnApplication() {
  if (!import.meta.client || !withdrawApplicationAvailability.value.isAllowed || isWithdrawApplicationPending.value) {
    if (!withdrawApplicationAvailability.value.isAllowed) {
      withdrawApplicationErrorMessage.value = withdrawApplicationAvailability.value.reason ?? ''
    }

    return
  }

  const confirmed = window.confirm(
    `Withdraw from this hackathon?\n\n${withdrawalDescription}`
  )

  if (!confirmed) {
    return
  }

  isWithdrawApplicationPending.value = true
  withdrawApplicationErrorMessage.value = ''

  try {
    const response = await $fetch<ParticipantApiDataResponse<ParticipantApplicationRecord>>(
      `/api/hackathons/${hackathon.value.id}/applications/me/actions/withdraw`,
      {
        method: 'POST'
      }
    )

    updateAccessRecordApplicationStatus(response.data.status)
    updateParticipationRecordApplication(response.data)
    applicationSubmittedNoticeVisible.value = false
    toast.add({
      title: 'Participation withdrawn',
      description: 'You are no longer eligible to participate in this hackathon.',
      color: 'success'
    })
  } catch (error) {
    withdrawApplicationErrorMessage.value = normalizeParticipantApiError(error).message
  } finally {
    isWithdrawApplicationPending.value = false
  }
}

useSeoMeta({
  title: () => activeSectionSeo.value.title,
  description: () => activeSectionSeo.value.description
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
                  <HackathonStateBadge
                    :state="hackathon.state"
                    :registration-opens-at="hackathon.registrationOpensAt"
                    :registration-closes-at="hackathon.registrationClosesAt"
                    class="shrink-0"
                  />
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
              v-if="showHeaderApplicationStatusSummary"
              class="text-[14px] text-neutral-600 dark:text-[#A3A3A3]"
            >
              {{ applicationStatusSummary }}
            </p>
          </div>

          <nav
            aria-label="Account hackathon sections"
            role="tablist"
            class="account-hackathon-tab-list flex items-center gap-5 overflow-x-auto"
          >
            <NuxtLink
              v-for="tab in visibleTabs"
              :id="`account-tab-${tab.id}`"
              :key="tab.id"
              :to="tab.to"
              role="tab"
              :aria-selected="activeSection === tab.id"
              :aria-controls="`account-tab-panel-${tab.id}`"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="activeSection === tab.id ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
            >
              {{ tab.label }}
            </NuxtLink>
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
        <AppCard
          v-if="hasParticipantContext"
          class="hackathon-workspace-detail-panel rounded-xl"
        >
          <template #header>
            <div class="space-y-1">
              <p class="text-[20px] font-medium text-highlighted dark:text-white">
                Your participation
              </p>
              <p class="text-[14px] text-neutral-600 dark:text-[#A3A3A3]">
                Track your application, team, and project here as they become available.
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <AppAlert
              v-if="applicationSubmittedNoticeVisible"
              data-testid="account-hackathon-application-submitted-notice"
              color="success"
              variant="soft"
              title="Registration submitted"
              description="Your registration was submitted successfully."
            />

            <AppAlert
              v-if="showOverviewApplicationStatusBanner"
              :color="applicationStatus === 'approved' ? 'success' : applicationStatusNoticeColor"
              variant="soft"
              :title="applicationStatusNoticeTitle"
              :description="applicationStatusSummary"
            />

            <AppAlert
              v-if="withdrawApplicationErrorMessage"
              color="error"
              variant="soft"
              title="Unable to withdraw participation"
              :description="withdrawApplicationErrorMessage"
            />

            <AppAlert
              v-if="participantOutcomeNotice"
              :color="participantOutcomeNotice.color"
              variant="soft"
              :title="participantOutcomeNotice.title"
              :description="participantOutcomeNotice.description"
            />

            <AccountHackathonParticipationRankNotice
              :hackathon-state="hackathon.state"
              :team-name="participantRankTeamName"
              :rank-summary="participationRank"
            />

            <template v-if="applicationStatus === 'approved'">
              <section
                v-if="showApprovedOverviewActions"
                class="grid gap-4 lg:grid-cols-2"
              >
                <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
                  <div class="flex h-full flex-col gap-4">
                    <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
                      <h2 class="text-lg font-semibold text-highlighted dark:text-white">
                        {{ approvedOverviewTeamActionTitle }}
                      </h2>
                      <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                        {{ approvedOverviewTeamActionDescription }}
                      </p>
                    </div>

                    <div>
                      <AppButton
                        :to="workspaceTabHref"
                        color="neutral"
                        variant="solid"
                        trailing-icon="i-lucide-arrow-up-right"
                        class="rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                      >
                        Open Workspace
                      </AppButton>
                    </div>
                  </div>
                </div>

                <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
                  <div class="flex h-full flex-col gap-4">
                    <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
                      <h2 class="text-lg font-semibold text-highlighted dark:text-white">
                        Review the event details
                      </h2>
                      <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                        {{ approvedOverviewDetailsActionDescription }}
                      </p>
                    </div>

                    <div>
                      <AppButton
                        :to="detailsTabHref"
                        color="neutral"
                        variant="solid"
                        trailing-icon="i-lucide-arrow-up-right"
                        class="rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                      >
                        Open Details
                      </AppButton>
                    </div>
                  </div>
                </div>
              </section>

              <section
                v-if="showTeamAndSubmissionCards"
                class="grid gap-4 lg:grid-cols-2"
              >
                <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
                  <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                    Workspace
                  </h2>

                  <template v-if="participationRecord?.activeTeam">
                    <p class="mt-2 text-sm text-neutral-600 dark:text-[#A3A3A3]">
                      Current team: <span class="font-semibold text-highlighted dark:text-white">{{ participationRecord.activeTeam.name }}</span>
                    </p>
                    <p class="mt-2 text-sm text-neutral-600 dark:text-[#A3A3A3]">
                      Role: {{ participationRecord.activeTeam.membershipRole }} • {{ participationRecord.activeTeam.activeMemberCount }} active members
                    </p>

                    <AppButton
                      :to="workspaceTabHref"
                      color="neutral"
                      variant="solid"
                      trailing-icon="i-lucide-arrow-up-right"
                      class="mt-4 rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                    >
                      Go to Workspace
                    </AppButton>
                  </template>

                  <template v-else>
                    <p class="mt-2 text-sm text-neutral-600 dark:text-[#A3A3A3]">
                      You are approved for this hackathon, but you do not have an active team yet.
                    </p>

                    <AppButton
                      :to="workspaceTabHref"
                      color="neutral"
                      variant="solid"
                      trailing-icon="i-lucide-arrow-up-right"
                      class="mt-4 rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                    >
                      Go to Workspace
                    </AppButton>
                  </template>
                </div>

                <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
                  <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                    Teams
                  </h2>

                  <p class="mt-3 text-sm text-neutral-600 dark:text-[#A3A3A3]">
                    Browse every active team in the hackathon, including solo and multi-person teams.
                  </p>
                  <p class="mt-2 text-sm text-neutral-600 dark:text-[#A3A3A3]">
                    Join actions appear there only when a team is open to new members and team formation is still open.
                  </p>

                  <AppButton
                    :to="teamsTabHref"
                    color="neutral"
                    variant="solid"
                    trailing-icon="i-lucide-arrow-up-right"
                    class="mt-4 rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                  >
                    Open Teams
                  </AppButton>
                </div>
              </section>
            </template>

            <section
              v-if="applicationStatus === 'submitted' || applicationStatus === 'approved'"
              class="rounded-xl hackathon-workspace-detail-inset px-5 py-5"
            >
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div class="space-y-2">
                  <p class="text-sm font-semibold text-highlighted dark:text-white">
                    Withdraw from this hackathon
                  </p>
                  <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                    {{ withdrawalDescription }}
                  </p>
                  <p
                    v-if="!withdrawApplicationAvailability.isAllowed && withdrawApplicationAvailability.reason"
                    class="text-sm text-neutral-600 dark:text-[#A3A3A3]"
                  >
                    {{ withdrawApplicationAvailability.reason }}
                  </p>
                </div>

                <AppButton
                  color="error"
                  variant="soft"
                  :loading="isWithdrawApplicationPending"
                  :disabled="!withdrawApplicationAvailability.isAllowed || isWithdrawApplicationPending"
                  @click="withdrawOwnApplication"
                >
                  Withdraw participation
                </AppButton>
              </div>
            </section>
          </div>
        </AppCard>

        <HackathonOverviewPanel :description="hackathon.description" />
      </section>

      <section
        v-else-if="activeSection === 'credits'"
        id="account-tab-panel-credits"
        role="tabpanel"
        aria-labelledby="account-tab-credits"
        class="space-y-8"
      >
        <AccountHackathonCreditsPanel
          :hackathon-id="hackathon.id"
          :can-manage="canAdmin"
          :can-claim="canClaimCredits"
        />
      </section>

      <section
        v-else-if="activeSection === 'workspace'"
        id="account-tab-panel-workspace"
        role="tabpanel"
        aria-labelledby="account-tab-workspace"
        class="space-y-8"
      >
        <AccountHackathonParticipantWorkspacePanel
          :hackathon="hackathon"
          :application-status="applicationStatus"
          :initial-submission="participationRecord?.latestSubmission ?? null"
          :participation-outcome="participationRecord?.outcome ?? null"
          :participation-rank="participationRank"
        />
      </section>

      <section
        v-else-if="activeSection === 'prizes'"
        id="account-tab-panel-prizes"
        role="tabpanel"
        aria-labelledby="account-tab-prizes"
        class="space-y-8"
      >
        <HackathonWinnersShowcase
          v-if="hackathon.state === 'completed'"
          :winners="winners"
        />

        <HackathonPrizeList
          v-else
          :prizes="prizes"
        />

        <AccountHackathonAdminSettingsPanel
          v-if="tabAccess.showPrizeConfiguration"
          :slug="slug"
          :show-program-settings="false"
          :show-terms-management="false"
          :show-criteria-configuration="false"
          :show-prize-configuration="true"
        />
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
          :discord-server-url="hackathon.discordServerUrl ?? null"
          :show-address="canViewRestrictedHackathonDetails"
        />

        <HackathonTracksPanel :tracks="hackathon.tracks ?? []" />

        <HackathonAgendaPanel :agenda-items="hackathon.agendaItems" />

        <AccountHackathonAdminSettingsPanel
          v-if="tabAccess.showAgendaConfigurationInDetails"
          :slug="slug"
          program-settings-mode="details"
          :show-terms-management="false"
          :show-criteria-configuration="false"
          :show-prize-configuration="false"
        />
      </section>

      <section
        v-else-if="activeSection === 'judges'"
        id="account-tab-panel-judges"
        role="tabpanel"
        aria-labelledby="account-tab-judges"
        class="space-y-8"
      >
        <AccountHackathonPublishedRosterPanel
          :hackathon-id="workspaceHackathonId"
          :roster="publishedJudgesRoster"
          role="judge"
          title="Judges"
          description="Meet the people reviewing submissions for this hackathon."
          :management-hackathon-id="canAdmin ? workspaceHackathonId : null"
        />
      </section>

      <section
        v-else-if="activeSection === 'staff'"
        id="account-tab-panel-staff"
        role="tabpanel"
        aria-labelledby="account-tab-staff"
        class="space-y-8"
      >
        <AccountHackathonPublishedRosterPanel
          :hackathon-id="workspaceHackathonId"
          :roster="publishedStaffRoster"
          role="staff"
          title="Staff"
          description="Meet the people supporting this hackathon behind the scenes."
          :management-hackathon-id="canAdmin ? workspaceHackathonId : null"
        />

        <AccountHackathonRoleRosterPanel
          v-if="canAdmin"
          :hackathon-id="workspaceHackathonId"
          role="admin"
          title="Admins"
          description="Admins can manage the internal workspace for this hackathon. Promoting a judge or staff member keeps their current capability on the admin assignment."
          empty-assigned-message="No admins yet. Add an admin here when someone needs full hackathon management access."
        />
      </section>

      <section
        v-else-if="activeSection === 'judging'"
        id="account-tab-panel-judging"
        role="tabpanel"
        aria-labelledby="account-tab-judging"
      >
        <AccountHackathonJudgePanel
          :hackathon-id="workspaceHackathonId"
          :slug="slug"
          :selected-assignment-id="selectedJudgeAssignmentId"
        />
      </section>

      <section
        v-else-if="activeSection === 'participants'"
        id="account-tab-panel-participants"
        role="tabpanel"
        aria-labelledby="account-tab-participants"
        class="space-y-8"
      >
        <AccountHackathonAdminOperationsPanel
          v-if="canAdmin"
          :slug="slug"
          section="participants"
        />

        <AccountHackathonParticipantVisibilityPanel
          v-else-if="canViewParticipantsAndTeams"
          :hackathon-id="workspaceHackathonId"
        />
      </section>

      <section
        v-else-if="activeSection === 'teams'"
        id="account-tab-panel-teams"
        role="tabpanel"
        aria-labelledby="account-tab-teams"
        class="space-y-8"
      >
        <AccountHackathonParticipantTeamPanel
          :hackathon="hackathon"
          :selected-team-slug="selectedTeamSlug"
          :show-operational-team-states="canViewParticipantsAndTeams || canAdmin"
        />
      </section>

      <section
        v-else-if="activeSection === 'submissions'"
        id="account-tab-panel-submissions"
        role="tabpanel"
        aria-labelledby="account-tab-submissions"
        class="space-y-8"
      >
        <AccountHackathonAdminOperationsPanel
          :slug="slug"
          section="submissions"
        />
      </section>

      <section
        v-else-if="activeSection === 'operations'"
        id="account-tab-panel-operations"
        role="tabpanel"
        aria-labelledby="account-tab-operations"
        class="space-y-8"
      >
        <AccountHackathonAdminOperationsPanel
          :slug="slug"
          section="operations"
        />
      </section>

      <section
        v-else
        id="account-tab-panel-settings"
        role="tabpanel"
        aria-labelledby="account-tab-settings"
      >
        <AccountHackathonAdminSettingsPanel
          :slug="slug"
          program-settings-mode="settings"
          :show-terms-management="true"
          :show-criteria-configuration="true"
          :show-prize-configuration="false"
        />
      </section>
    </AppContainer>
  </div>
</template>
