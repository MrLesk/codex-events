<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'
import type {
  TeamActionAvailability,
  TeamDirectoryEntry
} from '~/utils/team-workspace'

import ParticipantTeamDirectoryPanel from '~/components/teams/ParticipantTeamDirectoryPanel.vue'
import ParticipantTeamJoinRequestsPanel from '~/components/teams/ParticipantTeamJoinRequestsPanel.vue'
import ParticipantTeamMembershipPanel from '~/components/teams/ParticipantTeamMembershipPanel.vue'
import ParticipantTeamSubmissionPanel from '~/components/teams/ParticipantTeamSubmissionPanel.vue'
import ParticipantTeamWorkspacePanel from '~/components/teams/ParticipantTeamWorkspacePanel.vue'
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
  getUpdateSubmissionAvailability,
  getWithdrawSubmissionAvailability
} from '~/utils/team-submission'

const props = defineProps<{
  hackathon: PublicHackathon & {
    id: string
  }
}>()

const toast = useToast()
const selectedTeamId = ref<string | null>(null)
const workspace = useTeamFormationWorkspace(
  computed(() => props.hackathon),
  {
    teamId: selectedTeamId
  }
)

const createForm = reactive({
  name: '',
  isOpenToJoinRequests: true
})
const teamSettings = reactive({
  name: '',
  isOpenToJoinRequests: false
})
const submissionForm = reactive({
  projectName: '',
  summary: '',
  repositoryUrl: '',
  demoUrl: ''
})

watch(() => workspace.ownTeam.value?.id ?? null, (nextTeamId) => {
  selectedTeamId.value = nextTeamId
}, {
  immediate: true
})

watch(() => workspace.currentTeam.value?.id ?? null, () => {
  if (!workspace.currentTeam.value) {
    teamSettings.name = ''
    teamSettings.isOpenToJoinRequests = false
    return
  }

  teamSettings.name = workspace.currentTeam.value.name
  teamSettings.isOpenToJoinRequests = workspace.currentTeam.value.isOpenToJoinRequests
}, {
  immediate: true
})

const canManageTeam = computed(() => workspace.isCurrentTeamAdmin.value)
const canViewSubmission = computed(() => Boolean(workspace.currentTeamMembership.value))
const submissionWorkspace = useTeamSubmissionWorkspace(
  computed(() => props.hackathon),
  {
    visibleHackathonId: workspace.visibleHackathonId,
    team: workspace.currentTeam,
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

const actor = computed(() => workspace.actor.value)
const ownApplicationStatus = computed(() => workspace.ownApplication.value?.status ?? null)
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
const teamFormationAvailability = computed(() =>
  getTeamFormationAvailability(props.hackathon, ownApplicationStatus.value, Boolean(workspace.ownTeam.value))
)
const teamPanelTitle = computed(() => {
  if (workspace.ownTeam.value) {
    return 'Continue with your team'
  }

  switch (ownApplicationStatus.value) {
    case 'approved':
      return teamFormationAvailability.value.isOpen ? 'Explore team options' : 'Team formation is closed'
    case 'submitted':
      return 'Approval is still pending'
    case 'rejected':
      return 'You were not approved'
    case 'withdrawn':
      return 'Participation withdrawn'
    default:
      return 'Team formation'
  }
})
const teamPanelStatusLabel = computed(() => {
  if (workspace.ownTeam.value) {
    return 'On a team'
  }

  switch (ownApplicationStatus.value) {
    case 'approved':
      return teamFormationAvailability.value.isOpen ? 'Ready now' : 'Closed'
    case 'submitted':
      return 'Pending'
    case 'rejected':
      return 'Not approved'
    case 'withdrawn':
      return 'Withdrawn'
    default:
      return 'Locked'
  }
})
const teamPanelStatusColor = computed(() => {
  if (workspace.ownTeam.value || (ownApplicationStatus.value === 'approved' && teamFormationAvailability.value.isOpen)) {
    return 'success'
  }

  if (ownApplicationStatus.value === 'submitted') {
    return 'warning'
  }

  if (ownApplicationStatus.value === 'rejected' || ownApplicationStatus.value === 'withdrawn') {
    return 'error'
  }

  return 'neutral'
})
const teamPanelSummary = computed(() => {
  const ownTeam = workspace.ownTeam.value

  if (ownTeam) {
    return `You're already on ${ownTeam.name}. Use this page to manage members, review join requests, and keep your team details up to date.`
  }

  if (ownApplicationStatus.value === 'approved' && teamFormationAvailability.value.isOpen) {
    return 'If you want to work with other participants, you can create a team or request to join one of the listed teams below.'
  }

  return teamFormationAvailability.value.summary
})
const createTeamAvailability = computed(() =>
  getCreateTeamAvailability(props.hackathon, ownApplicationStatus.value, Boolean(workspace.ownTeam.value))
)
const directoryEntries = computed<TeamDirectoryEntry[]>(() => {
  const ownTeamId = workspace.ownTeam.value?.id ?? null

  return workspace.visibleTeams.value
    .filter(team => team.id !== ownTeamId)
    .map((team) => {
      const pendingJoinRequestId = workspace.getRememberedPendingJoinRequestId(team.id)

      return {
        team,
        detailHref: null,
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
  if (!workspace.currentTeam.value) {
    return {
      isAllowed: false,
      reason: 'The current team could not be loaded.'
    } satisfies TeamActionAvailability
  }

  return getJoinTeamAvailability(props.hackathon, workspace.currentTeam.value, {
    applicationStatus: ownApplicationStatus.value,
    hasTeamMembership: Boolean(workspace.ownTeam.value),
    activeMemberCount: workspace.currentTeam.value.activeMemberCount ?? workspace.currentTeam.value.members.length,
    hasPendingJoinRequest: Boolean(workspace.getRememberedPendingJoinRequestId(workspace.currentTeam.value.id)),
    isOwnTeam: workspace.ownTeam.value?.id === workspace.currentTeam.value.id
  })
})
const leaveAvailability = computed(() => {
  if (!workspace.currentTeam.value) {
    return {
      isAllowed: false,
      reason: 'The current team could not be loaded.'
    } satisfies TeamActionAvailability
  }

  return getLeaveTeamAvailability(
    props.hackathon,
    workspace.currentTeam.value,
    workspace.currentTeamMembership.value
  )
})
const removalAvailabilityByUserId = computed<Record<string, TeamActionAvailability>>(() => {
  if (!workspace.currentTeam.value) {
    return {}
  }

  return Object.fromEntries(
    workspace.currentTeam.value.members.map(member => [
      member.userId,
      getMemberRemovalAvailability(props.hackathon, workspace.currentTeam.value!, member)
    ])
  )
})
const currentPendingJoinRequestId = computed(() =>
  workspace.currentTeam.value ? workspace.getRememberedPendingJoinRequestId(workspace.currentTeam.value.id) : null
)

function resetCreateForm() {
  createForm.name = ''
  createForm.isOpenToJoinRequests = true
}

function buildSubmissionInput() {
  return {
    projectName: submissionForm.projectName.trim() || null,
    summary: submissionForm.summary.trim() || null,
    repositoryUrl: submissionForm.repositoryUrl.trim() || null,
    demoUrl: submissionForm.demoUrl.trim() || null
  }
}

async function submitCreateTeam() {
  const createdTeam = await workspace.createTeam({
    name: createForm.name,
    isOpenToJoinRequests: createForm.isOpenToJoinRequests
  })

  if (!createdTeam) {
    return
  }

  selectedTeamId.value = createdTeam.id
  resetCreateForm()
  toast.add({
    title: 'Team created',
    description: 'Your team is ready. You can now manage members and join requests here.',
    color: 'success'
  })
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
  const updatedTeam = await workspace.updateCurrentTeamProfile({
    name: teamSettings.name
  })

  if (!updatedTeam) {
    return
  }

  toast.add({
    title: 'Team profile updated',
    description: 'The team name was updated.',
    color: 'success'
  })
}

async function toggleJoinPolicy(nextValue: boolean) {
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
    <section class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <AppCard
        class="rounded-xl hackathon-workspace-detail-panel"
        :ui="{ body: 'p-5' }"
      >
        <div class="space-y-4">
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="text-[20px] font-medium text-highlighted dark:text-white">
              {{ teamPanelTitle }}
            </h2>

            <AppBadge
              :color="teamPanelStatusColor"
              variant="soft"
              class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
            >
              {{ teamPanelStatusLabel }}
            </AppBadge>
          </div>

          <div class="space-y-1">
            <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
              {{ teamPanelSummary }}
            </p>
          </div>
        </div>
      </AppCard>

      <div class="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Your team
          </p>
          <p class="mt-2 text-xl font-semibold text-highlighted dark:text-white">
            {{ workspace.ownTeam.value ? workspace.ownTeam.value.name : 'None yet' }}
          </p>
        </div>

        <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Teams listed
          </p>
          <p class="mt-2 text-xl font-semibold text-highlighted dark:text-white">
            {{ workspace.visibleTeamsStatus.value === 'pending' ? 'Loading...' : workspace.visibleTeamsTotal.value || workspace.visibleTeams.value.length }}
          </p>
        </div>

        <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Team size limit
          </p>
          <p class="mt-2 text-xl font-semibold text-highlighted dark:text-white">
            {{ props.hackathon.maxTeamMembers }}
          </p>
        </div>
      </div>
    </section>

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

        <template v-if="workspace.ownTeam.value && workspace.currentTeam.value">
          <div class="grid gap-6">
            <ParticipantTeamWorkspacePanel
              v-model:settings="teamSettings"
              :team="workspace.currentTeam.value"
              :membership="workspace.currentTeamMembership.value"
              :can-manage-team="canManageTeam"
              :join-availability="joinAvailability"
              :leave-availability="leaveAvailability"
              :pending-join-request-id="currentPendingJoinRequestId"
              :pending-action-key="workspace.pendingActionKey.value"
              @submit-profile="submitTeamProfile"
              @toggle-join-policy="toggleJoinPolicy"
              @request-join="requestToJoinTeam"
              @cancel-join-request="cancelJoinRequest"
              @leave-team="leaveCurrentTeam"
            />

            <ParticipantTeamSubmissionPanel
              v-if="canViewSubmission"
              v-model:form="submissionForm"
              :team-id="workspace.currentTeam.value.id"
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

            <ParticipantTeamMembershipPanel
              :team="workspace.currentTeam.value"
              :membership="workspace.currentTeamMembership.value"
              :can-manage-team="canManageTeam"
              :removal-availability-by-user-id="removalAvailabilityByUserId"
              :pending-action-key="workspace.pendingActionKey.value"
              @remove-member="removeMember"
            />

            <ParticipantTeamJoinRequestsPanel
              v-if="canManageTeam"
              :requests="workspace.teamJoinRequests.value"
              :status="workspace.teamJoinRequestsStatus.value"
              :error-message="workspace.teamJoinRequestsErrorMessage.value"
              :pending-action-key="workspace.pendingActionKey.value"
              @approve-request="approveJoinRequest"
              @reject-request="rejectJoinRequest"
            />
          </div>
        </template>

        <AppAlert
          v-else-if="workspace.ownTeam.value && workspace.currentTeamStatus.value === 'pending'"
          color="neutral"
          variant="soft"
          title="Loading your team"
          description="Checking your current team details and submission status."
        />

        <AppAlert
          v-else-if="workspace.ownTeam.value && workspace.currentTeamErrorMessage.value"
          color="error"
          variant="soft"
          title="Team unavailable"
          :description="workspace.currentTeamErrorMessage.value"
        />

        <ParticipantTeamDirectoryPanel
          v-else
          v-model:form="createForm"
          :current-team="workspace.ownTeam.value"
          :current-team-href="null"
          :teams="directoryEntries"
          :total-teams="workspace.visibleTeamsTotal.value"
          :can-create-team="createTeamAvailability"
          :is-creating-team="workspace.pendingActionKey.value === 'create-team'"
          :is-loading-teams="workspace.visibleTeamsStatus.value === 'pending'"
          :team-error-message="workspace.visibleTeamsErrorMessage.value"
          :has-more-teams="workspace.hasMoreVisibleTeams.value"
          :is-loading-more-teams="workspace.isLoadingMoreVisibleTeams.value"
          :load-more-teams-error-message="workspace.loadMoreVisibleTeamsErrorMessage.value"
          :pending-action-key="workspace.pendingActionKey.value"
          @submit-create="submitCreateTeam"
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
