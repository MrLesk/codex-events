<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

import type {
  TeamActionAvailability,
  TeamDetailRecord,
  TeamMemberRecord
} from '~/utils/team-workspace'

import { teamProfileFormSchema } from '~/utils/form-schemas'
import { cloneFormValues } from '~/utils/form-values'

const settings = defineModel<{
  name: string
  slug: string
  isOpenToJoinRequests: boolean
}>('settings', {
  required: true
})

const props = defineProps<{
  team: TeamDetailRecord
  membership?: TeamMemberRecord | null
  canManageTeam?: boolean
  joinAvailability: TeamActionAvailability
  leaveAvailability: TeamActionAvailability
  pendingJoinRequestId?: string | null
  pendingActionKey?: string | null
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
}>()

function isActionPending(actionKey: string) {
  return props.pendingActionKey === actionKey
}

const {
  errors,
  submitCount,
  values,
  setValues,
  handleSubmit
} = useForm({
  validationSchema: toTypedSchema(teamProfileFormSchema),
  initialValues: cloneFormValues(settings.value)
})

watch(() => settings.value, (nextSettings) => {
  setValues(cloneFormValues(nextSettings), false)
}, {
  deep: true,
  immediate: true
})

watch(values, (nextValues) => {
  Object.assign(settings.value, cloneFormValues(nextValues))
}, {
  deep: true
})

const submitProfileForm = handleSubmit(() => {
  emit('submitProfile')
})
</script>

<template>
  <AppCard
    data-testid="participant-team-workspace-panel"
    class="border border-default/70 bg-elevated/90"
  >
    <template #header>
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="text-2xl font-semibold text-highlighted">
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

        <p class="text-sm text-muted">
          Team slug: {{ team.slug }}. Current membership management and join-request review stay inside this workspace.
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="app-inset-card-tight px-4 py-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Team name
          </p>
          <p class="mt-2 text-lg font-semibold text-highlighted">
            {{ team.name }}
          </p>
        </div>

        <div class="app-inset-card-tight px-4 py-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Active members
          </p>
          <p class="mt-2 text-2xl font-semibold text-highlighted">
            {{ team.activeMemberCount ?? team.members.length }}
          </p>
        </div>

        <div class="app-inset-card-tight px-4 py-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Created
          </p>
          <p class="mt-2 text-sm font-medium text-highlighted">
            {{ team.createdAt }}
          </p>
        </div>

        <div class="app-inset-card-tight px-4 py-4">
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
          <div class="space-y-1">
            <h3 class="text-lg font-semibold text-highlighted">
              Team profile
            </h3>
            <p class="text-sm text-muted">
              Team admins can rename the team and update the canonical slug while team formation remains open.
            </p>
          </div>

          <form
            class="space-y-4"
            @submit.prevent="submitProfileForm"
          >
            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Team name</span>
              <input
                v-model="settings.name"
                type="text"
                class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                :class="submitCount > 0 && errors.name ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
                :disabled="isActionPending(`update-team:${team.id}`)"
              >
              <p
                v-if="submitCount > 0 && errors.name"
                class="text-xs text-error"
              >
                {{ errors.name }}
              </p>
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Team slug</span>
              <input
                v-model="settings.slug"
                type="text"
                class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                :class="submitCount > 0 && errors.slug ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
                :disabled="isActionPending(`update-team:${team.id}`)"
              >
              <p
                v-if="submitCount > 0 && errors.slug"
                class="text-xs text-error"
              >
                {{ errors.slug }}
              </p>
            </label>

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
          <div class="space-y-1">
            <h3 class="text-lg font-semibold text-highlighted">
              Join policy
            </h3>
            <p class="text-sm text-muted">
              Team admins control whether approved participants can submit new join requests.
            </p>
          </div>

          <label class="flex items-center gap-3 rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned">
            <input
              :checked="settings.isOpenToJoinRequests"
              type="checkbox"
              class="size-4 rounded border-default"
              :disabled="isActionPending(`update-team-join-policy:${team.id}`)"
              @change="emit('toggleJoinPolicy', !settings.isOpenToJoinRequests)"
            >
            Open this team to join requests
          </label>
        </div>
      </section>

      <section class="app-inset-card px-5 py-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-2">
            <h3 class="text-lg font-semibold text-highlighted">
              Membership actions
            </h3>
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
