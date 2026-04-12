<script setup lang="ts">
import type {
  TeamActionAvailability,
  TeamDetailRecord,
  TeamJoinRequestRecord,
  TeamMemberRecord,
  TeamUserSummary
} from '~/utils/team-workspace'

import { formatTimestamp } from '~/utils/date-formatting'
import {
  formatTeamJoinRequestStatus,
  formatTeamMemberRole,
  getTeamJoinRequestStatusColor,
  hasTeamReachedMemberLimit
} from '~/utils/team-workspace'
import { Switch as UiSwitch } from '~/components/ui/switch'
import { teamProfileFormSchema } from '~/utils/form-schemas'
import { cloneFormValues } from '~/utils/form-values'

const settings = defineModel<{
  name: string
  bio: string
  isOpenToJoinRequests: boolean
}>('settings', {
  required: true
})

const props = defineProps<{
  team: TeamDetailRecord
  maxTeamMembers: number
  membership?: TeamMemberRecord | null
  canManageTeam?: boolean
  isTeamLocked?: boolean
  joinAvailability: TeamActionAvailability
  joinPolicyAvailability?: TeamActionAvailability
  leaveAvailability: TeamActionAvailability
  pendingJoinRequestId?: string | null
  pendingActionKey?: string | null
  removalAvailabilityByUserId?: Record<string, TeamActionAvailability>
  joinRequests?: TeamJoinRequestRecord[]
  joinRequestsStatus?: 'idle' | 'pending' | 'success' | 'error'
  joinRequestsErrorMessage?: string
  showMembershipActions?: boolean
}>()

const emit = defineEmits<{
  submitProfile: []
  toggleJoinPolicy: [value: boolean]
  requestJoin: [teamId: string]
  cancelJoinRequest: [payload: {
    teamId: string
    requestId: string | null
  }]
  leaveTeam: []
  copyTeamLink: []
  removeMember: [userId: string]
  approveRequest: [requestId: string]
  rejectRequest: [requestId: string]
}>()

function isActionPending(actionKey: string) {
  return props.pendingActionKey === actionKey
}

function getDecisionButtonClass(tone: 'approve' | 'reject', isActive: boolean) {
  const baseClass = 'inline-flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45'

  if (isActive) {
    switch (tone) {
      case 'approve':
        return `${baseClass} border-success/30 bg-success/12 text-success hover:bg-success/16`
      case 'reject':
        return `${baseClass} border-error/30 bg-error/12 text-error hover:bg-error/16`
    }
  }

  return `${baseClass} border-black/8 bg-transparent text-toned hover:border-black/20 hover:text-highlighted dark:border-white/[0.08] dark:hover:border-white/[0.18] dark:hover:text-white`
}

function getUserProfileLinks(user?: TeamUserSummary | null) {
  const links: Array<{
    key: 'github' | 'linkedin' | 'x'
    label: 'GitHub' | 'LinkedIn' | 'X'
    href: string
  }> = []

  const githubProfileUrl = user?.githubProfileUrl?.trim()
  const linkedinProfileUrl = user?.linkedinProfileUrl?.trim()
  const xProfileUrl = user?.xProfileUrl?.trim()

  if (githubProfileUrl) {
    links.push({
      key: 'github',
      label: 'GitHub',
      href: githubProfileUrl
    })
  }

  if (linkedinProfileUrl) {
    links.push({
      key: 'linkedin',
      label: 'LinkedIn',
      href: linkedinProfileUrl
    })
  }

  if (xProfileUrl) {
    links.push({
      key: 'x',
      label: 'X',
      href: xProfileUrl
    })
  }

  return links
}

const errors = reactive({
  name: '',
  bio: ''
})
const submitCount = ref(0)
const isEditingProfile = ref(false)

const isPersisted = computed(() => props.team.isPersisted !== false)
const showMembershipActions = computed(() => props.showMembershipActions ?? true)
const showHeaderLeaveAction = computed(() =>
  Boolean(props.membership) && showMembershipActions.value
)
const hasPendingJoinRequests = computed(() =>
  (props.joinRequests ?? []).some(request => request.status === 'pending')
)
const showJoinRequestsPanel = computed(() =>
  Boolean(props.canManageTeam) && (settings.value.isOpenToJoinRequests || hasPendingJoinRequests.value)
)
const isSoloWorkspace = computed(() => props.team.workspaceMode === 'solo')
const joinPolicySwitchId = computed(() => `team-join-policy-${props.team.id}`)
const activeMemberCount = computed(() => props.team.activeMemberCount ?? props.team.members.length)
const showRequestJoinAction = computed(() =>
  Boolean(props.pendingJoinRequestId) || props.team.isOpenToJoinRequests
)
const canManageTeamSettings = computed(() =>
  Boolean(props.canManageTeam) && (props.joinPolicyAvailability?.isAllowed ?? true)
)
const showLockedBadge = computed(() =>
  Boolean(props.membership) && Boolean(props.isTeamLocked)
)
const showJoinPolicyToggle = computed(() => !isSoloWorkspace.value && canManageTeamSettings.value)
const joinPolicyStatusText = computed(() =>
  settings.value.isOpenToJoinRequests ? 'Open to join requests' : 'Closed to join requests'
)
const isJoinCapacityReached = computed(() =>
  !props.membership && hasTeamReachedMemberLimit(props.maxTeamMembers, activeMemberCount.value)
)
const participantTeamStatusLabel = computed(() =>
  isJoinCapacityReached.value
    ? 'Member limit reached'
    : props.team.isOpenToJoinRequests
      ? 'Open to join requests'
      : 'Closed to join requests'
)
const participantTeamStatusColor = computed(() =>
  isJoinCapacityReached.value
    ? 'warning'
    : props.team.isOpenToJoinRequests
      ? 'success'
      : 'neutral'
)
const showSoloWorkspaceHint = computed(() =>
  isSoloWorkspace.value && Boolean(props.membership)
)

function validateTeamProfile() {
  errors.name = ''
  errors.bio = ''

  const result = teamProfileFormSchema.safeParse(cloneFormValues(settings.value))

  if (result.success) {
    return true
  }

  const fieldErrors = result.error.flatten().fieldErrors
  errors.name = fieldErrors.name?.[0] ?? ''
  errors.bio = fieldErrors.bio?.[0] ?? ''
  return false
}

function submitProfileForm() {
  submitCount.value += 1

  if (!validateTeamProfile()) {
    return
  }

  isEditingProfile.value = false
  emit('submitProfile')
}

function startEditingProfile() {
  settings.value.name = props.team.name
  settings.value.bio = props.team.bio ?? ''
  errors.name = ''
  errors.bio = ''
  submitCount.value = 0
  isEditingProfile.value = true
}

function cancelEditingProfile() {
  settings.value.name = props.team.name
  settings.value.bio = props.team.bio ?? ''
  errors.name = ''
  errors.bio = ''
  submitCount.value = 0
  isEditingProfile.value = false
}
</script>

<template>
  <AppCard
    data-testid="participant-team-workspace-panel"
    class="rounded-xl hackathon-workspace-detail-panel"
  >
    <template #header>
      <div class="space-y-3">
        <div
          v-if="canManageTeamSettings && isEditingProfile"
          class="flex flex-col gap-4"
        >
          <form
            class="flex min-w-0 flex-1 flex-col gap-4"
            @submit.prevent="submitProfileForm"
          >
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div class="flex min-w-0 flex-1 flex-col gap-3">
                <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <AppButton
                    color="neutral"
                    variant="outline"
                    size="sm"
                    icon="i-lucide-copy"
                    class="h-8 w-8 shrink-0 gap-0 px-0"
                    aria-label="Copy team link"
                    @click="emit('copyTeamLink')"
                  >
                    <span class="sr-only">Copy team link</span>
                  </AppButton>

                  <div class="min-w-0 flex-1 space-y-2">
                    <label
                      :for="`team-name-inline-${team.id}`"
                      class="sr-only"
                    >
                      Team name
                    </label>
                    <AppInput
                      :id="`team-name-inline-${team.id}`"
                      v-model="settings.name"
                      size="xl"
                      class="w-full"
                      :class="submitCount > 0 && errors.name ? 'border-error/45 focus:border-error dark:border-error/50' : ''"
                      :disabled="isPersisted && isActionPending(`update-team:${team.id}`)"
                    />
                    <p
                      v-if="submitCount > 0 && errors.name"
                      class="text-xs text-error"
                    >
                      {{ errors.name }}
                    </p>
                  </div>

                  <AppButton
                    type="submit"
                    color="primary"
                    class="shrink-0"
                    :loading="isPersisted && isActionPending(`update-team:${team.id}`)"
                    :disabled="isPersisted && isActionPending(`update-team:${team.id}`)"
                    data-testid="participant-team-update-profile"
                  >
                    Save
                  </AppButton>

                  <AppButton
                    type="button"
                    color="neutral"
                    variant="outline"
                    class="shrink-0"
                    :disabled="isPersisted && isActionPending(`update-team:${team.id}`)"
                    @click="cancelEditingProfile"
                  >
                    Cancel
                  </AppButton>
                </div>

                <div class="space-y-2">
                  <label
                    :for="`team-bio-inline-${team.id}`"
                    class="text-sm font-medium text-highlighted"
                  >
                    Team bio
                  </label>
                  <AppTextarea
                    :id="`team-bio-inline-${team.id}`"
                    v-model="settings.bio"
                    rows="4"
                    placeholder="Share a short introduction about your team, what you are building, or how you work together."
                    :class="submitCount > 0 && errors.bio ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
                    :disabled="isPersisted && isActionPending(`update-team:${team.id}`)"
                  />
                  <p
                    v-if="submitCount > 0 && errors.bio"
                    class="text-xs text-error"
                  >
                    {{ errors.bio }}
                  </p>
                </div>
              </div>

              <div class="flex shrink-0 flex-col items-start gap-3 md:items-end">
                <AppBadge
                  v-if="membership"
                  :color="membership.role === 'admin' ? 'primary' : 'neutral'"
                  :variant="membership.role === 'admin' ? 'soft' : 'outline'"
                >
                  {{ membership.role === 'admin' ? 'Team admin' : 'Team member' }}
                </AppBadge>

                <AppBadge
                  v-if="showLockedBadge"
                  color="neutral"
                  variant="outline"
                  class="border-black/16 bg-white/75 text-neutral-700 dark:border-white/[0.18] dark:bg-white/[0.03] dark:text-[#D0D0D0]"
                >
                  Locked
                </AppBadge>

                <template v-if="!isSoloWorkspace">
                  <div
                    v-if="showJoinPolicyToggle"
                    class="flex items-center gap-3"
                  >
                    <UiSwitch
                      :id="joinPolicySwitchId"
                      :model-value="settings.isOpenToJoinRequests"
                      :disabled="isPersisted && isActionPending(`update-team-join-policy:${team.id}`)"
                      @update:model-value="emit('toggleJoinPolicy', $event)"
                    />
                    <label
                      :for="joinPolicySwitchId"
                      class="text-sm font-medium text-toned"
                    >
                      {{ joinPolicyStatusText }}
                    </label>
                  </div>

                  <p
                    v-else
                    class="text-sm font-medium text-toned"
                  >
                    {{ joinPolicyStatusText }}
                  </p>
                </template>
              </div>
            </div>
          </form>
        </div>

        <div
          v-else
          class="flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <div class="min-w-0 space-y-3">
            <div class="flex min-w-0 flex-wrap items-center gap-3">
              <AppButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-copy"
                class="h-8 w-8 shrink-0 gap-0 px-0"
                aria-label="Copy team link"
                @click="emit('copyTeamLink')"
              >
                <span class="sr-only">Copy team link</span>
              </AppButton>

              <h2 class="text-2xl font-semibold text-highlighted dark:text-white">
                {{ team.name }}
              </h2>

              <AppButton
                v-if="canManageTeamSettings"
                variant="outline"
                color="neutral"
                size="sm"
                icon="i-lucide-pencil"
                class="h-8 w-8 shrink-0 gap-0 px-0"
                aria-label="Edit team profile"
                data-testid="participant-team-edit-name"
                @click="startEditingProfile"
              >
                <span class="sr-only">Edit team profile</span>
              </AppButton>

              <AppBadge
                v-if="membership"
                :color="membership.role === 'admin' ? 'primary' : 'neutral'"
                :variant="membership.role === 'admin' ? 'solid' : 'outline'"
              >
                {{ membership.role === 'admin' ? 'Team admin' : 'Team member' }}
              </AppBadge>

              <AppBadge
                v-if="showLockedBadge"
                color="neutral"
                variant="outline"
                class="border-black/16 bg-white/75 text-neutral-700 dark:border-white/[0.18] dark:bg-white/[0.03] dark:text-[#D0D0D0]"
              >
                Locked
              </AppBadge>

              <AppBadge
                v-if="!isSoloWorkspace"
                color="neutral"
                variant="soft"
              >
                Members {{ activeMemberCount }}/{{ maxTeamMembers }}
              </AppBadge>

              <AppBadge
                v-if="isSoloWorkspace"
                color="warning"
                variant="soft"
              >
                Solo Team
              </AppBadge>

              <AppBadge
                v-if="!canManageTeam && !isSoloWorkspace"
                :color="participantTeamStatusColor"
                variant="outline"
                :class="team.isOpenToJoinRequests ? '' : 'border-black/16 bg-white/75 text-neutral-700 dark:border-white/[0.18] dark:bg-white/[0.03] dark:text-[#D0D0D0]'"
              >
                {{ participantTeamStatusLabel }}
              </AppBadge>
            </div>

            <div class="space-y-1">
              <p
                v-if="!isSoloWorkspace"
                class="text-sm text-neutral-600 dark:text-[#A3A3A3]"
              >
                Everyone on the team appears here.
              </p>

              <p
                v-if="team.bio"
                class="max-w-3xl whitespace-pre-line text-sm text-toned"
              >
                {{ team.bio }}
              </p>
            </div>
          </div>

          <div
            v-if="canManageTeam || showHeaderLeaveAction"
            class="flex shrink-0 flex-wrap items-center justify-end gap-3 self-end sm:ml-auto sm:self-start"
          >
            <div
              v-if="canManageTeam && !isSoloWorkspace"
              class="flex items-center gap-3"
            >
              <template v-if="showJoinPolicyToggle">
                <UiSwitch
                  :id="joinPolicySwitchId"
                  :model-value="settings.isOpenToJoinRequests"
                  :disabled="isPersisted && isActionPending(`update-team-join-policy:${team.id}`)"
                  @update:model-value="emit('toggleJoinPolicy', $event)"
                />
                <label
                  :for="joinPolicySwitchId"
                  class="text-sm font-medium text-toned"
                >
                  {{ joinPolicyStatusText }}
                </label>
              </template>

              <p
                v-else
                class="text-sm font-medium text-toned"
              >
                {{ joinPolicyStatusText }}
              </p>
            </div>

            <AppButton
              v-if="showHeaderLeaveAction"
              color="error"
              size="sm"
              :loading="isActionPending(`leave-team:${team.id}`)"
              :disabled="!leaveAvailability.isAllowed || isActionPending(`leave-team:${team.id}`)"
              data-testid="participant-team-leave"
              @click="emit('leaveTeam')"
            >
              Leave team
            </AppButton>
          </div>
        </div>
      </div>
    </template>

    <div class="space-y-6">
      <p
        v-if="showSoloWorkspaceHint"
        class="text-sm text-neutral-600 dark:text-[#A3A3A3]"
      >
        You are participating as solo. Leave the team to join other teams.
      </p>

      <section
        v-if="showMembershipActions && !membership"
        class="app-inset-card px-5 py-5"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-2">
            <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
              <h3 class="text-lg font-semibold text-highlighted dark:text-white">
                Membership actions
              </h3>
            </div>
            <p
              v-if="!joinAvailability.isAllowed && joinAvailability.reason"
              class="text-sm text-muted"
            >
              {{ joinAvailability.reason }}
            </p>
            <p
              v-else
              class="text-sm text-muted"
            >
              Request to join this team if collaboration is still open.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <AppButton
              v-if="pendingJoinRequestId"
              color="warning"
              variant="soft"
              :loading="isActionPending(`cancel-join-request:${pendingJoinRequestId}`)"
              :disabled="isActionPending(`cancel-join-request:${pendingJoinRequestId}`)"
              data-testid="participant-team-cancel-pending-request"
              @click="emit('cancelJoinRequest', {
                teamId: team.id,
                requestId: pendingJoinRequestId
              })"
            >
              Cancel pending request
            </AppButton>

            <AppButton
              v-else-if="showRequestJoinAction && joinAvailability.isAllowed"
              color="primary"
              :loading="isActionPending(`join-team:${team.id}`)"
              :disabled="isActionPending(`join-team:${team.id}`)"
              data-testid="participant-team-request-join"
              @click="emit('requestJoin', team.id)"
            >
              Request to join
            </AppButton>
          </div>
        </div>
      </section>

      <section :class="canManageTeam && !isSoloWorkspace ? 'grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]' : 'grid gap-6'">
        <div
          v-if="!isSoloWorkspace"
          class="grid gap-4"
        >
          <article
            v-for="member in team.members"
            :key="member.id"
            :data-testid="`participant-team-member-${member.userId}`"
            class="rounded-2xl border border-black/8 bg-white/80 px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div class="space-y-2">
                <div class="flex flex-wrap items-center gap-3">
                  <h4 class="text-base font-semibold text-highlighted dark:text-white">
                    {{ member.user?.displayName ?? member.userId }}
                  </h4>

                  <AppBadge
                    :color="member.role === 'admin' ? 'primary' : 'neutral'"
                    variant="soft"
                  >
                    {{ formatTeamMemberRole(member.role) }}
                  </AppBadge>

                  <AppBadge
                    v-if="membership?.id === member.id"
                    color="info"
                    variant="soft"
                  >
                    You
                  </AppBadge>
                </div>

                <p class="text-sm text-toned">
                  <template v-if="member.user?.email">
                    {{ member.user.email }}<span v-if="isPersisted"> • Joined {{ formatTimestamp(member.joinedAt) }}</span>
                  </template>
                  <template v-else-if="isPersisted">
                    Joined {{ formatTimestamp(member.joinedAt) }}
                  </template>
                </p>

                <p
                  v-if="canManageTeam && membership?.id !== member.id && removalAvailabilityByUserId?.[member.userId] && !removalAvailabilityByUserId?.[member.userId]?.isAllowed"
                  class="text-sm text-muted"
                >
                  {{ removalAvailabilityByUserId?.[member.userId]?.reason }}
                </p>

                <div
                  v-if="getUserProfileLinks(member.user).length > 0"
                  class="flex flex-wrap gap-2"
                >
                  <a
                    v-for="link in getUserProfileLinks(member.user)"
                    :key="link.key"
                    :href="link.href"
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center gap-0.5 rounded-full border border-black/10 px-2 py-0.5 text-xs font-medium text-sky-700 transition hover:border-black/20 hover:text-sky-800 dark:border-white/[0.12] dark:text-sky-300 dark:hover:border-white/[0.22] dark:hover:text-sky-200"
                  >
                    {{ link.label }}
                    <AppIcon
                      name="i-lucide-external-link"
                      class="size-2.5"
                    />
                  </a>
                </div>
              </div>

              <AppButton
                v-if="canManageTeam && membership?.id !== member.id"
                color="warning"
                variant="soft"
                :loading="pendingActionKey === `remove-team-member:${team.id}:${member.userId}`"
                :disabled="!removalAvailabilityByUserId?.[member.userId]?.isAllowed || pendingActionKey === `remove-team-member:${team.id}:${member.userId}`"
                :data-testid="`participant-team-remove-${member.userId}`"
                @click="emit('removeMember', member.userId)"
              >
                Remove member
              </AppButton>
            </div>
          </article>
        </div>

        <div
          v-if="showJoinRequestsPanel"
          data-testid="participant-team-join-requests-panel"
          class="space-y-4 app-inset-card px-5 py-5"
        >
          <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
            <h3 class="text-lg font-semibold text-highlighted dark:text-white">
              Join requests
            </h3>
            <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
              Team admins review pending requests here.
            </p>
          </div>

          <AppAlert
            v-if="joinRequestsErrorMessage"
            color="error"
            variant="soft"
            title="Join requests unavailable"
            :description="joinRequestsErrorMessage"
          />

          <AppAlert
            v-else-if="joinRequestsStatus === 'pending'"
            color="neutral"
            variant="soft"
            title="Loading join requests"
            description="Pending join requests are still loading for this team."
          />

          <AppAlert
            v-else-if="!isPersisted"
            color="neutral"
            variant="soft"
            title="No join requests yet"
            description="Join requests will appear here after you save or share this team."
          />

          <div
            v-else-if="(joinRequests?.length ?? 0) > 0"
            class="grid gap-4"
          >
            <article
              v-for="request in joinRequests"
              :key="request.id"
              :data-testid="`participant-team-join-request-${request.id}`"
              class="rounded-2xl border border-black/8 bg-white/80 px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]"
            >
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0 flex-1 space-y-2">
                  <div class="flex flex-wrap items-center gap-3">
                    <h4 class="text-base font-semibold text-highlighted dark:text-white">
                      {{ request.user?.displayName ?? request.userId }}
                    </h4>

                    <AppBadge
                      :color="getTeamJoinRequestStatusColor(request.status)"
                      variant="soft"
                    >
                      {{ formatTeamJoinRequestStatus(request.status) }}
                    </AppBadge>
                  </div>

                  <p class="text-sm text-toned">
                    {{ request.user?.email ?? request.userId }}
                  </p>

                  <div
                    v-if="getUserProfileLinks(request.user).length > 0"
                    class="flex flex-wrap gap-2"
                  >
                    <a
                      v-for="link in getUserProfileLinks(request.user)"
                      :key="link.key"
                      :href="link.href"
                      target="_blank"
                      rel="noreferrer"
                      class="inline-flex items-center gap-0.5 rounded-full border border-black/10 px-2 py-0.5 text-xs font-medium text-sky-700 transition hover:border-black/20 hover:text-sky-800 dark:border-white/[0.12] dark:text-sky-300 dark:hover:border-white/[0.22] dark:hover:text-sky-200"
                    >
                      {{ link.label }}
                      <AppIcon
                        name="i-lucide-external-link"
                        class="size-2.5"
                      />
                    </a>
                  </div>
                </div>

                <div
                  v-if="request.status === 'pending'"
                  class="grid gap-2 shrink-0 sm:min-w-44"
                >
                  <button
                    type="button"
                    :class="getDecisionButtonClass('approve', pendingActionKey === `approve-join-request:${request.id}`)"
                    :disabled="pendingActionKey !== null && pendingActionKey !== `approve-join-request:${request.id}`"
                    :data-testid="`participant-team-approve-request-${request.id}`"
                    @click="emit('approveRequest', request.id)"
                  >
                    <span>Approve</span>
                    <AppIcon
                      v-if="pendingActionKey === `approve-join-request:${request.id}`"
                      name="i-lucide-loader-circle"
                      class="size-4 animate-spin"
                    />
                    <AppIcon
                      v-else
                      name="i-lucide-thumbs-up"
                      class="size-4"
                    />
                  </button>

                  <button
                    type="button"
                    :class="getDecisionButtonClass('reject', pendingActionKey === `reject-join-request:${request.id}`)"
                    :disabled="pendingActionKey !== null && pendingActionKey !== `reject-join-request:${request.id}`"
                    :data-testid="`participant-team-reject-request-${request.id}`"
                    @click="emit('rejectRequest', request.id)"
                  >
                    <span>Reject</span>
                    <AppIcon
                      v-if="pendingActionKey === `reject-join-request:${request.id}`"
                      name="i-lucide-loader-circle"
                      class="size-4 animate-spin"
                    />
                    <AppIcon
                      v-else
                      name="i-lucide-thumbs-down"
                      class="size-4"
                    />
                  </button>
                </div>
              </div>
            </article>
          </div>

          <AppAlert
            v-else
            color="neutral"
            variant="soft"
            title="No join requests yet"
            description="Join requests will appear here once another approved participant asks to join this team."
          />
        </div>
      </section>
    </div>
  </AppCard>
</template>
