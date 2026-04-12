<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'

import ParticipantTeamSubmissionPanel from '~/components/teams/ParticipantTeamSubmissionPanel.vue'
import { formatTimestamp } from '~/utils/date-formatting'
import {
  getCreateTeamAvailability,
  getTeamFormationAvailability
} from '~/utils/team-workspace'
import {
  getCreateSubmissionAvailability,
  getSubmitSubmissionAvailability,
  getUpdateSubmissionAvailability,
  getWithdrawSubmissionAvailability,
  shouldShowParticipantSubmissionWorkspace
} from '~/utils/team-submission'

const props = defineProps<{
  hackathon: PublicHackathon & {
    id: string
  }
}>()

const toast = useToast()
const workspace = useTeamFormationWorkspace(
  computed(() => props.hackathon)
)

const teamSettings = reactive({
  name: '',
  bio: '',
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
    bio: teamSettings.bio.trim() || null,
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
    teamSettings.bio = currentTeam.bio ?? ''
    teamSettings.isOpenToJoinRequests = currentTeam.isOpenToJoinRequests
    hasSeededProvisionalTeamSettings.value = false
    lastSeededProvisionalTeamName.value = ''
    return
  }

  if (!nextProvisionalTeam) {
    teamSettings.name = ''
    teamSettings.bio = ''
    teamSettings.isOpenToJoinRequests = false
    hasSeededProvisionalTeamSettings.value = false
    lastSeededProvisionalTeamName.value = ''
    return
  }

  if (!hasSeededProvisionalTeamSettings.value) {
    teamSettings.name = nextDefaultSoloTeamName
    teamSettings.bio = ''
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
const showClosedSubmissionCard = computed(() =>
  props.hackathon.state === 'registration_open'
)
const submissionUnavailableDescription = computed(() => {
  if (props.hackathon.state === 'registration_open') {
    return `Project submissions open on ${formatTimestamp(props.hackathon.submissionOpensAt, 'the scheduled submission date')}.`
  }

  if (!displayedTeam.value) {
    return 'There is no active team submission available for your account in this hackathon.'
  }

  if (!displayedTeamMembership.value) {
    return 'Submission access requires an active membership on the current team.'
  }

  return 'The current submission surface could not be resolved right now.'
})
const createTeamAvailability = computed(() =>
  getCreateTeamAvailability(props.hackathon, ownApplicationStatus.value, Boolean(workspace.ownTeam.value))
)
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

function buildSubmissionInput() {
  return {
    projectName: submissionForm.projectName.trim(),
    summary: submissionForm.summary.trim(),
    repositoryUrl: submissionForm.repositoryUrl.trim(),
    demoUrl: submissionForm.demoUrl.trim()
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
    bio: teamSettings.bio,
    isOpenToJoinRequests: teamSettings.isOpenToJoinRequests
  })

  if (!createdTeam) {
    return
  }

  return createdTeam
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
    data-testid="account-hackathon-submission-panel"
    class="space-y-6"
  >
    <AppAlert
      v-if="isWorkspaceLoading"
      color="neutral"
      variant="soft"
      title="Loading submission access"
      description="Checking what submission actions are available to you in this hackathon."
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
        title="Submission access unavailable"
        description="The current hackathon could not be resolved for submission actions."
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
          title="Team setup failed"
          :description="workspace.mutationError.value"
        />

        <AppAlert
          v-if="workspace.ownTeamErrorMessage.value"
          color="warning"
          variant="soft"
          title="Current team membership unresolved"
          :description="workspace.ownTeamErrorMessage.value"
        />

        <AppCard
          v-if="showClosedSubmissionCard"
          class="rounded-xl hackathon-workspace-detail-panel"
        >
          <template #header>
            <div class="space-y-1">
              <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                Submission window not open yet
              </h2>
              <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                You can prepare your team during registration. Submission details open once the hackathon enters the submission phase.
              </p>
            </div>
          </template>

          <div class="app-inset-card px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Submission opens at
            </p>
            <p class="mt-2 text-lg font-semibold text-highlighted dark:text-white">
              {{ formatTimestamp(props.hackathon.submissionOpensAt, 'Not scheduled') }}
            </p>
          </div>
        </AppCard>

        <ParticipantTeamSubmissionPanel
          v-else-if="displayedTeam && canViewSubmission"
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

        <AppAlert
          v-else-if="workspace.currentTeamStatus.value === 'pending'"
          color="neutral"
          variant="soft"
          title="Loading your submission"
          description="Checking the team context for your submission."
        />

        <AppAlert
          v-else-if="workspace.currentTeamErrorMessage.value"
          color="error"
          variant="soft"
          title="Submission unavailable"
          :description="workspace.currentTeamErrorMessage.value"
        />

        <AppAlert
          v-else
          color="neutral"
          variant="soft"
          title="Submission unavailable"
          :description="submissionUnavailableDescription"
        />
      </template>
    </template>

    <AppAlert
      v-else
      color="error"
      variant="soft"
      title="Submission access unavailable"
      description="Participant submission actions require a platform user session."
    />
  </div>
</template>
