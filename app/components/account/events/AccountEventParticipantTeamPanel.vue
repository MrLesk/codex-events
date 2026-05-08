<script setup lang="ts">
import type { PublicEvent } from '~/domains/events/presentation'
import type {
  TeamActionAvailability,
  TeamDirectoryEntry
} from '~/domains/teams/workspace'

import {
  LazyTeamsParticipantTeamDirectoryPanel as LazyParticipantTeamDirectoryPanel,
  LazyTeamsParticipantTeamWorkspacePanel as LazyParticipantTeamWorkspacePanel
} from '#components'
import {
  buildAbsoluteAccountEventTeamsTabHref,
  buildAccountEventTeamsTabHref,
  buildAccountEventWorkspaceTabHref,
  isSharedTeamSelection
} from '~/domains/teams/query'
import {
  getCreateTeamAvailability,
  getJoinTeamAvailability,
  hasTeamReachedMemberLimit
} from '~/domains/teams/workspace'

const baseDirectoryFilterOptions = [
  { label: 'All teams', value: 'all' },
  { label: 'Open to join', value: 'open_to_join' },
  { label: 'Solo', value: 'solo' },
  { label: 'Multi-person', value: 'multi_person' },
  { label: 'Full', value: 'full' }
] as const

type TeamsDirectoryFilter = (typeof baseDirectoryFilterOptions)[number]['value']

const props = withDefaults(defineProps<{
  event: PublicEvent & {
    id: string
  }
  selectedTeamSlug?: string | null
  showOperationalTeamStates?: boolean
}>(), {
  selectedTeamSlug: null,
  showOperationalTeamStates: false
})

const toast = useToast()
const selectedTeamId = ref<string | null>(null)
const selectedTeamStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const selectedTeamErrorMessage = ref('')
const directoryFilter = ref<TeamsDirectoryFilter>('all')
let selectedTeamRequestVersion = 0

const workspace = useTeamFormationWorkspace(
  computed(() => props.event),
  {
    teamId: selectedTeamId
  }
)

const visibleTeamSlugs = computed(() =>
  workspace.visibleTeams.value.map(team => team.slug).join(':')
)

function buildTeamsTabHref(teamSlug?: string | null) {
  return buildAccountEventTeamsTabHref(props.event.slug, teamSlug)
}

function buildWorkspaceTabHref() {
  return buildAccountEventWorkspaceTabHref(props.event.slug)
}

function mapDirectoryFilter(filter: TeamsDirectoryFilter) {
  switch (filter) {
    case 'open_to_join':
      return {
        openToJoin: true,
        hasCapacity: true
      } as const
    case 'solo':
      return {
        workspaceMode: 'solo'
      } as const
    case 'multi_person':
      return {
        workspaceMode: 'team'
      } as const
    case 'full':
      return {
        hasCapacity: false
      } as const
    default:
      return {}
  }
}

async function syncSelectedTeamId() {
  const requestedTeamSlug = props.selectedTeamSlug?.trim().toLowerCase() ?? ''
  const requestVersion = ++selectedTeamRequestVersion

  selectedTeamErrorMessage.value = ''

  if (!requestedTeamSlug) {
    selectedTeamId.value = null
    selectedTeamStatus.value = 'success'
    return
  }

  const matchingVisibleTeam = workspace.visibleTeams.value.find(team => team.slug === requestedTeamSlug)

  if (matchingVisibleTeam) {
    selectedTeamId.value = matchingVisibleTeam.id
    selectedTeamStatus.value = 'success'
    return
  }

  selectedTeamId.value = null
  selectedTeamStatus.value = 'pending'

  try {
    const resolvedTeam = await workspace.findVisibleTeamBySlug(requestedTeamSlug)

    if (requestVersion !== selectedTeamRequestVersion) {
      return
    }

    if (resolvedTeam) {
      selectedTeamId.value = resolvedTeam.id
      selectedTeamStatus.value = 'success'
      return
    }

    selectedTeamStatus.value = 'error'
    selectedTeamErrorMessage.value = 'The selected team from this link is not available in this event.'
  } catch {
    if (requestVersion !== selectedTeamRequestVersion) {
      return
    }

    selectedTeamStatus.value = 'error'
    selectedTeamErrorMessage.value = 'The selected team from this link could not be loaded right now.'
  }
}

watch([
  () => props.selectedTeamSlug ?? null,
  visibleTeamSlugs
], () => {
  void syncSelectedTeamId()
}, {
  immediate: true
})

watch(directoryFilter, async (nextFilter) => {
  await workspace.loadVisibleTeams(1, {
    filter: mapDirectoryFilter(nextFilter)
  })
}, {
  immediate: true
})

const actor = computed(() => workspace.actor.value)
const ownApplicationStatus = computed(() => workspace.ownApplication.value?.status ?? null)
const createTeamWorkspaceHref = computed(() => {
  if (workspace.ownTeamStatus.value !== 'success') {
    return null
  }

  const createTeamAvailability = getCreateTeamAvailability(
    props.event,
    ownApplicationStatus.value,
    Boolean(workspace.ownTeam.value)
  )

  if (!createTeamAvailability.isAllowed) {
    return null
  }

  return buildWorkspaceTabHref()
})
const ownTeamWorkspaceHref = computed(() =>
  workspace.ownTeam.value ? buildWorkspaceTabHref() : null
)
const sharedTeamBackHref = computed(() => buildTeamsTabHref())
const canJoinAnyTeam = computed(() =>
  ownApplicationStatus.value === 'approved'
  && !workspace.ownTeam.value
  && (props.event.state === 'registration_open' || props.event.state === 'submission_open')
)
const showLockedTeamDirectoryStatus = computed(() =>
  props.event.state !== 'registration_open' && props.event.state !== 'submission_open'
)
const isOpenToJoinDirectoryUnavailable = computed(() =>
  directoryFilter.value === 'open_to_join' && !canJoinAnyTeam.value
)
const directoryFilterOptions = computed(() =>
  baseDirectoryFilterOptions.map(option => ({
    ...option,
    count: option.value === 'open_to_join' && !canJoinAnyTeam.value
      ? 0
      : workspace.visibleTeamsFilterCounts.value[option.value] ?? 0
  }))
)
const selectedTeam = computed(() => workspace.currentTeam.value)
const selectedTeamMembership = computed(() => workspace.currentTeamMembership.value)
const selectedTeamIsOwnTeam = computed(() =>
  Boolean(selectedTeam.value && selectedTeam.value.id === workspace.ownTeam.value?.id)
)
const isViewingSharedTeam = computed(() =>
  isSharedTeamSelection({
    selectedTeamSlug: props.selectedTeamSlug,
    currentTeamId: selectedTeam.value?.id ?? null,
    currentTeamSlug: selectedTeam.value?.slug ?? null,
    ownTeamId: workspace.ownTeam.value?.id ?? null
  })
)
const isActorLoading = computed(() =>
  workspace.actorStatus.value === 'idle' || workspace.actorStatus.value === 'pending'
)
const isDirectoryLoading = computed(() =>
  Boolean(actor.value && actor.value.kind === 'platform_user')
  && (
    workspace.ownApplicationStatus.value === 'idle'
    || workspace.ownApplicationStatus.value === 'pending'
    || workspace.visibleTeamsStatus.value === 'idle'
    || workspace.visibleTeamsStatus.value === 'pending'
  )
)
const selectedTeamJoinAvailability = computed(() => {
  if (!selectedTeam.value) {
    return {
      isAllowed: false,
      reason: 'The selected team could not be loaded.'
    } satisfies TeamActionAvailability
  }

  const pendingJoinRequestId = workspace.getRememberedPendingJoinRequestId(selectedTeam.value.id)

  return getJoinTeamAvailability(props.event, selectedTeam.value, {
    applicationStatus: ownApplicationStatus.value,
    hasTeamMembership: Boolean(workspace.ownTeam.value),
    activeMemberCount: selectedTeam.value.activeMemberCount ?? selectedTeam.value.members.length,
    hasPendingJoinRequest: Boolean(pendingJoinRequestId),
    isOwnTeam: selectedTeamIsOwnTeam.value
  })
})
const selectedTeamPendingJoinRequestId = computed(() =>
  selectedTeam.value
    ? workspace.getRememberedPendingJoinRequestId(selectedTeam.value.id)
    : null
)
const selectedTeamLeaveAvailability = computed(() => ({
  isAllowed: false,
  reason: 'Team management actions live in the Workspace tab.'
}) satisfies TeamActionAvailability)
const selectedTeamCanShowJoinAction = computed(() => {
  if (!selectedTeam.value || selectedTeamIsOwnTeam.value) {
    return false
  }

  if (selectedTeamPendingJoinRequestId.value) {
    return true
  }

  if (selectedTeam.value.workspaceMode === 'solo' || !selectedTeam.value.isOpenToJoinRequests) {
    return false
  }

  return !hasTeamReachedMemberLimit(
    props.event.maxTeamMembers,
    selectedTeam.value.activeMemberCount ?? selectedTeam.value.members.length
  )
})
const selectedTeamShowMembershipActions = computed(() =>
  !selectedTeamIsOwnTeam.value
  && selectedTeamCanShowJoinAction.value
)
const selectedSharedTeam = computed(() =>
  selectedTeam.value && isViewingSharedTeam.value
    ? selectedTeam.value
    : null
)
const directoryEntries = computed<TeamDirectoryEntry[]>(() =>
  workspace.visibleTeams.value.map((team) => {
    const pendingJoinRequestId = workspace.getRememberedPendingJoinRequestId(team.id)
    const activeMemberCount = team.activeMemberCount ?? 0

    return {
      team,
      detailHref: buildTeamsTabHref(team.slug),
      isOwnTeam: team.id === workspace.ownTeam.value?.id,
      isFull: hasTeamReachedMemberLimit(props.event.maxTeamMembers, activeMemberCount),
      hasPendingJoinRequest: Boolean(pendingJoinRequestId),
      pendingJoinRequestId,
      joinAvailability: getJoinTeamAvailability(props.event, team, {
        applicationStatus: ownApplicationStatus.value,
        hasTeamMembership: Boolean(workspace.ownTeam.value),
        activeMemberCount,
        hasPendingJoinRequest: Boolean(pendingJoinRequestId),
        isOwnTeam: team.id === workspace.ownTeam.value?.id
      })
    }
  })
)
const visibleDirectoryEntries = computed(() =>
  isOpenToJoinDirectoryUnavailable.value ? [] : directoryEntries.value
)
const visibleDirectoryTotal = computed(() =>
  isOpenToJoinDirectoryUnavailable.value ? 0 : workspace.visibleTeamsTotal.value
)
const hasMoreDirectoryTeams = computed(() =>
  isOpenToJoinDirectoryUnavailable.value ? false : workspace.hasMoreVisibleTeams.value
)
const directoryLoadMoreErrorMessage = computed(() =>
  isOpenToJoinDirectoryUnavailable.value ? '' : workspace.loadMoreVisibleTeamsErrorMessage.value
)

watch(canJoinAnyTeam, async (nextCanJoinAnyTeam) => {
  if (directoryFilter.value !== 'open_to_join' || !nextCanJoinAnyTeam) {
    return
  }

  await workspace.loadVisibleTeams(1, {
    filter: mapDirectoryFilter('open_to_join')
  })
})

async function requestToJoinTeam(teamId: string) {
  const joinRequest = await workspace.requestToJoinTeam(teamId)

  if (!joinRequest) {
    return
  }

  toast.add({
    title: 'Join request submitted',
    description: 'The team admins can now review your request.',
    color: 'success'
  })
}

async function cancelJoinRequest(payload: {
  teamId: string
  requestId: string | null
}) {
  const canceledRequest = await workspace.cancelPendingJoinRequest(payload.teamId, payload.requestId)

  if (!canceledRequest) {
    return
  }

  toast.add({
    title: 'Join request canceled',
    description: 'The pending request was canceled.',
    color: 'success'
  })
}

async function copySelectedTeamLink() {
  if (!selectedTeam.value || !import.meta.client || !window.isSecureContext || !navigator.clipboard) {
    toast.add({
      title: 'Copy unavailable',
      description: 'This browser could not copy the team link right now.',
      color: 'error'
    })
    return
  }

  try {
    await navigator.clipboard.writeText(buildAbsoluteAccountEventTeamsTabHref(
      window.location.origin,
      props.event.slug,
      selectedTeam.value.slug
    ))

    toast.add({
      title: 'Team link copied',
      description: 'The direct team link was copied to your clipboard.',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Copy failed',
      description: 'The team link could not be copied right now.',
      color: 'error'
    })
  }
}
</script>

<template>
  <div
    data-testid="account-event-team-panel"
    class="space-y-6"
  >
    <AppAlert
      v-if="isActorLoading"
      color="neutral"
      variant="soft"
      title="Loading team access"
      description="Resolving your access to this event workspace."
    />

    <template v-else-if="actor?.kind === 'platform_user'">
      <AppAlert
        v-if="workspace.actorErrorMessage.value"
        color="error"
        variant="soft"
        title="Unable to resolve team access"
        :description="workspace.actorErrorMessage.value"
      />

      <AppAlert
        v-else-if="workspace.visibleEventErrorMessage.value"
        color="error"
        variant="soft"
        title="Unable to resolve event access"
        :description="workspace.visibleEventErrorMessage.value"
      />

      <AppAlert
        v-else-if="!workspace.visibleEventId.value"
        color="error"
        variant="soft"
        title="Teams unavailable"
        description="The current event could not be resolved for team actions."
      />

      <AppAlert
        v-else-if="workspace.ownApplicationErrorMessage.value"
        color="error"
        variant="soft"
        title="Unable to resolve your application status"
        :description="workspace.ownApplicationErrorMessage.value"
      />

      <template v-else>
        <AppAlert
          v-if="workspace.mutationError.value"
          color="error"
          variant="soft"
          title="Team action failed"
          :description="workspace.mutationError.value"
        />

        <AppAlert
          v-if="selectedTeamStatus === 'pending'"
          color="neutral"
          variant="soft"
          title="Loading selected team"
          description="Resolving the team from the shared link."
        />

        <AppAlert
          v-else-if="selectedTeamErrorMessage"
          color="warning"
          variant="soft"
          title="Selected team unavailable"
          :description="selectedTeamErrorMessage"
        />

        <div
          v-if="selectedSharedTeam"
          class="space-y-6"
        >
          <NuxtLink
            :to="sharedTeamBackHref"
            class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-600 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
          >
            <AppIcon
              name="i-lucide-arrow-left"
              class="size-4"
            />
            Back to teams
          </NuxtLink>

          <LazyParticipantTeamWorkspacePanel
            :settings="{
              name: selectedSharedTeam.name,
              bio: selectedSharedTeam.bio ?? '',
              isOpenToJoinRequests: selectedSharedTeam.isOpenToJoinRequests
            }"
            :team="selectedSharedTeam"
            :event-state="props.event.state"
            :max-team-members="props.event.maxTeamMembers"
            :membership="selectedTeamMembership"
            :can-manage-team="false"
            :is-team-locked="props.event.state !== 'registration_open' && props.event.state !== 'submission_open'"
            :join-availability="selectedTeamJoinAvailability"
            :leave-availability="selectedTeamLeaveAvailability"
            :pending-join-request-id="selectedTeamPendingJoinRequestId"
            :pending-action-key="workspace.pendingActionKey.value"
            :show-membership-actions="selectedTeamShowMembershipActions"
            @copy-team-link="copySelectedTeamLink"
            @request-join="requestToJoinTeam"
            @cancel-join-request="cancelJoinRequest"
          />
        </div>

        <LazyParticipantTeamDirectoryPanel
          v-else
          v-model:directory-filter="directoryFilter"
          :teams="visibleDirectoryEntries"
          :max-team-members="props.event.maxTeamMembers"
          :create-team-href="createTeamWorkspaceHref"
          :own-team-workspace-href="ownTeamWorkspaceHref"
          :total-teams="visibleDirectoryTotal"
          :show-locked-status="showLockedTeamDirectoryStatus"
          :show-operational-team-states="props.showOperationalTeamStates"
          :filter-options="directoryFilterOptions"
          :is-loading-teams="!isOpenToJoinDirectoryUnavailable && isDirectoryLoading"
          :team-error-message="workspace.visibleTeamsErrorMessage.value"
          :has-more-teams="hasMoreDirectoryTeams"
          :is-loading-more-teams="workspace.isLoadingMoreVisibleTeams.value"
          :load-more-teams-error-message="directoryLoadMoreErrorMessage"
          :pending-action-key="workspace.pendingActionKey.value"
          @join-team="requestToJoinTeam"
          @cancel-join-request="cancelJoinRequest"
          @load-more-teams="workspace.loadMoreVisibleTeams"
        />
      </template>
    </template>

    <AppAlert
      v-else
      color="error"
      variant="soft"
      title="Teams unavailable"
      description="Participant team actions require a platform user session."
    />
  </div>
</template>
