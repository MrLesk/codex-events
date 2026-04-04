<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'
import type {
  TeamActionAvailability,
  TeamDirectoryEntry
} from '~/utils/team-workspace'

import ParticipantTeamDirectoryPanel from '~/components/teams/ParticipantTeamDirectoryPanel.vue'
import ParticipantTeamSubmissionPanel from '~/components/teams/ParticipantTeamSubmissionPanel.vue'
import ParticipantTeamWorkspacePanel from '~/components/teams/ParticipantTeamWorkspacePanel.vue'
import {
  buildAbsoluteAccountHackathonTeamTabHref,
  buildAccountHackathonTeamTabHref
} from '~/utils/team-query'
import {
  getCreateTeamAvailability,
  getJoinTeamAvailability,
  getLeaveTeamAvailability,
  getMemberRemovalAvailability,
  getTeamFormationAvailability
} from '~/utils/team-workspace'
import {
  getCreateSubmissionAvailability,
  getSubmitSubmissionAvailability,
  shouldShowParticipantSubmissionWorkspace,
  getUpdateSubmissionAvailability,
  getWithdrawSubmissionAvailability
} from '~/utils/team-submission'

const props = defineProps<{
  hackathon: PublicHackathon & {
    id: string
  }
  selectedTeamSlug?: string | null
}>()

const toast = useToast()
const selectedTeamId = ref<string | null>(null)
const selectedTeamStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const selectedTeamErrorMessage = ref('')
let selectedTeamRequestVersion = 0
const workspace = useTeamFormationWorkspace(
  computed(() => props.hackathon),
  {
    teamId: selectedTeamId
  }
)

const teamSettings = reactive({
  name: '',
  isOpenToJoinRequests: false
})
const provisionalTeamCreatedAt = ref(new Date().toISOString())
const hasSeededProvisionalTeamSettings = ref(false)
const lastSeededProvisionalTeamName = ref('')
const submissionForm = reactive({
  projectName: '',
  summary: '',
  repositoryUrl: '',
  demoUrl: ''
})

const visibleTeamSlugs = computed(() =>
  workspace.visibleTeams.value.map(team => team.slug).join(':')
)

function buildTeamTabHref(teamSlug?: string | null) {
  return buildAccountHackathonTeamTabHref(props.hackathon.slug, teamSlug)
}

async function syncSelectedTeamId() {
  const requestedTeamSlug = props.selectedTeamSlug?.trim().toLowerCase() ?? ''
  const requestVersion = ++selectedTeamRequestVersion

  selectedTeamErrorMessage.value = ''

  if (!requestedTeamSlug) {
    selectedTeamId.value = workspace.ownTeam.value?.id ?? null
    selectedTeamStatus.value = 'success'
    return
  }

  if (workspace.ownTeam.value?.slug === requestedTeamSlug) {
    selectedTeamId.value = workspace.ownTeam.value.id
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

    selectedTeamId.value = workspace.ownTeam.value?.id ?? null
    selectedTeamStatus.value = 'error'
    selectedTeamErrorMessage.value = 'The selected team from this link is not available in this hackathon.'
  } catch {
    if (requestVersion !== selectedTeamRequestVersion) {
      return
    }

    selectedTeamId.value = workspace.ownTeam.value?.id ?? null
    selectedTeamStatus.value = 'error'
    selectedTeamErrorMessage.value = 'The selected team from this link could not be loaded right now.'
  }
}

watch([
  () => props.selectedTeamSlug ?? null,
  () => workspace.ownTeam.value?.id ?? null,
  visibleTeamSlugs
], () => {
  void syncSelectedTeamId()
}, {
  immediate: true
})

const actor = computed(() => workspace.actor.value)
const ownApplicationStatus = computed(() => workspace.ownApplication.value?.status ?? null)
const teamFormationAvailability = computed(() =>
  getTeamFormationAvailability(props.hackathon, ownApplicationStatus.value, Boolean(workspace.ownTeam.value))
)
const defaultSoloTeamName = computed(() => {
  if (actor.value?.kind !== 'platform_user') {
    return 'My Team'
  }

  const fullName = `${actor.value.platformUser.firstName} ${actor.value.platformUser.familyName}`.trim()
  const preferredName = fullName
    || actor.value.platformUser.displayName.trim()
    || actor.value.sessionUser.name?.trim()
    || actor.value.sessionUser.nickname?.trim()
    || 'My Team'

  return `Team ${preferredName}`.trim()
})
const provisionalCurrentTeam = computed(() => {
  if (actor.value?.kind !== 'platform_user') {
    return null
  }

  if (
    ownApplicationStatus.value !== 'approved'
    || !teamFormationAvailability.value.isOpen
    || workspace.ownTeam.value
    || workspace.currentTeam.value
  ) {
    return null
  }

  const provisionalTeamId = `provisional-team:${props.hackathon.id}:${actor.value.platformUser.id}`
  return {
    id: provisionalTeamId,
    hackathonId: props.hackathon.id,
    name: teamSettings.name.trim() || defaultSoloTeamName.value,
    slug: '',
    isOpenToJoinRequests: teamSettings.isOpenToJoinRequests,
    createdByUserId: actor.value.platformUser.id,
    createdAt: provisionalTeamCreatedAt.value,
    updatedAt: provisionalTeamCreatedAt.value,
    activeMemberCount: 1,
    isPersisted: false,
    members: [
      {
        id: `provisional-member:${props.hackathon.id}:${actor.value.platformUser.id}`,
        teamId: provisionalTeamId,
        userId: actor.value.platformUser.id,
        role: 'admin' as const,
        joinedAt: provisionalTeamCreatedAt.value,
        leftAt: null,
        createdAt: provisionalTeamCreatedAt.value,
        user: {
          id: actor.value.platformUser.id,
          displayName: actor.value.platformUser.displayName,
          email: actor.value.platformUser.email,
          xProfileUrl: actor.value.platformUser.xProfileUrl,
          linkedinProfileUrl: actor.value.platformUser.linkedinProfileUrl,
          githubProfileUrl: actor.value.platformUser.githubProfileUrl,
          chatgptEmail: actor.value.platformUser.chatgptEmail,
          openaiOrgId: actor.value.platformUser.openaiOrgId,
          lumaUsername: actor.value.platformUser.lumaUsername
        }
      }
    ]
  }
})

watch([
  () => workspace.currentTeam.value,
  provisionalCurrentTeam,
  defaultSoloTeamName
], ([currentTeam, nextProvisionalTeam, nextDefaultSoloTeamName]) => {
  if (currentTeam) {
    teamSettings.name = currentTeam.name
    teamSettings.isOpenToJoinRequests = currentTeam.isOpenToJoinRequests
    hasSeededProvisionalTeamSettings.value = false
    lastSeededProvisionalTeamName.value = ''
    return
  }

  if (!nextProvisionalTeam) {
    teamSettings.name = ''
    teamSettings.isOpenToJoinRequests = false
    hasSeededProvisionalTeamSettings.value = false
    lastSeededProvisionalTeamName.value = ''
    return
  }

  if (!hasSeededProvisionalTeamSettings.value) {
    teamSettings.name = nextDefaultSoloTeamName
    teamSettings.isOpenToJoinRequests = false
    hasSeededProvisionalTeamSettings.value = true
    lastSeededProvisionalTeamName.value = nextDefaultSoloTeamName
    return
  }

  if (teamSettings.name === lastSeededProvisionalTeamName.value) {
    teamSettings.name = nextDefaultSoloTeamName
    lastSeededProvisionalTeamName.value = nextDefaultSoloTeamName
  }
}, {
  immediate: true
})

const displayedTeam = computed(() => workspace.currentTeam.value ?? provisionalCurrentTeam.value)
const displayedTeamMembership = computed(() =>
  workspace.currentTeamMembership.value ?? provisionalCurrentTeam.value?.members[0] ?? null
)
const canManageTeam = computed(() =>
  workspace.isCurrentTeamAdmin.value || Boolean(provisionalCurrentTeam.value)
)
const canViewSubmission = computed(() =>
  shouldShowParticipantSubmissionWorkspace(props.hackathon, Boolean(displayedTeamMembership.value))
)
const submissionWorkspace = useTeamSubmissionWorkspace(
  computed(() => props.hackathon),
  {
    visibleHackathonId: workspace.visibleHackathonId,
    team: displayedTeam,
    canViewSubmission,
    canManageSubmission: canManageTeam
  }
)

watch(() => submissionWorkspace.currentSubmission.value, (submission) => {
  submissionForm.projectName = submission?.projectName ?? ''
  submissionForm.summary = submission?.summary ?? ''
  submissionForm.repositoryUrl = submission?.repositoryUrl ?? ''
  submissionForm.demoUrl = submission?.demoUrl ?? ''
}, {
  immediate: true
})

const isWorkspaceLoading = computed(() => {
  if (workspace.actorStatus.value === 'idle' || workspace.actorStatus.value === 'pending') {
    return true
  }

  if (!actor.value || actor.value.kind !== 'platform_user') {
    return false
  }

  return workspace.visibleHackathonStatus.value === 'idle'
    || workspace.visibleHackathonStatus.value === 'pending'
    || workspace.ownApplicationStatus.value === 'idle'
    || workspace.ownApplicationStatus.value === 'pending'
})
const isViewingSharedTeam = computed(() =>
  Boolean(
    workspace.ownTeam.value
    && workspace.currentTeam.value
    && workspace.ownTeam.value.id !== workspace.currentTeam.value.id
  )
)
const backToOwnTeamHref = computed(() =>
  workspace.ownTeam.value ? buildTeamTabHref(workspace.ownTeam.value.slug) : null
)
const createTeamAvailability = computed(() =>
  getCreateTeamAvailability(props.hackathon, ownApplicationStatus.value, Boolean(workspace.ownTeam.value))
)
const directoryEntries = computed<TeamDirectoryEntry[]>(() => {
  const ownTeamId = workspace.ownTeam.value?.id ?? null
  const selectedExternalTeamId = workspace.currentTeamMembership.value ? null : workspace.currentTeam.value?.id ?? null

  return workspace.visibleTeams.value
    .filter(team => team.id !== ownTeamId && team.id !== selectedExternalTeamId)
    .map((team) => {
      const pendingJoinRequestId = workspace.getRememberedPendingJoinRequestId(team.id)

      return {
        team,
        detailHref: buildTeamTabHref(team.slug),
        isOwnTeam: false,
        hasPendingJoinRequest: Boolean(pendingJoinRequestId),
        pendingJoinRequestId,
        joinAvailability: getJoinTeamAvailability(props.hackathon, team, {
          applicationStatus: ownApplicationStatus.value,
          hasTeamMembership: Boolean(workspace.ownTeam.value),
          activeMemberCount: team.activeMemberCount ?? 0,
          hasPendingJoinRequest: Boolean(pendingJoinRequestId),
          isOwnTeam: false
        })
      }
    })
})
const createSubmissionAvailability = computed(() =>
  getCreateSubmissionAvailability(props.hackathon, submissionWorkspace.currentSubmission.value, canManageTeam.value)
)
const updateSubmissionAvailability = computed(() =>
  getUpdateSubmissionAvailability(props.hackathon, submissionWorkspace.currentSubmission.value, canManageTeam.value)
)
const submitSubmissionAvailability = computed(() =>
  getSubmitSubmissionAvailability(props.hackathon, submissionWorkspace.currentSubmission.value, canManageTeam.value)
)
const withdrawSubmissionAvailability = computed(() =>
  getWithdrawSubmissionAvailability(props.hackathon, submissionWorkspace.currentSubmission.value, canManageTeam.value)
)
const joinAvailability = computed(() => {
  if (!displayedTeam.value) {
    return {
      isAllowed: false,
      reason: 'The current team could not be loaded.'
    } satisfies TeamActionAvailability
  }

  return getJoinTeamAvailability(props.hackathon, displayedTeam.value, {
    applicationStatus: ownApplicationStatus.value,
    hasTeamMembership: Boolean(workspace.ownTeam.value),
    activeMemberCount: displayedTeam.value.activeMemberCount ?? displayedTeam.value.members.length,
    hasPendingJoinRequest: Boolean(displayedTeam.value.isPersisted === false
      ? null
      : workspace.getRememberedPendingJoinRequestId(displayedTeam.value.id)),
    isOwnTeam: displayedTeam.value.isPersisted === false || workspace.ownTeam.value?.id === displayedTeam.value.id
  })
})
const leaveAvailability = computed(() => {
  if (!displayedTeam.value || displayedTeam.value.isPersisted === false) {
    return {
      isAllowed: false,
      reason: 'The current team could not be loaded.'
    } satisfies TeamActionAvailability
  }

  return getLeaveTeamAvailability(
    props.hackathon,
    displayedTeam.value,
    displayedTeamMembership.value
  )
})
const removalAvailabilityByUserId = computed<Record<string, TeamActionAvailability>>(() => {
  if (!displayedTeam.value) {
    return {}
  }

  return Object.fromEntries(
    displayedTeam.value.members.map(member => [
      member.userId,
      getMemberRemovalAvailability(props.hackathon, displayedTeam.value!, member)
    ])
  )
})
const currentPendingJoinRequestId = computed(() =>
  displayedTeam.value?.isPersisted === false
    ? null
    : displayedTeam.value
      ? workspace.getRememberedPendingJoinRequestId(displayedTeam.value.id)
      : null
)
const showMembershipActions = computed(() => {
  if (!displayedTeamMembership.value) {
    return true
  }

  if (displayedTeam.value?.isPersisted === false) {
    return false
  }

  return leaveAvailability.value.isAllowed
})

function buildSubmissionInput() {
  return {
    projectName: submissionForm.projectName.trim() || null,
    summary: submissionForm.summary.trim() || null,
    repositoryUrl: submissionForm.repositoryUrl.trim() || null,
    demoUrl: submissionForm.demoUrl.trim() || null
  }
}

async function ensureOwnTeam() {
  if (workspace.ownTeam.value) {
    return workspace.ownTeam.value
  }

  if (!provisionalCurrentTeam.value || !createTeamAvailability.value.isAllowed) {
    return null
  }

  const name = teamSettings.name.trim()

  if (!name) {
    toast.add({
      title: 'Team name required',
      description: 'Enter a team name before continuing.',
      color: 'error'
    })
    return null
  }

  const createdTeam = await workspace.createTeam({
    name,
    isOpenToJoinRequests: teamSettings.isOpenToJoinRequests
  })

  if (!createdTeam) {
    return
  }

  selectedTeamId.value = createdTeam.id
  return createdTeam
}

async function copyCurrentTeamLink() {
  const targetTeam = displayedTeam.value?.isPersisted === false
    ? await ensureOwnTeam()
    : displayedTeam.value

  if (!targetTeam || !import.meta.client || !window.isSecureContext || !navigator.clipboard) {
    toast.add({
      title: 'Copy unavailable',
      description: 'This browser could not copy the team link right now.',
      color: 'error'
    })
    return
  }

  try {
    await navigator.clipboard.writeText(buildAbsoluteAccountHackathonTeamTabHref(
      window.location.origin,
      props.hackathon.slug,
      targetTeam.slug
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

async function submitTeamProfile() {
  const wasProvisionalTeam = displayedTeam.value?.isPersisted === false
  const updatedTeam = wasProvisionalTeam
    ? await ensureOwnTeam()
    : await workspace.updateCurrentTeamProfile({
        name: teamSettings.name
      })

  if (!updatedTeam) {
    return
  }

  toast.add({
    title: wasProvisionalTeam ? 'Team saved' : 'Team profile updated',
    description: wasProvisionalTeam
      ? 'Your team is ready. You can now share the link and accept collaborators.'
      : 'The team name was updated.',
    color: 'success'
  })
}

async function toggleJoinPolicy(nextValue: boolean) {
  if (displayedTeam.value?.isPersisted === false) {
    teamSettings.isOpenToJoinRequests = nextValue
    return
  }

  const updatedTeam = await workspace.updateCurrentTeamJoinPolicy(nextValue)

  if (!updatedTeam) {
    return
  }

  teamSettings.isOpenToJoinRequests = updatedTeam.isOpenToJoinRequests
  toast.add({
    title: 'Join policy updated',
    description: updatedTeam.isOpenToJoinRequests
      ? 'This team now accepts new join requests.'
      : 'This team is now closed to new join requests.',
    color: 'success'
  })
}

async function leaveCurrentTeam() {
  const result = await workspace.leaveCurrentTeam()

  if (!result) {
    return
  }

  toast.add({
    title: 'Team membership updated',
    description: 'You are no longer an active member of this team.',
    color: 'success'
  })
}

async function removeMember(userId: string) {
  const result = await workspace.removeCurrentTeamMember(userId)

  if (!result) {
    return
  }

  toast.add({
    title: 'Team member removed',
    description: 'The selected member was removed from the team.',
    color: 'success'
  })
}

async function approveJoinRequest(requestId: string) {
  const request = await workspace.approveJoinRequest(requestId)

  if (!request) {
    if (workspace.mutationError.value) {
      toast.add({
        title: 'Unable to approve join request',
        description: workspace.mutationError.value,
        color: 'error'
      })
    }
    return
  }

  toast.add({
    title: 'Join request approved',
    description: 'The participant is now an active member of your team.',
    color: 'success'
  })
}

async function rejectJoinRequest(requestId: string) {
  const request = await workspace.rejectJoinRequest(requestId)

  if (!request) {
    return
  }

  toast.add({
    title: 'Join request rejected',
    description: 'The pending request was rejected.',
    color: 'success'
  })
}

async function createSubmissionDraft() {
  if (displayedTeam.value?.isPersisted === false) {
    const createdTeam = await ensureOwnTeam()

    if (!createdTeam) {
      return
    }
  }

  const submission = await submissionWorkspace.createSubmissionDraft(buildSubmissionInput())

  if (!submission) {
    return
  }

  toast.add({
    title: 'Draft created',
    description: 'Your team can now continue working on the submission here.',
    color: 'success'
  })
}

async function saveSubmissionChanges() {
  const submission = await submissionWorkspace.updateCurrentSubmission(buildSubmissionInput())

  if (!submission) {
    return
  }

  toast.add({
    title: 'Submission updated',
    description: 'The latest project details were saved.',
    color: 'success'
  })
}

async function submitProject() {
  const submission = await submissionWorkspace.submitCurrentSubmission()

  if (!submission) {
    return
  }

  toast.add({
    title: 'Project submitted',
    description: 'Your team submission is now marked as submitted.',
    color: 'success'
  })
}

async function withdrawSubmission() {
  const submission = await submissionWorkspace.withdrawCurrentSubmission()

  if (!submission) {
    return
  }

  toast.add({
    title: 'Submission withdrawn',
    description: 'The project was withdrawn before judging preparation.',
    color: 'success'
  })
}
</script>

<template>
  <div
    data-testid="account-hackathon-team-panel"
    class="space-y-6"
  >
    <div
      v-if="isViewingSharedTeam && backToOwnTeamHref"
      class="flex"
    >
      <AppButton
        :to="backToOwnTeamHref"
        color="neutral"
        variant="outline"
        icon="i-lucide-arrow-left"
      >
        Back to my team
      </AppButton>
    </div>

    <AppAlert
      v-if="isWorkspaceLoading"
      color="neutral"
      variant="soft"
      title="Loading team access"
      description="Checking what team actions are available to you in this hackathon."
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
        v-else-if="workspace.visibleHackathonErrorMessage.value"
        color="error"
        variant="soft"
        title="Unable to resolve hackathon access"
        :description="workspace.visibleHackathonErrorMessage.value"
      />

      <AppAlert
        v-else-if="!workspace.visibleHackathonId.value"
        color="error"
        variant="soft"
        title="Team access unavailable"
        description="The current hackathon could not be resolved for team actions."
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
          v-if="workspace.ownTeamErrorMessage.value"
          color="warning"
          variant="soft"
          title="Current team membership unresolved"
          :description="workspace.ownTeamErrorMessage.value"
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

        <template v-if="displayedTeam">
          <div class="grid gap-6">
            <ParticipantTeamWorkspacePanel
              v-model:settings="teamSettings"
              :team="displayedTeam"
              :max-team-members="props.hackathon.maxTeamMembers"
              :membership="displayedTeamMembership"
              :can-manage-team="canManageTeam"
              :join-availability="joinAvailability"
              :leave-availability="leaveAvailability"
              :pending-join-request-id="currentPendingJoinRequestId"
              :pending-action-key="workspace.pendingActionKey.value"
              :removal-availability-by-user-id="removalAvailabilityByUserId"
              :join-requests="workspace.teamJoinRequests.value"
              :join-requests-status="workspace.teamJoinRequestsStatus.value"
              :join-requests-error-message="workspace.teamJoinRequestsErrorMessage.value"
              :show-membership-actions="showMembershipActions"
              @copy-team-link="copyCurrentTeamLink"
              @submit-profile="submitTeamProfile"
              @toggle-join-policy="toggleJoinPolicy"
              @request-join="requestToJoinTeam"
              @cancel-join-request="cancelJoinRequest"
              @leave-team="leaveCurrentTeam"
              @remove-member="removeMember"
              @approve-request="approveJoinRequest"
              @reject-request="rejectJoinRequest"
            />

            <ParticipantTeamSubmissionPanel
              v-if="canViewSubmission"
              v-model:form="submissionForm"
              :team-id="displayedTeam.id"
              :hackathon-state="props.hackathon.state"
              :submission="submissionWorkspace.currentSubmission.value"
              :status="submissionWorkspace.currentSubmissionStatus.value"
              :error-message="submissionWorkspace.currentSubmissionErrorMessage.value"
              :mutation-error="submissionWorkspace.mutationError.value"
              :can-manage-submission="canManageTeam"
              :create-availability="createSubmissionAvailability"
              :update-availability="updateSubmissionAvailability"
              :submit-availability="submitSubmissionAvailability"
              :withdraw-availability="withdrawSubmissionAvailability"
              :pending-action-key="submissionWorkspace.pendingActionKey.value"
              @create-draft="createSubmissionDraft"
              @save-changes="saveSubmissionChanges"
              @submit-project="submitProject"
              @withdraw-submission="withdrawSubmission"
            />
          </div>
        </template>

        <AppAlert
          v-else-if="workspace.currentTeamStatus.value === 'pending'"
          color="neutral"
          variant="soft"
          :title="props.selectedTeamSlug ? 'Loading selected team' : 'Loading your team'"
          :description="props.selectedTeamSlug ? 'Checking the selected team details.' : 'Checking your current team details.'"
        />

        <AppAlert
          v-else-if="workspace.currentTeamErrorMessage.value"
          color="error"
          variant="soft"
          title="Team unavailable"
          :description="workspace.currentTeamErrorMessage.value"
        />

        <ParticipantTeamDirectoryPanel
          v-if="!workspace.currentTeamMembership.value"
          :teams="directoryEntries"
          :total-teams="workspace.visibleTeamsTotal.value"
          :is-loading-teams="workspace.visibleTeamsStatus.value === 'pending'"
          :team-error-message="workspace.visibleTeamsErrorMessage.value"
          :has-more-teams="workspace.hasMoreVisibleTeams.value"
          :is-loading-more-teams="workspace.isLoadingMoreVisibleTeams.value"
          :load-more-teams-error-message="workspace.loadMoreVisibleTeamsErrorMessage.value"
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
      title="Team access unavailable"
      description="Participant team actions require a platform user session."
    />
  </div>
</template>
