<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'
import type { TeamSubmissionRecord } from '~/utils/team-submission'
import type { TeamActionAvailability } from '~/utils/team-workspace'

import ParticipantTeamSubmissionPanel from '~/components/teams/ParticipantTeamSubmissionPanel.vue'
import ParticipantTeamWorkspacePanel from '~/components/teams/ParticipantTeamWorkspacePanel.vue'
import { Switch as UiSwitch } from '~/components/ui/switch'
import { cloneFormValues } from '~/utils/form-values'
import { teamProfileFormSchema } from '~/utils/form-schemas'
import {
  getCreateTeamAvailability,
  getLeaveTeamAvailability,
  getMemberRemovalAvailability,
  getReplaceSoloTeamAvailability,
  getTeamFormationAvailability,
  getUpdateJoinPolicyAvailability,
  hasTeamReachedMemberLimit
} from '~/utils/team-workspace'
import {
  getCreateSubmissionAvailability,
  getSubmitSubmissionAvailability,
  getUpdateSubmissionAvailability,
  getWithdrawSubmissionAvailability,
  shouldShowParticipantSubmissionWorkspace
} from '~/utils/team-submission'
import {
  buildAbsoluteAccountHackathonTeamsTabHref,
  buildAccountHackathonTeamsTabHref
} from '~/utils/team-query'

const props = defineProps<{
  hackathon: PublicHackathon & {
    id: string
  }
  applicationStatus: 'submitted' | 'approved' | 'rejected' | 'withdrawn' | null
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
const createTeamForm = reactive({
  name: '',
  bio: '',
  isOpenToJoinRequests: true
})
const submissionForm = reactive({
  projectName: '',
  summary: '',
  repositoryUrl: '',
  demoUrl: ''
})
const createTeamErrors = reactive({
  name: '',
  bio: ''
})
const createTeamSubmitCount = ref(0)

const actor = computed(() => workspace.actor.value)
const ownApplicationStatus = computed(() => props.applicationStatus)
const displayedTeam = computed(() => workspace.currentTeam.value ?? workspace.ownTeam.value)
const displayedTeamMembership = computed(() =>
  workspace.currentTeamMembership.value ?? workspace.ownTeamMembership.value
)
const canManageTeam = computed(() => workspace.isCurrentTeamAdmin.value)
const isSoloWorkspace = computed(() => displayedTeam.value?.workspaceMode === 'solo')
const defaultSoloTeamName = computed(() => {
  if (actor.value?.kind !== 'platform_user') {
    return 'Team Solo'
  }

  const fullName = `${actor.value.platformUser.firstName} ${actor.value.platformUser.familyName}`.trim()
  const preferredName = fullName
    || actor.value.platformUser.displayName.trim()
    || actor.value.sessionUser.name?.trim()
    || actor.value.sessionUser.nickname?.trim()
    || 'Solo'

  return `Team ${preferredName}`.trim()
})

watch(() => displayedTeam.value, (team) => {
  teamSettings.name = team?.name ?? ''
  teamSettings.bio = team?.bio ?? ''
  teamSettings.isOpenToJoinRequests = team?.isOpenToJoinRequests ?? false
}, {
  immediate: true
})

const teamFormationAvailability = computed(() =>
  getTeamFormationAvailability(props.hackathon, ownApplicationStatus.value, Boolean(workspace.ownTeam.value))
)
const createTeamAvailability = computed(() =>
  getCreateTeamAvailability(props.hackathon, ownApplicationStatus.value, Boolean(workspace.ownTeam.value))
)
const replaceSoloTeamAvailability = computed(() =>
  getReplaceSoloTeamAvailability(props.hackathon, ownApplicationStatus.value, isSoloWorkspace.value)
)
const joinPolicyAvailability = computed(() =>
  getUpdateJoinPolicyAvailability(props.hackathon, canManageTeam.value)
)
const joinAvailability = computed<TeamActionAvailability>(() => ({
  isAllowed: false,
  reason: 'Join actions are available from the Teams tab.'
}))
const teamsTabHref = computed(() => buildAccountHackathonTeamsTabHref(props.hackathon.slug))
const showSubmissionSection = computed(() => Boolean(displayedTeam.value))
const showClosedSubmissionCountdown = computed(() =>
  showSubmissionSection.value && props.hackathon.state === 'registration_open'
)
const canViewSubmission = computed(() =>
  shouldShowParticipantSubmissionWorkspace(props.hackathon, Boolean(displayedTeam.value))
)
const submissionWorkspace = useTeamSubmissionWorkspace(
  computed(() => props.hackathon),
  {
    visibleHackathonId: workspace.visibleHackathonId,
    team: displayedTeam,
    canViewSubmission,
    canManageSubmission: canManageTeam,
    initialSubmission: computed(() => props.initialSubmission),
    hasInitialSubmissionState: computed(() => Boolean(props.initialSubmission))
  }
)
const hasActiveTeamSubmission = computed(() => {
  const status = submissionWorkspace.currentSubmission.value?.status
  return status === 'draft' || status === 'submitted'
})
const leaveAvailability = computed(() => {
  if (!displayedTeam.value) {
    return {
      isAllowed: false,
      reason: 'The current team could not be loaded.'
    } satisfies TeamActionAvailability
  }

  return getLeaveTeamAvailability(
    props.hackathon,
    displayedTeam.value,
    displayedTeamMembership.value,
    {
      hasActiveSubmission: hasActiveTeamSubmission.value
    }
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
const isDisplayedTeamFull = computed(() =>
  displayedTeam.value
    ? hasTeamReachedMemberLimit(
        props.hackathon.maxTeamMembers,
        displayedTeam.value.activeMemberCount ?? displayedTeam.value.members.length
      )
    : false
)
const showMembershipActions = computed(() => {
  if (!displayedTeamMembership.value) {
    return !isDisplayedTeamFull.value
  }

  return leaveAvailability.value.isAllowed
})

watch(() => submissionWorkspace.currentSubmission.value, (submission) => {
  submissionForm.projectName = submission?.projectName ?? ''
  submissionForm.summary = submission?.summary ?? ''
  submissionForm.repositoryUrl = submission?.repositoryUrl ?? ''
  submissionForm.demoUrl = submission?.demoUrl ?? ''
}, {
  immediate: true
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
const submissionUnavailableDescription = computed(() => {
  return 'The current submission surface could not be resolved right now.'
})
const isWorkspaceLoading = computed(() => {
  if (workspace.actorStatus.value === 'idle' || workspace.actorStatus.value === 'pending') {
    return true
  }

  if (!actor.value || actor.value.kind !== 'platform_user') {
    return false
  }

  return workspace.ownApplicationStatus.value === 'idle'
    || workspace.ownApplicationStatus.value === 'pending'
    || workspace.ownTeamStatus.value === 'idle'
    || workspace.ownTeamStatus.value === 'pending'
})

function buildSubmissionInput() {
  return {
    projectName: submissionForm.projectName.trim(),
    summary: submissionForm.summary.trim(),
    repositoryUrl: submissionForm.repositoryUrl.trim(),
    demoUrl: submissionForm.demoUrl.trim()
  }
}

function resetCreateTeamErrors() {
  createTeamErrors.name = ''
  createTeamErrors.bio = ''
}

function validateCreateTeamForm() {
  resetCreateTeamErrors()

  const result = teamProfileFormSchema.safeParse(cloneFormValues(createTeamForm))

  if (result.success) {
    return true
  }

  const fieldErrors = result.error.flatten().fieldErrors
  createTeamErrors.name = fieldErrors.name?.[0] ?? ''
  createTeamErrors.bio = fieldErrors.bio?.[0] ?? ''
  return false
}

async function participateAsSolo() {
  const createdTeam = await workspace.createTeam({
    name: defaultSoloTeamName.value,
    bio: '',
    isOpenToJoinRequests: false,
    workspaceMode: 'solo'
  })

  if (!createdTeam) {
    return
  }

  toast.add({
    title: 'Solo participation confirmed',
    description: 'Your solo workspace is now active.',
    color: 'success'
  })
}

async function submitCreateTeamForm() {
  createTeamSubmitCount.value += 1

  if (!validateCreateTeamForm()) {
    return
  }

  const createdTeam = await workspace.createTeam({
    name: createTeamForm.name,
    bio: createTeamForm.bio,
    isOpenToJoinRequests: createTeamForm.isOpenToJoinRequests,
    workspaceMode: 'team',
    replaceOwnSoloTeam: isSoloWorkspace.value
  })

  if (!createdTeam) {
    return
  }

  createTeamForm.name = ''
  createTeamForm.bio = ''
  createTeamForm.isOpenToJoinRequests = true
  createTeamSubmitCount.value = 0
  resetCreateTeamErrors()

  toast.add({
    title: 'Team created',
    description: isSoloWorkspace.value
      ? 'Your solo workspace was replaced with the new team.'
      : 'Your team workspace is ready.',
    color: 'success'
  })
}

async function copyCurrentTeamLink() {
  if (!displayedTeam.value || !import.meta.client || !window.isSecureContext || !navigator.clipboard) {
    toast.add({
      title: 'Copy unavailable',
      description: 'This browser could not copy the team link right now.',
      color: 'error'
    })
    return
  }

  try {
    await navigator.clipboard.writeText(buildAbsoluteAccountHackathonTeamsTabHref(
      window.location.origin,
      props.hackathon.slug,
      displayedTeam.value.slug
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

async function submitTeamProfile() {
  const updatedTeam = await workspace.updateCurrentTeamProfile({
    name: teamSettings.name,
    bio: teamSettings.bio
  })

  if (!updatedTeam) {
    return
  }

  toast.add({
    title: 'Team profile updated',
    description: 'The team profile was updated.',
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
  const submission = await submissionWorkspace.createSubmissionDraft(buildSubmissionInput())

  if (!submission) {
    return
  }

  toast.add({
    title: 'Submission draft created',
    description: 'Your draft submission is now saved.',
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
    description: 'Your draft submission was updated.',
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
    description: 'Your submission is now ready for review.',
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
    description: 'The project submission was withdrawn.',
    color: 'success'
  })
}
</script>

<template>
  <div
    data-testid="account-hackathon-workspace-panel"
    class="space-y-6"
  >
    <AppAlert
      v-if="isWorkspaceLoading"
      color="neutral"
      variant="soft"
      title="Loading workspace"
      description="Checking your team and submission access for this hackathon."
    />

    <template v-else-if="actor?.kind === 'platform_user'">
      <AppAlert
        v-if="workspace.actorErrorMessage.value"
        color="error"
        variant="soft"
        title="Unable to resolve workspace access"
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
        title="Workspace unavailable"
        description="The current hackathon could not be resolved for participant actions."
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

        <template v-if="displayedTeam">
          <ParticipantTeamWorkspacePanel
            v-model:settings="teamSettings"
            :team="displayedTeam"
            :max-team-members="props.hackathon.maxTeamMembers"
            :membership="displayedTeamMembership"
            :can-manage-team="canManageTeam"
            :is-team-locked="props.hackathon.state !== 'registration_open' && props.hackathon.state !== 'submission_open'"
            :join-availability="joinAvailability"
            :join-policy-availability="joinPolicyAvailability"
            :leave-availability="leaveAvailability"
            :pending-action-key="workspace.pendingActionKey.value"
            :removal-availability-by-user-id="removalAvailabilityByUserId"
            :join-requests="workspace.teamJoinRequests.value"
            :join-requests-status="workspace.teamJoinRequestsStatus.value"
            :join-requests-error-message="workspace.teamJoinRequestsErrorMessage.value"
            :show-membership-actions="showMembershipActions"
            @copy-team-link="copyCurrentTeamLink"
            @submit-profile="submitTeamProfile"
            @toggle-join-policy="toggleJoinPolicy"
            @leave-team="leaveCurrentTeam"
            @remove-member="removeMember"
            @approve-request="approveJoinRequest"
            @reject-request="rejectJoinRequest"
          />

          <AppCard
            v-if="isSoloWorkspace"
            class="rounded-xl hackathon-workspace-detail-panel"
            :ui="{ body: 'p-5' }"
          >
            <div class="space-y-4">
              <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
                <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                  Create a team
                </h2>
                <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                  Promote your solo workspace into a regular team. This replaces the solo team and keeps you as the new team admin.
                </p>
              </div>

              <p
                v-if="!replaceSoloTeamAvailability.isAllowed && replaceSoloTeamAvailability.reason"
                class="text-sm text-muted"
              >
                {{ replaceSoloTeamAvailability.reason }}
              </p>

              <form
                class="grid gap-4"
                @submit.prevent="submitCreateTeamForm"
              >
                <AppFormField
                  label="Team name"
                  name="participant-create-team-name"
                >
                  <AppInput
                    id="participant-create-team-name"
                    v-model="createTeamForm.name"
                    name="participant-create-team-name"
                    size="xl"
                    :class="createTeamSubmitCount > 0 && createTeamErrors.name ? 'border-error/45 focus:border-error dark:border-error/50' : ''"
                    :disabled="workspace.pendingActionKey.value === 'create-team'"
                  />
                  <p
                    v-if="createTeamSubmitCount > 0 && createTeamErrors.name"
                    class="text-xs text-error"
                  >
                    {{ createTeamErrors.name }}
                  </p>
                </AppFormField>

                <AppFormField
                  label="Team bio"
                  name="participant-create-team-bio"
                >
                  <AppTextarea
                    id="participant-create-team-bio"
                    v-model="createTeamForm.bio"
                    name="participant-create-team-bio"
                    rows="4"
                    :class="createTeamSubmitCount > 0 && createTeamErrors.bio ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
                    :disabled="workspace.pendingActionKey.value === 'create-team'"
                  />
                  <p
                    v-if="createTeamSubmitCount > 0 && createTeamErrors.bio"
                    class="text-xs text-error"
                  >
                    {{ createTeamErrors.bio }}
                  </p>
                </AppFormField>

                <div class="flex items-center gap-3">
                  <UiSwitch
                    id="participant-create-team-open"
                    v-model="createTeamForm.isOpenToJoinRequests"
                    :disabled="workspace.pendingActionKey.value === 'create-team'"
                  />
                  <label
                    for="participant-create-team-open"
                    class="text-sm font-medium text-toned"
                  >
                    {{ createTeamForm.isOpenToJoinRequests ? 'Open to join requests' : 'Closed to join requests' }}
                  </label>
                </div>

                <div>
                  <AppButton
                    type="submit"
                    color="primary"
                    :loading="workspace.pendingActionKey.value === 'create-team'"
                    :disabled="!replaceSoloTeamAvailability.isAllowed || workspace.pendingActionKey.value === 'create-team'"
                  >
                    Create team
                  </AppButton>
                </div>
              </form>
            </div>
          </AppCard>
        </template>

        <section
          v-else
          class="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
        >
          <div class="space-y-6">
            <AppCard
              class="rounded-xl hackathon-workspace-detail-panel"
              :ui="{ body: 'p-5' }"
            >
              <div class="space-y-4">
                <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
                  <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                    Participate as solo
                  </h2>
                  <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                    Confirm solo participation now and keep the compact solo workspace until you decide to create or join a larger team.
                  </p>
                </div>

                <p class="text-sm text-toned">
                  {{ teamFormationAvailability.summary }}
                </p>

                <div>
                  <AppButton
                    color="neutral"
                    variant="solid"
                    class="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                    :loading="workspace.pendingActionKey.value === 'create-team'"
                    :disabled="!createTeamAvailability.isAllowed || workspace.pendingActionKey.value === 'create-team'"
                    @click="participateAsSolo"
                  >
                    Participate as solo
                  </AppButton>
                </div>
              </div>
            </AppCard>

            <AppCard
              class="rounded-xl hackathon-workspace-detail-panel"
              :ui="{ body: 'p-5' }"
            >
              <div class="space-y-4">
                <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
                  <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                    Join a Team
                  </h2>
                  <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                    Browse available teams and send a join request from the Teams tab.
                  </p>
                </div>

                <AppButton
                  :to="teamsTabHref"
                  color="neutral"
                  variant="solid"
                  trailing-icon="i-lucide-arrow-up-right"
                  class="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                >
                  Open Teams
                </AppButton>
              </div>
            </AppCard>
          </div>

          <AppCard
            class="rounded-xl hackathon-workspace-detail-panel"
            :ui="{ body: 'p-5' }"
          >
            <div class="space-y-4">
              <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
                <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                  Create a team
                </h2>
                <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                  Start a regular team now and decide whether to accept join requests from other participants.
                </p>
              </div>

              <p
                v-if="!createTeamAvailability.isAllowed && createTeamAvailability.reason"
                class="text-sm text-muted"
              >
                {{ createTeamAvailability.reason }}
              </p>

              <form
                class="grid gap-4"
                @submit.prevent="submitCreateTeamForm"
              >
                <AppFormField
                  label="Team name"
                  name="participant-create-team-name"
                >
                  <AppInput
                    id="participant-create-team-name"
                    v-model="createTeamForm.name"
                    name="participant-create-team-name"
                    size="xl"
                    :class="createTeamSubmitCount > 0 && createTeamErrors.name ? 'border-error/45 focus:border-error dark:border-error/50' : ''"
                    :disabled="workspace.pendingActionKey.value === 'create-team'"
                  />
                  <p
                    v-if="createTeamSubmitCount > 0 && createTeamErrors.name"
                    class="text-xs text-error"
                  >
                    {{ createTeamErrors.name }}
                  </p>
                </AppFormField>

                <AppFormField
                  label="Team bio"
                  name="participant-create-team-bio"
                >
                  <AppTextarea
                    id="participant-create-team-bio"
                    v-model="createTeamForm.bio"
                    name="participant-create-team-bio"
                    rows="4"
                    :class="createTeamSubmitCount > 0 && createTeamErrors.bio ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
                    :disabled="workspace.pendingActionKey.value === 'create-team'"
                  />
                  <p
                    v-if="createTeamSubmitCount > 0 && createTeamErrors.bio"
                    class="text-xs text-error"
                  >
                    {{ createTeamErrors.bio }}
                  </p>
                </AppFormField>

                <div class="flex items-center gap-3">
                  <UiSwitch
                    id="participant-create-team-open-initial"
                    v-model="createTeamForm.isOpenToJoinRequests"
                    :disabled="workspace.pendingActionKey.value === 'create-team'"
                  />
                  <label
                    for="participant-create-team-open-initial"
                    class="text-sm font-medium text-toned"
                  >
                    {{ createTeamForm.isOpenToJoinRequests ? 'Open to join requests' : 'Closed to join requests' }}
                  </label>
                </div>

                <div>
                  <AppButton
                    type="submit"
                    color="primary"
                    :loading="workspace.pendingActionKey.value === 'create-team'"
                    :disabled="!createTeamAvailability.isAllowed || workspace.pendingActionKey.value === 'create-team'"
                  >
                    Create team
                  </AppButton>
                </div>
              </form>
            </div>
          </AppCard>
        </section>

        <section
          v-if="showSubmissionSection"
          data-testid="account-hackathon-submission-panel"
          class="space-y-6"
        >
          <AppCountdownCard
            v-if="showClosedSubmissionCountdown"
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

          <ParticipantTeamSubmissionPanel
            v-else-if="canViewSubmission && displayedTeam"
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

          <AppCard
            v-else
            class="rounded-xl hackathon-workspace-detail-panel"
          >
            <template #header>
              <div class="space-y-1">
                <h2 class="text-xl font-semibold text-highlighted dark:text-white">
                  Project submission
                </h2>
              </div>
            </template>

            <div class="p-5 pt-0 text-sm text-toned">
              {{ submissionUnavailableDescription }}
            </div>
          </AppCard>
        </section>
      </template>
    </template>

    <AppAlert
      v-else
      color="error"
      variant="soft"
      title="Workspace unavailable"
      description="Participant workspace actions require a platform user session."
    />
  </div>
</template>
