<script setup lang="ts">
import type {
  TeamActionAvailability,
  TeamDetailRecord,
  TeamMemberRecord
} from '~/utils/team-workspace'

import { formatTimestamp } from '~/utils/date-formatting'
import { teamProfileFormSchema } from '~/utils/form-schemas'
import { cloneFormValues } from '~/utils/form-values'
import { buildAbsoluteAccountHackathonTeamTabHref } from '~/utils/team-query'

const settings = defineModel<{
  name: string
  isOpenToJoinRequests: boolean
}>('settings', {
  required: true
})

const props = defineProps<{
  hackathonSlug: string
  team: TeamDetailRecord
  membership?: TeamMemberRecord | null
  canManageTeam?: boolean
  joinAvailability: TeamActionAvailability
  leaveAvailability: TeamActionAvailability
  pendingJoinRequestId?: string | null
  pendingActionKey?: string | null
}>()

const toast = useToast()

const emit = defineEmits<{
  submitProfile: []
  toggleJoinPolicy: [value: boolean]
  requestJoin: [teamId: string]
  cancelJoinRequest: [payload: {
    teamId: string
    requestId: string | null
  }]
  leaveTeam: []
}>()

function isActionPending(actionKey: string) {
  return props.pendingActionKey === actionKey
}

const errors = reactive({
  name: ''
})
const submitCount = ref(0)

function validateTeamProfile() {
  errors.name = ''

  const result = teamProfileFormSchema.safeParse(cloneFormValues(settings.value))

  if (result.success) {
    return true
  }

  const fieldErrors = result.error.flatten().fieldErrors
  errors.name = fieldErrors.name?.[0] ?? ''
  return false
}

function submitProfileForm() {
  submitCount.value += 1

  if (!validateTeamProfile()) {
    return
  }

  emit('submitProfile')
}

async function copyTeamLink() {
  if (!import.meta.client || !window.isSecureContext || !navigator.clipboard) {
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
      props.hackathonSlug,
      props.team.slug
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
  <AppCard
    data-testid="participant-team-workspace-panel"
    class="rounded-xl hackathon-workspace-detail-panel"
  >
    <template #header>
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="text-2xl font-semibold text-highlighted dark:text-white">
              {{ team.name }}
            </h2>

            <AppBadge
              :color="team.isOpenToJoinRequests ? 'success' : 'neutral'"
              variant="soft"
            >
              {{ team.isOpenToJoinRequests ? 'Open to join requests' : 'Closed to join requests' }}
            </AppBadge>

            <AppBadge
              v-if="membership"
              color="primary"
              variant="soft"
            >
              {{ membership.role === 'admin' ? 'Team admin' : 'Team member' }}
            </AppBadge>
          </div>

          <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
            Share this team with a direct link or continue managing collaboration from this tab.
          </p>
        </div>

        <AppButton
          color="neutral"
          variant="outline"
          icon="i-lucide-copy"
          @click="copyTeamLink"
        >
          Copy team link
        </AppButton>
      </div>
    </template>

    <div class="space-y-6">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="app-inset-card px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Team name
          </p>
          <p class="mt-2 text-lg font-semibold text-highlighted">
            {{ team.name }}
          </p>
        </div>

        <div class="app-inset-card px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Active members
          </p>
          <p class="mt-2 text-2xl font-semibold text-highlighted">
            {{ team.activeMemberCount ?? team.members.length }}
          </p>
        </div>

        <div class="app-inset-card px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Created
          </p>
          <p class="mt-2 text-sm font-medium text-highlighted">
            {{ formatTimestamp(team.createdAt) }}
          </p>
        </div>

        <div class="app-inset-card px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Join policy
          </p>
          <p class="mt-2 text-sm font-medium text-highlighted">
            {{ team.isOpenToJoinRequests ? 'Open to new requests' : 'Closed to new requests' }}
          </p>
        </div>
      </div>

      <section
        v-if="canManageTeam"
        class="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
      >
        <div class="space-y-4 app-inset-card px-5 py-5">
          <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
            <h3 class="text-lg font-semibold text-highlighted dark:text-white">
              Team profile
            </h3>
            <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
              Team admins can rename the team while team formation remains open. The team slug updates automatically.
            </p>
          </div>

          <form
            class="space-y-4"
            @submit.prevent="submitProfileForm"
          >
            <AppFormField label="Team name">
              <AppInput
                v-model="settings.name"
                size="xl"
                class="w-full"
                :class="submitCount > 0 && errors.name ? 'border-error/45 focus:border-error dark:border-error/50' : ''"
                :disabled="isActionPending(`update-team:${team.id}`)"
              />
              <p
                v-if="submitCount > 0 && errors.name"
                class="text-xs text-error"
              >
                {{ errors.name }}
              </p>
            </AppFormField>

            <AppButton
              type="submit"
              color="primary"
              :loading="isActionPending(`update-team:${team.id}`)"
              :disabled="isActionPending(`update-team:${team.id}`)"
              data-testid="participant-team-update-profile"
            >
              Save team profile
            </AppButton>
          </form>
        </div>

        <div class="space-y-4 app-inset-card px-5 py-5">
          <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
            <h3 class="text-lg font-semibold text-highlighted dark:text-white">
              Join policy
            </h3>
            <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
              Team admins control whether approved participants can submit new join requests.
            </p>
          </div>

          <AppCheckbox
            :model-value="settings.isOpenToJoinRequests"
            :disabled="isActionPending(`update-team-join-policy:${team.id}`)"
            label="Open this team to join requests"
            class="text-sm text-toned"
            @update:model-value="emit('toggleJoinPolicy', $event)"
          />
        </div>
      </section>

      <section class="app-inset-card px-5 py-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-2">
            <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
              <h3 class="text-lg font-semibold text-highlighted dark:text-white">
                Membership actions
              </h3>
            </div>
            <p
              v-if="membership && !leaveAvailability.isAllowed && leaveAvailability.reason"
              class="text-sm text-muted"
            >
              {{ leaveAvailability.reason }}
            </p>
            <p
              v-else-if="!membership && !joinAvailability.isAllowed && joinAvailability.reason"
              class="text-sm text-muted"
            >
              {{ joinAvailability.reason }}
            </p>
            <p
              v-else
              class="text-sm text-muted"
            >
              {{ membership ? 'Leave this team if your membership no longer fits the active collaboration.' : 'Request to join this team if the join policy remains open and capacity allows it.' }}
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <AppButton
              v-if="membership"
              color="warning"
              :loading="isActionPending(`leave-team:${team.id}`)"
              :disabled="!leaveAvailability.isAllowed || isActionPending(`leave-team:${team.id}`)"
              data-testid="participant-team-leave"
              @click="emit('leaveTeam')"
            >
              Leave team
            </AppButton>

            <AppButton
              v-else-if="pendingJoinRequestId"
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
              v-else
              color="primary"
              :loading="isActionPending(`join-team:${team.id}`)"
              :disabled="!joinAvailability.isAllowed || isActionPending(`join-team:${team.id}`)"
              data-testid="participant-team-request-join"
              @click="emit('requestJoin', team.id)"
            >
              Request to join
            </AppButton>
          </div>
        </div>
      </section>
    </div>
  </AppCard>
</template>
