<script setup lang="ts">
import type {
  PublicApiDataResponse,
  PublicHackathon
} from '~/composables/useHackathonPresentation'
import type { TeamActionAvailability } from '~/utils/team-workspace'

import { buildAccountSettingsHref } from '~/utils/auth-navigation'
import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'
import ParticipantTeamJoinRequestsPanel from '~/components/teams/ParticipantTeamJoinRequestsPanel.vue'
import ParticipantTeamMembershipPanel from '~/components/teams/ParticipantTeamMembershipPanel.vue'
import ParticipantTeamSubmissionPanel from '~/components/teams/ParticipantTeamSubmissionPanel.vue'
import ParticipantTeamWorkspacePanel from '~/components/teams/ParticipantTeamWorkspacePanel.vue'
import {
  createTeamSlug,
  getJoinTeamAvailability,
  getLeaveTeamAvailability,
  getMemberRemovalAvailability
} from '~/utils/team-workspace'
import {
  getCreateSubmissionAvailability,
  getSubmitSubmissionAvailability,
  getUpdateSubmissionAvailability,
  getWithdrawSubmissionAvailability
} from '~/utils/team-submission'

definePageMeta({
  layout: 'hackathon-detail',
  middleware: ['require-auth']
})

const route = useRoute()
const toast = useToast()
const slug = computed(() => String(route.params.slug ?? '').trim())
const teamId = computed(() => String(route.params.teamId ?? '').trim())

if (!slug.value || !teamId.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Team not found.'
  })
}

const {
  data: hackathonResponse,
  error: hackathonError
} = await useFetch<PublicApiDataResponse<PublicHackathon>>(() => `/api/public/hackathons/${slug.value}`, {
  key: () => `public-hackathon-team-workspace:${slug.value}:${teamId.value}`
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
const workspace = useTeamFormationWorkspace(hackathon, slug, {
  teamId
})
const actor = computed(() => workspace.actor.value)
const accountSettingsHref = computed(() => buildAccountSettingsHref(route.fullPath))
const ownApplicationStatus = computed(() => workspace.ownApplication.value?.status ?? null)
const teamSettings = reactive({
  name: '',
  slug: '',
  isOpenToJoinRequests: false
})
const submissionForm = reactive({
  projectName: '',
  summary: '',
  repositoryUrl: '',
  demoUrl: ''
})
const hasManuallyEditedSlug = ref(false)
const canManageTeam = computed(() => workspace.isCurrentTeamAdmin.value)
const canViewSubmission = computed(() => Boolean(workspace.currentTeamMembership.value))
const submissionWorkspace = useTeamSubmissionWorkspace(hackathon, {
  visibleHackathonId: workspace.visibleHackathonId,
  team: workspace.currentTeam,
  canViewSubmission,
  canManageSubmission: canManageTeam
})

watch(() => workspace.currentTeam.value?.id ?? null, () => {
  if (!workspace.currentTeam.value) {
    teamSettings.name = ''
    teamSettings.slug = ''
    teamSettings.isOpenToJoinRequests = false
    hasManuallyEditedSlug.value = false
    return
  }

  teamSettings.name = workspace.currentTeam.value.name
  teamSettings.slug = workspace.currentTeam.value.slug
  teamSettings.isOpenToJoinRequests = workspace.currentTeam.value.isOpenToJoinRequests
  hasManuallyEditedSlug.value = false
}, {
  immediate: true
})

watch(() => teamSettings.name, (value) => {
  if (!hasManuallyEditedSlug.value && workspace.currentTeam.value && value !== workspace.currentTeam.value.name) {
    teamSettings.slug = createTeamSlug(value)
  }
})

watch(() => teamSettings.slug, (value) => {
  if (!workspace.currentTeam.value) {
    hasManuallyEditedSlug.value = false
    return
  }

  hasManuallyEditedSlug.value = value.length > 0 && value !== workspace.currentTeam.value.slug && value !== createTeamSlug(teamSettings.name)
})

watch(() => submissionWorkspace.currentSubmission.value, (submission) => {
  submissionForm.projectName = submission?.projectName ?? ''
  submissionForm.summary = submission?.summary ?? ''
  submissionForm.repositoryUrl = submission?.repositoryUrl ?? ''
  submissionForm.demoUrl = submission?.demoUrl ?? ''
}, {
  immediate: true
})

const isWorkspaceLoading = computed(() => {
  if (workspace.actorStatus.value === 'idle' || workspace.actorStatus.value === 'pending' || !actor.value) {
    return true
  }

  if (actor.value.kind !== 'platform_user') {
    return false
  }

  return workspace.visibleHackathonStatus.value === 'idle'
    || workspace.visibleHackathonStatus.value === 'pending'
    || workspace.ownApplicationStatus.value === 'idle'
    || workspace.ownApplicationStatus.value === 'pending'
    || workspace.currentTeamStatus.value === 'idle'
    || workspace.currentTeamStatus.value === 'pending'
    || (canViewSubmission.value
      && (submissionWorkspace.currentSubmissionStatus.value === 'idle'
        || submissionWorkspace.currentSubmissionStatus.value === 'pending'))
})

const createSubmissionAvailability = computed(() =>
  getCreateSubmissionAvailability(hackathon.value, submissionWorkspace.currentSubmission.value, canManageTeam.value)
)
const updateSubmissionAvailability = computed(() =>
  getUpdateSubmissionAvailability(hackathon.value, submissionWorkspace.currentSubmission.value, canManageTeam.value)
)
const submitSubmissionAvailability = computed(() =>
  getSubmitSubmissionAvailability(hackathon.value, submissionWorkspace.currentSubmission.value, canManageTeam.value)
)
const withdrawSubmissionAvailability = computed(() =>
  getWithdrawSubmissionAvailability(hackathon.value, submissionWorkspace.currentSubmission.value, canManageTeam.value)
)
const joinAvailability = computed(() => {
  if (!workspace.currentTeam.value) {
    return {
      isAllowed: false,
      reason: 'The requested team could not be loaded.'
    } satisfies TeamActionAvailability
  }

  return getJoinTeamAvailability(hackathon.value, workspace.currentTeam.value, {
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
      reason: 'The requested team could not be loaded.'
    } satisfies TeamActionAvailability
  }

  return getLeaveTeamAvailability(
    hackathon.value,
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
      getMemberRemovalAvailability(hackathon.value, workspace.currentTeam.value!, member)
    ])
  )
})
const currentPendingJoinRequestId = computed(() =>
  workspace.currentTeam.value ? workspace.getRememberedPendingJoinRequestId(workspace.currentTeam.value.id) : null
)

function buildSubmissionInput() {
  return {
    projectName: submissionForm.projectName.trim() || null,
    summary: submissionForm.summary.trim() || null,
    repositoryUrl: submissionForm.repositoryUrl.trim() || null,
    demoUrl: submissionForm.demoUrl.trim() || null
  }
}

async function submitTeamProfile() {
  const updatedTeam = await workspace.updateCurrentTeamProfile({
    name: teamSettings.name,
    slug: teamSettings.slug
  })

  if (!updatedTeam) {
    return
  }

  toast.add({
    title: 'Team profile updated',
    description: 'The team name and slug were updated successfully.',
    color: 'success'
  })

  if (updatedTeam.id === teamId.value && updatedTeam.slug !== route.params.teamId) {
    // No-op: teamId route param is canonical id, not slug.
  }
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

async function requestToJoinCurrentTeam(teamIdentifier: string) {
  const joinRequest = await workspace.requestToJoinTeam(teamIdentifier)

  if (!joinRequest) {
    return
  }

  toast.add({
    title: 'Join request submitted',
    description: 'The team admins can now review your request.',
    color: 'success'
  })
}

async function cancelCurrentPendingJoinRequest(payload: {
  teamId: string
  requestId: string | null
}) {
  const canceledRequest = await workspace.cancelPendingJoinRequest(payload.teamId, payload.requestId)

  if (!canceledRequest) {
    return
  }

  toast.add({
    title: 'Join request canceled',
    description: 'The pending join request was canceled for this workspace session.',
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
  await navigateTo(`/hackathons/${slug.value}/teams`)
}

async function removeMember(userId: string) {
  const result = await workspace.removeCurrentTeamMember(userId)

  if (!result) {
    return
  }

  toast.add({
    title: 'Team member removed',
    description: 'The selected team membership was removed successfully.',
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
    description: 'The participant is now an active member of this team.',
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
    description: 'The pending request was rejected and remains outside the team.',
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
    description: 'The first submission draft is now attached to this team.',
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
    description: 'The project details were updated successfully.',
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
    description: 'The current draft is now in the submitted state for this hackathon.',
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
    description: 'The project was removed from competition before judging preparation.',
    color: 'success'
  })
}

useSeoMeta({
  title: () => `${workspace.currentTeam.value?.name ?? 'Team'} | ${hackathon.value.name} | Codex Hackathons`,
  description: () => `Review team membership and collaboration access for ${hackathon.value.name}.`
})
</script>

<template>
  <AppContainer class="space-y-8 py-10 sm:py-14">
    <section class="space-y-4">
      <NuxtLink
        :to="`/hackathons/${slug}/teams`"
        class="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
      >
        <AppIcon
          name="i-lucide-arrow-left"
          class="size-4"
        />
        Back to teams
      </NuxtLink>

      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="space-y-3">
          <HackathonStateBadge :state="hackathon.state" />

          <div class="space-y-2">
            <h1 class="text-3xl font-semibold tracking-[-0.04em] text-highlighted sm:text-5xl">
              Team Workspace
            </h1>
            <p class="max-w-3xl text-base leading-7 text-toned sm:text-lg">
              Review team membership, join-request activity, and the participant controls that remain active inside {{ hackathon.name }}.
            </p>
          </div>
        </div>

        <AppCard class="border border-default/70 bg-elevated/90 lg:max-w-sm">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Route context
          </p>
          <p class="mt-3 text-sm leading-7 text-toned">
            Team detail stays hackathon-scoped and uses the canonical participant team APIs for membership, join requests, and team-admin changes.
          </p>
        </AppCard>
      </div>
    </section>

    <AppAlert
      v-if="isWorkspaceLoading"
      color="neutral"
      variant="soft"
      title="Loading team workspace"
      description="Resolving the participant actor, application status, and team detail for this route."
    />

    <AppAlert
      v-else-if="workspace.actorErrorMessage.value"
      color="error"
      variant="soft"
      title="Unable to resolve team access"
      :description="workspace.actorErrorMessage.value"
    />

    <template v-else-if="actor?.kind === 'authenticated_identity'">
      <AppAlert
        color="warning"
        variant="soft"
        title="Platform account required"
        description="Complete the platform account before you can enter the participant team workspace."
      />

      <AppButton
        :to="accountSettingsHref"
        color="warning"
        icon="i-lucide-id-card"
      >
        Complete platform account
      </AppButton>
    </template>

    <template v-else-if="actor?.kind === 'platform_user'">
      <AppAlert
        v-if="workspace.visibleHackathonErrorMessage.value"
        color="error"
        variant="soft"
        title="Unable to resolve hackathon access"
        :description="workspace.visibleHackathonErrorMessage.value"
      />

      <AppAlert
        v-else-if="!workspace.visibleHackathonId.value"
        color="error"
        variant="soft"
        title="Hackathon workspace unavailable"
        description="This authenticated route could not resolve the visible hackathon record needed for participant team work."
      />

      <AppAlert
        v-else-if="workspace.ownApplicationErrorMessage.value"
        color="error"
        variant="soft"
        title="Unable to resolve your application status"
        :description="workspace.ownApplicationErrorMessage.value"
      />

      <AppAlert
        v-else-if="workspace.currentTeamErrorMessage.value"
        color="error"
        variant="soft"
        title="Team workspace unavailable"
        :description="workspace.currentTeamErrorMessage.value"
      />

      <template v-else-if="workspace.currentTeam.value">
        <AppAlert
          v-if="workspace.mutationError.value"
          color="error"
          variant="soft"
          title="Team action failed"
          :description="workspace.mutationError.value"
        />

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
            @request-join="requestToJoinCurrentTeam"
            @cancel-join-request="cancelCurrentPendingJoinRequest"
            @leave-team="leaveCurrentTeam"
          />

          <ParticipantTeamSubmissionPanel
            v-if="canViewSubmission"
            v-model:form="submissionForm"
            :team-id="workspace.currentTeam.value.id"
            :hackathon-state="hackathon.state"
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
    </template>
  </AppContainer>
</template>
