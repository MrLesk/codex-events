<script setup lang="ts">
import type {
  PublicApiDataResponse,
  PublicApiListResponse,
  PublicEvent,
  PublicPrize
} from '~/domains/events/presentation'
import {
  formatEventLocation,
  formatEventWindow,
  formatMaxTeamMembers
} from '~/domains/events/presentation'
import type {
  EventParticipationApiDataResponse,
  EventParticipationRankSummary,
  EventParticipationPayload,
  EventParticipationRecord
} from '~/domains/events/participation'
import type {
  ParticipantApiDataResponse,
  ParticipantApplicationRecord
} from '~/domains/applications/participant-application'
import type {
  PublishedProjectEntry,
  WinnerEntry
} from '~/domains/outcomes/published-outcomes'
import type { Ref } from 'vue'

import {
  LazyAccountEventsAccountEventAdminOperationsPanel as LazyAccountEventAdminOperationsPanel,
  LazyAccountEventsAccountEventAdminSettingsPanel as LazyAccountEventAdminSettingsPanel,
  LazyAccountEventsAccountEventCreditsPanel as LazyAccountEventCreditsPanel,
  LazyAccountEventsAccountEventFeedbackPanel as LazyAccountEventFeedbackPanel,
  LazyAccountEventsAccountEventGalleryPanel as LazyAccountEventGalleryPanel,
  LazyAccountEventsAccountEventJudgePanel as LazyAccountEventJudgePanel,
  LazyAccountEventsAccountEventParticipantTeamPanel as LazyAccountEventParticipantTeamPanel,
  LazyAccountEventsAccountEventParticipantVisibilityPanel as LazyAccountEventParticipantVisibilityPanel,
  LazyAccountEventsAccountEventParticipantWorkspacePanel as LazyAccountEventParticipantWorkspacePanel,
  LazyAccountEventsAccountEventPublishedRosterPanel as LazyAccountEventPublishedRosterPanel,
  LazyAccountEventsAccountEventRoleRosterPanel as LazyAccountEventRoleRosterPanel,
  LazyPublicEventsEventAgendaPanel as LazyEventAgendaPanel,
  LazyPublicEventsEventPrizeList as LazyEventPrizeList,
  LazyPublicEventsEventPublishedProjectsShowcase as LazyEventPublishedProjectsShowcase,
  LazyPublicEventsEventTimeline as LazyEventTimeline,
  LazyPublicEventsEventTracksPanel as LazyEventTracksPanel,
  LazyPublicEventsEventWinnersShowcase as LazyEventWinnersShowcase
} from '#components'
import AccountEventParticipationRankNotice from '~/components/account/events/AccountEventParticipationRankNotice.vue'
import EventOverviewPanel from '~/components/public/events/EventOverviewPanel.vue'
import EventStateBadge from '~/components/public/events/EventStateBadge.vue'
import {
  hasEventAdminAccess,
  hasEventJudgingAccess,
  hasEventParticipantVisibilityAccess
} from '~/domains/events/access'
import {
  canAccessAccountEventWorkspace,
  getAccountEventWorkspaceBackLink,
  getAccountEventTabAccess,
  getAccountEventTabLabel,
  resolveAccountEventScopedId,
  type AccountEventWorkspaceTab
} from '~/domains/events/account-workspace-tabs'
import { getAccountEventSeoContent } from '~/domains/events/account-workspace-seo'
import {
  createEmptyPublishedEventRosterLoadState,
  loadPublishedEventRoster,
  type PublishedEventRosterLoadState,
  type PublishedEventRosterMember
} from '~/domains/events/published-roster'
import { getEventParticipationOutcomeNotice } from '~/domains/events/participation'
import {
  formatParticipantApplicationStatus,
  getParticipantApplicationSubmittedNoticeContent,
  getParticipantApplicationWithdrawalAvailability,
  getParticipantApplicationStatusColor,
  isParticipantApplicationSubmittedNotice,
  normalizeParticipantApiError,
  shouldShowParticipantOverviewStatusBanner,
  summarizeParticipantApplicationStatus
} from '~/domains/applications/participant-application'
import {
  hasEventEnteredSubmissionPhase
} from '~/domains/submissions/team-submission'
import { normalizeJudgeAssignmentIdQueryValue } from '~/domains/judging/query'
import { buildAccountEventTeamsTabHref, normalizeTeamSlugQueryValue } from '~/domains/teams/query'
import { normalizeTabQueryValue, resolveTabQueryValue } from '~/lib/query-values'

definePageMeta({
  middleware: ['require-platform-account']
})

interface AccountEventAccessRecord {
  id: string
  eventType: PublicEvent['eventType']
  slug: string
  name: string
  description: string
  state: PublicEvent['state']
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
  roles: Array<'event_admin' | 'judge' | 'staff'>
}

interface AccountEventsResponse {
  data: {
    current: AccountEventAccessRecord[]
    past: AccountEventAccessRecord[]
  }
}

interface RefreshableAsyncRequest {
  status: Ref<string>
  refresh: () => Promise<unknown>
}

type AccountWorkspaceEvent = Omit<PublicEvent, 'tracks'> & {
  id: string
  hasGallery?: boolean
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

function refreshWhenEnabled(request: RefreshableAsyncRequest, enabled: Ref<boolean>) {
  watch(enabled, async (isEnabled) => {
    if (!isEnabled || request.status.value !== 'idle') {
      return
    }

    await request.refresh()
  })
}

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())
const { actor } = useAccountLifecycleActor()

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Event not found.'
  })
}

const {
  data: eventResponse,
  error: eventError
} = await useFetch<PublicApiDataResponse<AccountWorkspaceEvent>>(() => `/api/events/slug/${slug.value}`, {
  key: () => `account-event-detail:${slug.value}`
})

if (eventError.value) {
  throw createError({
    statusCode: eventError.value.statusCode ?? eventError.value.status ?? 500,
    statusMessage: eventError.value.statusMessage ?? 'Unable to load the requested event.'
  })
}

if (!eventResponse.value?.data) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Event not found.'
  })
}

const requestFetch = import.meta.server ? useRequestFetch() : $fetch
const initialEvent = eventResponse.value.data
const [
  prizesResponse,
  accountEventsResponse,
  participationResponse
] = await Promise.all([
  initialEvent.eventType === 'hackathon'
    ? requestFetch<PublicApiListResponse<AccountPrizeSummary>>(`/api/events/${initialEvent.id}/prizes`)
    : Promise.resolve({ data: [] }),
  requestFetch<AccountEventsResponse>('/api/account/events'),
  requestFetch<EventParticipationApiDataResponse<EventParticipationPayload>>('/api/events/participation')
])
const toast = useToast()
const accountEventsData = ref(accountEventsResponse.data)
const participationData = ref(participationResponse.data)
const isWithdrawApplicationPending = ref(false)
const withdrawApplicationErrorMessage = ref('')
const accessRecord = computed(() => [
  ...accountEventsData.value.current,
  ...accountEventsData.value.past
].find(record => record.slug === slug.value) ?? null)

const participationRecord = computed<EventParticipationRecord | null>(() => {
  const records = [
    ...participationData.value.current,
    ...participationData.value.past
  ]

  return records.find(record => record.event.slug === slug.value) ?? null
})

const event = computed(() => eventResponse.value!.data)
const isCompetitionEvent = computed(() => event.value.eventType === 'hackathon')
const workspaceEventId = computed(() => resolveAccountEventScopedId({
  accessRecordId: accessRecord.value?.id,
  eventId: event.value.id
}))
const prizes = computed(() => prizesResponse.data)
const hasPublishedPrizes = computed(() => prizes.value.length > 0)
const canJudge = computed(() =>
  actor.value.kind === 'platform_user'
    ? hasEventJudgingAccess(actor.value, event.value.id)
    : false
)
const canAdmin = computed(() => {
  if (actor.value.kind !== 'platform_user') {
    return false
  }

  return hasEventAdminAccess(actor.value, event.value.id)
})
const canViewParticipantsAndTeams = computed(() =>
  actor.value.kind === 'platform_user'
    ? hasEventParticipantVisibilityAccess(actor.value, event.value.id)
    : false
)

if (!canAccessAccountEventWorkspace({
  hasAccessRecord: Boolean(accessRecord.value),
  canJudge: canJudge.value,
  canManage: canAdmin.value,
  canViewParticipantsAndTeams: canViewParticipantsAndTeams.value
})) {
  await navigateTo(`/events/${slug.value}`, {
    redirectCode: 302,
    replace: true
  })
}

const workspaceBackLink = computed(() => getAccountEventWorkspaceBackLink({
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
const shouldLoadPublishedStaffRoster = computed(() => actor.value.kind === 'platform_user')
const publishedStaffRosterRequest = await useApiData<PublishedEventRosterLoadState>(
  () => `account-event-staff:${workspaceEventId.value}`,
  async ({ apiFetch, signal }) => {
    if (!shouldLoadPublishedStaffRoster.value) {
      return createEmptyPublishedEventRosterLoadState()
    }

    return await loadPublishedEventRoster(
      path => apiFetch<PublicApiListResponse<PublishedEventRosterMember>>(path, { signal }),
      {
        eventId: workspaceEventId.value,
        role: 'staff'
      }
    )
  },
  {
    default: createEmptyPublishedEventRosterLoadState,
    immediate: shouldLoadPublishedStaffRoster.value
  }
)
const publishedStaffRoster = computed(() =>
  publishedStaffRosterRequest.data.value ?? createEmptyPublishedEventRosterLoadState()
)

const tabAccess = computed(() =>
  getAccountEventTabAccess({
    hasApprovedParticipantAccess: applicationStatus.value === 'approved',
    hasGallery: Boolean(event.value.hasGallery),
    hasPublishedPrizes: hasPublishedPrizes.value,
    hasPublishedStaff: publishedStaffRoster.value.members.length > 0,
    eventType: event.value.eventType,
    eventState: event.value.state,
    canJudge: canJudge.value,
    canManage: canAdmin.value,
    canViewParticipantsAndTeams: canViewParticipantsAndTeams.value
  })
)
const availableTabs = computed(() => tabAccess.value.availableTabs)
function buildWorkspaceSectionLocation(nextSection: AccountEventWorkspaceTab) {
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
    label: getAccountEventTabLabel(tab, {
      eventState: event.value.state
    }),
    to: buildWorkspaceSectionLocation(tab)
  }))
)
const activeSection = computed<AccountEventWorkspaceTab>(() =>
  resolveTabQueryValue(route.query.tab, availableTabs.value, 'overview')
)
const shouldLoadPublishedJudgesRoster = computed(() =>
  actor.value.kind === 'platform_user' && activeSection.value === 'judges'
)
const shouldLoadCompletedPrizesData = computed(() =>
  isCompetitionEvent.value && event.value.state === 'completed' && activeSection.value === 'prizes'
)
const shouldLoadParticipationRank = computed(() =>
  actor.value.kind === 'platform_user'
  && isCompetitionEvent.value
  && event.value.state === 'completed'
  && (activeSection.value === 'overview' || activeSection.value === 'workspace')
)
const [
  publishedJudgesRosterRequest,
  winnersRequest,
  publishedProjectsRequest,
  participationRankRequest
] = await Promise.all([
  useApiData<PublishedEventRosterLoadState>(
    () => `account-event-judges:${workspaceEventId.value}`,
    async ({ apiFetch, signal }) => {
      if (!shouldLoadPublishedJudgesRoster.value) {
        return createEmptyPublishedEventRosterLoadState()
      }

      return await loadPublishedEventRoster(
        path => apiFetch<PublicApiListResponse<PublishedEventRosterMember>>(path, { signal }),
        {
          eventId: workspaceEventId.value,
          role: 'judge'
        }
      )
    },
    {
      default: createEmptyPublishedEventRosterLoadState,
      immediate: shouldLoadPublishedJudgesRoster.value
    }
  ),
  useApiData<WinnerEntry[]>(
    () => `account-event-winners:${workspaceEventId.value}`,
    async ({ apiFetch, signal }) => {
      if (!shouldLoadCompletedPrizesData.value) {
        return []
      }

      const response = await apiFetch<PublicApiListResponse<WinnerEntry>>(
        `/api/events/${workspaceEventId.value}/winners`,
        { signal }
      )

      return response.data
    },
    {
      default: () => [],
      immediate: shouldLoadCompletedPrizesData.value
    }
  ),
  useApiData<PublishedProjectEntry[]>(
    () => `account-event-published-projects:${workspaceEventId.value}`,
    async ({ apiFetch, signal }) => {
      if (!shouldLoadCompletedPrizesData.value) {
        return []
      }

      const response = await apiFetch<PublicApiListResponse<PublishedProjectEntry>>(
        `/api/events/${workspaceEventId.value}/published-projects`,
        { signal }
      )

      return response.data
    },
    {
      default: () => [],
      immediate: shouldLoadCompletedPrizesData.value
    }
  ),
  useApiData<EventParticipationRankSummary | null>(
    () => `account-event-participation-rank:${workspaceEventId.value}`,
    async ({ apiFetch, signal }) => {
      if (!shouldLoadParticipationRank.value) {
        return null
      }

      const response = await apiFetch<EventParticipationApiDataResponse<EventParticipationRankSummary | null>>(
        `/api/events/${workspaceEventId.value}/rank/me`,
        { signal }
      )

      return response.data
    },
    {
      default: () => null,
      immediate: shouldLoadParticipationRank.value
    }
  )
])
refreshWhenEnabled(publishedJudgesRosterRequest, shouldLoadPublishedJudgesRoster)
refreshWhenEnabled(publishedStaffRosterRequest, shouldLoadPublishedStaffRoster)
refreshWhenEnabled(winnersRequest, shouldLoadCompletedPrizesData)
refreshWhenEnabled(publishedProjectsRequest, shouldLoadCompletedPrizesData)
refreshWhenEnabled(participationRankRequest, shouldLoadParticipationRank)
const publishedJudgesRoster = computed(() =>
  publishedJudgesRosterRequest.data.value ?? createEmptyPublishedEventRosterLoadState()
)
const winners = computed(() => winnersRequest.data.value ?? [])
const publishedProjects = computed(() => publishedProjectsRequest.data.value ?? [])
const participationRank = computed(() => participationRankRequest.data.value ?? null)
const accountTabListRef = ref<HTMLElement | null>(null)
const selectedTeamSlug = computed(() => normalizeTeamSlugQueryValue(route.query.team))
const selectedJudgeAssignmentId = computed(() => normalizeJudgeAssignmentIdQueryValue(route.query.assignment))
const activeSectionSeo = computed(() => getAccountEventSeoContent(activeSection.value, event.value.name))

function scrollActiveTabIntoView() {
  if (!import.meta.client) {
    return
  }

  void nextTick(() => {
    const activeTabElement = accountTabListRef.value?.querySelector<HTMLElement>(
      `#account-tab-${activeSection.value}`
    )

    activeTabElement?.scrollIntoView({
      block: 'nearest',
      inline: 'center'
    })
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

  void navigateTo(buildWorkspaceSectionLocation(resolvedTab), { replace: true })
})

watch(activeSection, () => {
  scrollActiveTabIntoView()
}, {
  flush: 'post'
})

onMounted(() => {
  scrollActiveTabIntoView()

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
const workspaceTabHref = computed(() => `/account/events/${slug.value}?tab=workspace`)
const teamsTabHref = computed(() => buildAccountEventTeamsTabHref(slug.value, teamTabTargetSlug.value))
const detailsTabHref = computed(() => `/account/events/${slug.value}?tab=details`)
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
    ? summarizeParticipantApplicationStatus(applicationStatus.value, event.value.state, event.value.eventType)
    : ''
)
const applicationSubmittedNoticeContent = computed(() =>
  getParticipantApplicationSubmittedNoticeContent({
    applicationStatus: applicationStatus.value,
    eventType: event.value.eventType,
    autoApproveApplications: event.value.autoApproveApplications
  })
)
const participantOutcomeNotice = computed(() =>
  participationRecord.value
    ? getEventParticipationOutcomeNotice(participationRecord.value)
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
  shouldShowParticipantOverviewStatusBanner(applicationStatus.value)
)
const showApprovedOverviewActions = computed(() =>
  applicationStatus.value === 'approved' && isCompetitionEvent.value && !hasEventEnteredSubmissionPhase(event.value)
)
const participationOverviewDescription = computed(() =>
  isCompetitionEvent.value
    ? 'Track your application, team, and project here as they become available.'
    : 'Track your application and event participation here as they become available.'
)
const applicationStatusNoticeTitle = computed(() => {
  switch (applicationStatus.value) {
    case 'submitted':
      return 'Approval pending'
    case 'approved':
      return 'Approved for this event'
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
const approvedOverviewDetailsActionDescription = 'Check the schedule, location, and full address before the event starts.'
const showTeamAndSubmissionCards = computed(() => isCompetitionEvent.value && hasEventEnteredSubmissionPhase(event.value))
const canViewRestrictedEventDetails = computed(() =>
  applicationStatus.value === 'approved'
  || canJudge.value
  || canViewParticipantsAndTeams.value
)

const detailBackgroundImageUrl = computed(() => {
  const backgroundImageUrl = event.value.backgroundImageUrl?.trim()

  if (backgroundImageUrl) {
    return backgroundImageUrl
  }

  const bannerImageUrl = event.value.bannerImageUrl?.trim()
  return bannerImageUrl || null
})
const detailBackgroundImageStyle = computed(() => detailBackgroundImageUrl.value
  ? { backgroundImage: `url(${JSON.stringify(detailBackgroundImageUrl.value)})` }
  : undefined)
const detailSummary = computed(() => [
  formatEventWindow(
    event.value.registrationOpensAt,
    isCompetitionEvent.value ? event.value.submissionClosesAt : event.value.registrationClosesAt
  ),
  formatEventLocation(event.value),
  isCompetitionEvent.value ? formatMaxTeamMembers(event.value.maxTeamMembers) : null
].filter(Boolean).join(' • '))
function updateAccessRecordApplicationStatus(nextStatus: ParticipantApplicationRecord['status']) {
  const patchRecords = (records: AccountEventAccessRecord[]) =>
    records.map(record => record.slug === slug.value
      ? {
          ...record,
          applicationStatus: nextStatus
        }
      : record)

  accountEventsData.value = {
    current: patchRecords(accountEventsData.value.current),
    past: patchRecords(accountEventsData.value.past)
  }
}

function updateParticipationRecordApplication(nextApplication: ParticipantApplicationRecord) {
  const patchRecords = (records: EventParticipationRecord[]) =>
    records.map(record => record.event.slug === slug.value
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
    `Withdraw from this event?\n\n${withdrawalDescription}`
  )

  if (!confirmed) {
    return
  }

  isWithdrawApplicationPending.value = true
  withdrawApplicationErrorMessage.value = ''

  try {
    const response = await $fetch<ParticipantApiDataResponse<ParticipantApplicationRecord>>(
      `/api/events/${event.value.id}/applications/me/actions/withdraw`,
      {
        method: 'POST'
      }
    )

    updateAccessRecordApplicationStatus(response.data.status)
    updateParticipationRecordApplication(response.data)
    applicationSubmittedNoticeVisible.value = false
    toast.add({
      title: 'Participation withdrawn',
      description: 'You are no longer eligible to participate in this event.',
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
        class="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat opacity-55 blur-md saturate-125 contrast-105"
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
                    {{ event.name }}
                  </h1>
                  <EventStateBadge
                    :state="event.state"
                    :registration-opens-at="event.registrationOpensAt"
                    :registration-closes-at="event.registrationClosesAt"
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
            ref="accountTabListRef"
            aria-label="Account event sections"
            role="tablist"
            class="account-event-tab-list flex items-center gap-5 overflow-x-auto"
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
        <EventOverviewPanel :description="event.description" />

        <AppCard
          v-if="hasParticipantContext"
          class="!border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60 rounded-xl"
        >
          <template #header>
            <div class="space-y-1">
              <p class="text-[20px] font-medium text-highlighted dark:text-white">
                Your participation
              </p>
              <p class="text-[14px] text-neutral-600 dark:text-[#A3A3A3]">
                {{ participationOverviewDescription }}
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <AppAlert
              v-if="applicationSubmittedNoticeVisible"
              data-testid="account-event-application-submitted-notice"
              color="success"
              variant="soft"
              :title="applicationSubmittedNoticeContent.title"
              :description="applicationSubmittedNoticeContent.description"
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

            <AccountEventParticipationRankNotice
              :event-state="event.state"
              :team-name="participantRankTeamName"
              :rank-summary="participationRank"
            />

            <template v-if="applicationStatus === 'approved'">
              <section
                v-if="showApprovedOverviewActions"
                class="grid gap-4 lg:grid-cols-2"
              >
                <div class="rounded-xl !border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 px-5 py-5">
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

                <div class="rounded-xl !border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 px-5 py-5">
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
                <div class="rounded-xl !border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 px-5 py-5">
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
                      You are approved for this event, but you do not have an active team yet.
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

                <div class="rounded-xl !border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 px-5 py-5">
                  <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                    Teams
                  </h2>

                  <p class="mt-3 text-sm text-neutral-600 dark:text-[#A3A3A3]">
                    Browse every active team in the event, including solo and multi-person teams.
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
              class="rounded-xl !border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 px-5 py-5"
            >
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div class="space-y-2">
                  <p class="text-sm font-semibold text-highlighted dark:text-white">
                    Withdraw from this event
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
      </section>

      <section
        v-else-if="activeSection === 'credits'"
        id="account-tab-panel-credits"
        role="tabpanel"
        aria-labelledby="account-tab-credits"
        class="space-y-8"
      >
        <LazyAccountEventCreditsPanel
          :event-id="event.id"
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
        <LazyAccountEventParticipantWorkspacePanel
          :event="event"
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
        <template v-if="event.state === 'completed'">
          <LazyEventWinnersShowcase :winners="winners" />

          <LazyEventPublishedProjectsShowcase
            v-if="publishedProjects.length > 0"
            :projects="publishedProjects"
          />
        </template>

        <LazyEventPrizeList
          v-else
          :prizes="prizes"
        />

        <LazyAccountEventAdminSettingsPanel
          v-if="tabAccess.showPrizeConfiguration"
          :event-id="workspaceEventId"
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
        <LazyEventTimeline
          :event="event"
          :discord-server-url="event.discordServerUrl ?? null"
          :show-address="canViewRestrictedEventDetails"
        />

        <LazyEventTracksPanel
          v-if="isCompetitionEvent"
          :tracks="event.tracks ?? []"
        />

        <LazyEventAgendaPanel :agenda-items="event.agendaItems" />

        <LazyAccountEventAdminSettingsPanel
          v-if="tabAccess.showAgendaConfigurationInDetails"
          :event-id="workspaceEventId"
          program-settings-mode="details"
          :show-terms-management="false"
          :show-criteria-configuration="false"
          :show-prize-configuration="false"
        />
      </section>

      <section
        v-else-if="activeSection === 'gallery'"
        id="account-tab-panel-gallery"
        role="tabpanel"
        aria-labelledby="account-tab-gallery"
        class="space-y-8"
      >
        <LazyAccountEventGalleryPanel
          :event-id="workspaceEventId"
          :can-manage="canAdmin || canJudge || canViewParticipantsAndTeams"
        />
      </section>

      <section
        v-else-if="activeSection === 'judges'"
        id="account-tab-panel-judges"
        role="tabpanel"
        aria-labelledby="account-tab-judges"
        class="space-y-8"
      >
        <LazyAccountEventPublishedRosterPanel
          :event-id="workspaceEventId"
          :roster="publishedJudgesRoster"
          role="judge"
          title="Judges"
          description="Meet the people reviewing submissions for this event."
          :management-event-id="canAdmin ? workspaceEventId : null"
        />
      </section>

      <section
        v-else-if="activeSection === 'staff'"
        id="account-tab-panel-staff"
        role="tabpanel"
        aria-labelledby="account-tab-staff"
        class="space-y-8"
      >
        <LazyAccountEventPublishedRosterPanel
          :event-id="workspaceEventId"
          :roster="publishedStaffRoster"
          role="staff"
          title="Staff"
          description="Meet the people supporting this event behind the scenes."
          :management-event-id="canAdmin ? workspaceEventId : null"
        />

        <LazyAccountEventRoleRosterPanel
          v-if="canAdmin"
          :event-id="workspaceEventId"
          role="admin"
          title="Admins"
          description="Admins can manage the internal workspace for this event. Promoting a judge or staff member keeps their current capability on the admin assignment."
          empty-assigned-message="No admins yet. Add an admin here when someone needs full event management access."
        />
      </section>

      <section
        v-else-if="activeSection === 'feedback'"
        id="account-tab-panel-feedback"
        role="tabpanel"
        aria-labelledby="account-tab-feedback"
        class="space-y-8"
      >
        <LazyAccountEventFeedbackPanel
          :event-id="workspaceEventId"
          :event-state="event.state"
        />
      </section>

      <section
        v-else-if="activeSection === 'judging'"
        id="account-tab-panel-judging"
        role="tabpanel"
        aria-labelledby="account-tab-judging"
      >
        <LazyAccountEventJudgePanel
          :event-id="workspaceEventId"
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
        <LazyAccountEventAdminOperationsPanel
          v-if="canAdmin"
          :event-id="workspaceEventId"
          section="participants"
        />

        <LazyAccountEventParticipantVisibilityPanel
          v-else-if="canViewParticipantsAndTeams"
          :event-id="workspaceEventId"
        />
      </section>

      <section
        v-else-if="activeSection === 'teams'"
        id="account-tab-panel-teams"
        role="tabpanel"
        aria-labelledby="account-tab-teams"
        class="space-y-8"
      >
        <LazyAccountEventParticipantTeamPanel
          :event="event"
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
        <LazyAccountEventAdminOperationsPanel
          :event-id="workspaceEventId"
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
        <LazyAccountEventAdminOperationsPanel
          :event-id="workspaceEventId"
          section="operations"
        />
      </section>

      <section
        v-else
        id="account-tab-panel-settings"
        role="tabpanel"
        aria-labelledby="account-tab-settings"
      >
        <LazyAccountEventAdminSettingsPanel
          :event-id="workspaceEventId"
          program-settings-mode="settings"
          :show-terms-management="true"
          :show-criteria-configuration="true"
          :show-prize-configuration="false"
        />
      </section>
    </AppContainer>
  </div>
</template>
