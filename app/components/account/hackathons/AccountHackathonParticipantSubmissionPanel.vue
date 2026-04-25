<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'
import type {
  SubmissionTrackOption,
  TeamSubmissionRecord
} from '~/utils/team-submission'

import {
  LazyTeamsParticipantTeamSubmissionPanel as LazyParticipantTeamSubmissionPanel
} from '#components'
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

interface AccountHackathonSubmissionTeam {
  id: string
  name: string
  slug: string
  role: 'member' | 'admin'
}

const props = defineProps<{
  hackathon: PublicHackathon & {
    id: string
    tracks?: SubmissionTrackOption[]
  }
  applicationStatus: 'submitted' | 'approved' | 'rejected' | 'withdrawn' | null
  team: AccountHackathonSubmissionTeam | null
  initialSubmission: TeamSubmissionRecord | null
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
  demoUrl: '',
  trackId: null as string | null
})

const actor = computed(() => workspace.actor.value)
const ownApplicationStatus = computed(() => props.applicationStatus)
const providedTeam = computed(() => props.team
  ? {
      ...props.team,
      isPersisted: true as const
    }
  : null)
const hasPersistedTeam = computed(() =>
  Boolean(workspace.currentTeam.value || workspace.ownTeam.value || providedTeam.value)
)
const teamFormationAvailability = computed(() =>
  getTeamFormationAvailability(props.hackathon, ownApplicationStatus.value, hasPersistedTeam.value)
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
    || hasPersistedTeam.value
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

const displayedTeam = computed(() =>
  workspace.currentTeam.value
  ?? workspace.ownTeam.value
  ?? providedTeam.value
  ?? provisionalCurrentTeam.value
)
const canManageTeam = computed(() =>
  workspace.isCurrentTeamAdmin.value
  || providedTeam.value?.role === 'admin'
  || Boolean(provisionalCurrentTeam.value)
)
const canViewSubmission = computed(() =>
  shouldShowParticipantSubmissionWorkspace(props.hackathon, Boolean(displayedTeam.value))
)
const submissionWorkspace = useTeamSubmissionWorkspace(
  computed(() => props.hackathon),
  {
    visibleHackathonId: computed(() => props.hackathon.id),
    team: displayedTeam,
    canViewSubmission,
    canManageSubmission: canManageTeam,
    initialSubmission: computed(() => props.initialSubmission),
    hasInitialSubmissionState: computed(() => Boolean(providedTeam.value))
  }
)

watch(() => submissionWorkspace.currentSubmission.value, (submission) => {
  submissionForm.projectName = submission?.projectName ?? ''
  submissionForm.summary = submission?.summary ?? ''
  submissionForm.repositoryUrl = submission?.repositoryUrl ?? ''
  submissionForm.demoUrl = submission?.demoUrl ?? ''
  submissionForm.trackId = submission?.trackId ?? null
}, {
  immediate: true
})

const isWorkspaceLoading = computed(() => {
  if (workspace.actorStatus.value === 'idle' || workspace.actorStatus.value === 'pending') {
    return true
  }

  return false
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

  return 'The current submission surface could not be resolved right now.'
})
const createTeamAvailability = computed(() =>
  getCreateTeamAvailability(props.hackathon, ownApplicationStatus.value, hasPersistedTeam.value)
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
    demoUrl: submissionForm.demoUrl.trim(),
    trackId: submissionForm.trackId?.trim() || null
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
    isOpenToJoinRequests: teamSettings.isOpenToJoinRequests,
    workspaceMode: 'team'
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
    description: 'The project was withdrawn before submissions were locked.',
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

      <template v-else>
        <AppAlert
          v-if="workspace.mutationError.value"
          color="error"
          variant="soft"
          title="Team setup failed"
          :description="workspace.mutationError.value"
        />

        <AppAlert
          v-if="!providedTeam && workspace.ownTeamErrorMessage.value"
          color="warning"
          variant="soft"
          title="Current team membership unresolved"
          :description="workspace.ownTeamErrorMessage.value"
        />

        <AppCountdownCard
          v-if="showClosedSubmissionCard"
          title="Submission window not open yet"
          description="You can prepare your team during registration. Submission details open once the hackathon enters the submission phase."
          :target-at="props.hackathon.submissionOpensAt"
          target-label="Submission opens at"
          countdown-label="Submission opens in"
          waiting-title="Scheduled opening time reached"
          waiting-description="The scheduled opening time has passed. Submission actions appear once organizers open the submission phase."
          post-target-state="waiting"
          tone="info"
          :show-seconds="true"
          class="rounded-xl"
        />

        <LazyParticipantTeamSubmissionPanel
          v-else-if="displayedTeam && canViewSubmission"
          v-model:form="submissionForm"
          :team-id="displayedTeam.id"
          :hackathon-state="props.hackathon.state"
          :tracks="props.hackathon.tracks ?? []"
          :submission-requirements="{
            requireSubmissionSummary: props.hackathon.requireSubmissionSummary,
            requireSubmissionRepositoryUrl: props.hackathon.requireSubmissionRepositoryUrl,
            requireSubmissionDemoUrl: props.hackathon.requireSubmissionDemoUrl
          }"
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
