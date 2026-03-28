<script setup lang="ts">
import type { HackathonRoleAssignment } from '~/utils/admin-workspace'
import type { HackathonRosterRole } from '~/utils/hackathon-role-roster'

import { normalizeApiError } from '~/utils/admin-workspace'
import {
  filterAssignableRoleUsers,
  listAssignableRosterUsers
} from '~/utils/hackathon-role-roster'

const props = defineProps<{
  hackathonId: string
  role: HackathonRosterRole
  title: string
  description: string
  emptyAssignedMessage: string
}>()

const toast = useToast()
const workspace = useHackathonRoleRosterWorkspace(toRef(props, 'hackathonId'))

const mutationError = ref('')
const pendingActionKey = ref<string | null>(null)
const searchQuery = ref('')

const roleAssignments = computed(() => workspace.roleAssignments.data.value?.data ?? [])
const applications = computed(() => workspace.applications.data.value?.data ?? [])
const canManage = computed(() => workspace.canManageCurrentHackathon.value)

const assignedRoleAssignments = computed(() =>
  roleAssignments.value.filter(assignment => assignment.role === props.role)
)

const assignableUsers = computed(() =>
  filterAssignableRoleUsers(
    listAssignableRosterUsers(applications.value, roleAssignments.value),
    roleAssignments.value,
    props.role,
    searchQuery.value
  )
)

const roleLabel = computed(() => props.role === 'judge' ? 'judge' : 'hackathon admin')
const assignButtonLabel = computed(() => props.role === 'judge' ? 'Assign judge' : 'Assign admin')
const assignSuccessTitle = computed(() => props.role === 'judge' ? 'Judge assigned' : 'Hackathon admin assigned')
const assignSuccessDescription = computed(() =>
  props.role === 'judge'
    ? 'The judge roster was updated for this hackathon.'
    : 'The admin roster was updated for this hackathon.'
)
const removeSuccessTitle = computed(() => props.role === 'judge' ? 'Judge removed' : 'Hackathon admin removed')
const removeSuccessDescription = computed(() =>
  props.role === 'judge'
    ? 'The judge roster was updated for this hackathon.'
    : 'The admin roster was updated for this hackathon.'
)
const emptySearchMessage = computed(() =>
  props.role === 'judge'
    ? 'No assignable judges match the current search.'
    : 'No assignable hackathon admins match the current search.'
)

function getAssignmentActionKey(prefix: 'assign' | 'remove', userId: string) {
  return `${props.role}:${prefix}:${userId}`
}

async function runMutation(
  actionKey: string,
  action: () => Promise<void>,
  successTitle: string,
  successDescription: string
) {
  mutationError.value = ''
  pendingActionKey.value = actionKey

  try {
    await action()
    toast.add({
      title: successTitle,
      description: successDescription,
      color: 'success'
    })
    await workspace.refreshRoleRoster()
  } catch (error) {
    mutationError.value = normalizeApiError(error).message
  } finally {
    pendingActionKey.value = null
  }
}

async function assignRole(userId: string) {
  const trimmedUserId = userId.trim()

  if (!trimmedUserId) {
    mutationError.value = `Pick a registered user before assigning ${roleLabel.value} access.`
    return
  }

  await runMutation(
    getAssignmentActionKey('assign', trimmedUserId),
    async () => {
      await $fetch(`/api/hackathons/${props.hackathonId}/roles/${trimmedUserId}`, {
        method: 'PUT',
        body: {
          role: props.role,
          isInJudgePool: props.role === 'judge'
        }
      })
    },
    assignSuccessTitle.value,
    assignSuccessDescription.value
  )
}

async function removeRoleAssignment(assignment: HackathonRoleAssignment) {
  await runMutation(
    getAssignmentActionKey('remove', assignment.userId),
    async () => {
      await $fetch(`/api/hackathons/${props.hackathonId}/roles/${assignment.userId}`, {
        method: 'DELETE'
      })
    },
    removeSuccessTitle.value,
    removeSuccessDescription.value
  )
}
</script>

<template>
  <AppCard class="hackathon-workspace-detail-panel p-6">
    <div class="space-y-4">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold text-highlighted dark:text-white">
          {{ title }}
        </h2>
        <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
          {{ description }}
        </p>
      </div>

      <AppAlert
        v-if="mutationError"
        color="error"
        variant="soft"
        title="Role update failed"
        :description="mutationError"
      />

      <AppAlert
        v-if="workspace.roleAssignments.error.value"
        color="error"
        variant="soft"
        title="Unable to load role assignments"
        :description="workspace.roleAssignments.error.value.message"
      />

      <AppAlert
        v-else-if="workspace.applications.error.value"
        color="error"
        variant="soft"
        title="Unable to load assignable users"
        :description="workspace.applications.error.value.message"
      />

      <AppAlert
        v-else-if="workspace.roleAssignments.status.value === 'pending' || workspace.applications.status.value === 'pending'"
        color="neutral"
        variant="soft"
        title="Loading roster"
        description="Resolving the current hackathon role roster and assignable users."
      />

      <AppAlert
        v-else-if="!canManage"
        color="warning"
        variant="soft"
        title="Admin access required"
        description="Only platform admins and hackathon admins can manage this roster."
      />

      <template v-else>
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Assigned {{ props.role === 'judge' ? 'judges' : 'hackathon admins' }}
          </h3>
          <p class="text-xs text-muted">
            {{ assignedRoleAssignments.length }} assigned
          </p>
        </div>

        <input
          v-model="searchQuery"
          type="text"
          class="w-full rounded-lg border border-black/8 bg-white/90 px-4 py-3 text-sm text-highlighted outline-none focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
          placeholder="Search users by name, email, or user ID"
        >

        <div class="grid gap-3">
          <div
            v-for="user in assignableUsers"
            :key="user.id"
            class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/8 bg-white/85 px-4 py-3 dark:border-white/[0.08] dark:bg-[#111111]"
          >
            <div class="space-y-0.5">
              <p class="font-semibold text-highlighted">
                {{ user.displayName }}
              </p>
              <p class="text-sm text-muted">
                {{ user.email }}
              </p>
              <p class="font-mono text-xs text-muted">
                userId: {{ user.id }}
              </p>
            </div>

            <AppButton
              size="sm"
              variant="soft"
              :loading="pendingActionKey === getAssignmentActionKey('assign', user.id)"
              @click="assignRole(user.id)"
            >
              {{ assignButtonLabel }}
            </AppButton>
          </div>

          <p
            v-if="assignableUsers.length === 0"
            class="text-sm text-muted"
          >
            {{ emptySearchMessage }}
          </p>
        </div>

        <div class="grid gap-3 border-t border-black/8 pt-4 dark:border-white/[0.08]">
          <div
            v-for="assignment in assignedRoleAssignments"
            :key="assignment.id"
            class="rounded-lg border border-black/8 bg-white/85 px-4 py-4 dark:border-white/[0.08] dark:bg-[#111111]"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="space-y-0.5">
                <p class="font-semibold text-highlighted">
                  {{ assignment.user?.displayName ?? assignment.userId }}
                </p>
                <p class="text-sm text-muted">
                  {{ assignment.user?.email ?? 'Manual user lookup required' }}
                </p>
                <p class="font-mono text-xs text-muted">
                  userId: {{ assignment.userId }}
                </p>
              </div>

              <AppButton
                size="sm"
                color="error"
                variant="soft"
                :loading="pendingActionKey === getAssignmentActionKey('remove', assignment.userId)"
                @click="removeRoleAssignment(assignment)"
              >
                Remove
              </AppButton>
            </div>
          </div>

          <p
            v-if="assignedRoleAssignments.length === 0"
            class="text-sm text-muted"
          >
            {{ emptyAssignedMessage }}
          </p>
        </div>
      </template>
    </div>
  </AppCard>
</template>
