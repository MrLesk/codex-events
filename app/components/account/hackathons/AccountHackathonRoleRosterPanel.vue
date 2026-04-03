<script setup lang="ts">
import type {
  ApiListResponse,
  HackathonRoleAssignment,
  HackathonRoleUserSummary
} from '~/utils/admin-workspace'
import type {
  HackathonRoleRosterBadge,
  HackathonRoleRosterRow,
  HackathonRosterRole
} from '~/utils/hackathon-role-roster'

import { normalizeApiError } from '~/utils/admin-workspace'
import {
  buildAssignedRoleRosterRows,
  buildRoleRosterRows,
  deriveAdminCapableRoleFlags,
  isAdminCapableHackathonUser,
  listHackathonRoleRosterBadges
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
const roleCandidatePageSize = 20
type LoadStatus = 'idle' | 'pending' | 'success' | 'error'

const mutationError = ref('')
const pendingActionKey = ref<string | null>(null)
const candidateSearchInput = ref('')
const appliedCandidateSearch = ref('')
const candidateUsers = ref<HackathonRoleUserSummary[]>([])
const candidateUsersTotal = ref(0)
const currentCandidatePage = ref(1)
const candidateUsersStatus = ref<LoadStatus>('pending')
const candidateUsersErrorMessage = ref('')
const isLoadingMoreCandidates = ref(false)
const loadMoreCandidatesErrorMessage = ref('')
const initializedRosterKey = ref<string | null>(null)
const candidateRequestSequence = ref(0)
let pendingCandidateSearchTimeout: ReturnType<typeof setTimeout> | null = null

const roleAssignments = computed(() => workspace.roleAssignments.data.value?.data ?? [])
const assignedRows = computed(() =>
  buildAssignedRoleRosterRows(roleAssignments.value, props.role)
)
const candidateRows = computed(() =>
  buildRoleRosterRows(
    candidateUsers.value,
    roleAssignments.value,
    props.role,
    ''
  ).filter(row => appliedCandidateSearch.value.length > 0 || !row.isAssigned)
)
const hasMoreCandidates = computed(() => candidateUsers.value.length < candidateUsersTotal.value)
const adminJudgeRows = computed(() =>
  props.role === 'judge'
    ? assignedRows.value.filter(row => row.isHackathonAdmin)
    : []
)
const reviewOnlyJudgeRows = computed(() =>
  props.role === 'judge'
    ? assignedRows.value.filter(row => !row.isHackathonAdmin)
    : []
)
const currentAssignmentsTitle = computed(() => {
  if (props.role === 'judge') {
    return 'Current judges'
  }

  if (props.role === 'staff') {
    return 'Current staff'
  }

  return 'Current admins'
})
const roleLabel = computed(() => {
  if (props.role === 'judge') {
    return 'judge access'
  }

  if (props.role === 'staff') {
    return 'staff access'
  }

  return 'admin access'
})
const addSectionTitle = computed(() =>
  props.role === 'judge'
    ? 'Add judges or enable judging'
    : props.role === 'staff'
      ? 'Add staff access'
      : 'Add admins'
)
const addSectionDescription = computed(() =>
  props.role === 'judge'
    ? 'Search by name, email, or user ID. Admins can also review submissions when judging is enabled for their admin assignment.'
    : props.role === 'staff'
      ? 'Search by name, email, or user ID. Staff and judge access stay separate unless the person is already a hackathon admin.'
      : 'Search by name, email, or user ID. Promoting a judge or staff member to admin keeps their current hackathon capability on the admin assignment.'
)
const emptyCandidateMessage = computed(() =>
  appliedCandidateSearch.value.length > 0
    ? 'No people match this search.'
    : hasMoreCandidates.value
      ? 'No new people in this batch. Load more to keep looking.'
      : 'No more people are available to add right now.'
)
const candidateSkeletonRowCount = 3
const roleBadgeLabels: Record<HackathonRoleRosterBadge, string> = {
  admin: 'Admin',
  staff: 'Staff',
  judge: 'Judge',
  platform_admin: 'Platform admin'
}

function getAssignmentActionKey(prefix: 'assign' | 'remove' | 'toggle', userId: string) {
  return `${props.role}:${prefix}:${userId}`
}

function findRoleAssignment(userId: string) {
  return roleAssignments.value.find(assignment => assignment.userId === userId) ?? null
}

function findCandidateUser(userId: string) {
  return candidateUsers.value.find(user => user.id === userId) ?? null
}

function isPlatformAdminTarget(userId: string) {
  return findRoleAssignment(userId)?.user?.isPlatformAdmin === true
    || findCandidateUser(userId)?.isPlatformAdmin === true
}

function isAdminLikeAssignment(assignment: HackathonRoleAssignment | null) {
  return isAdminCapableHackathonUser(assignment, assignment?.user)
}

async function normalizeAdminCapableAssignment(
  userId: string,
  overrides: Partial<Pick<HackathonRoleAssignment, 'isInJudgePool' | 'isStaff'>>,
  successTitle: string,
  successDescription: string
) {
  const assignment = findRoleAssignment(userId)
  const nextFlags = deriveAdminCapableRoleFlags(assignment, overrides)

  await putRoleAssignment(
    userId,
    'hackathon_admin',
    nextFlags.isInJudgePool,
    nextFlags.isStaff,
    successTitle,
    successDescription
  )
}

function getCandidateActionLabel(row: HackathonRoleRosterRow) {
  if (props.role === 'admin') {
    if (row.isAssigned) {
      return 'Already admin'
    }

    if (row.assignment?.role === 'judge') {
      return 'Replace judge with admin'
    }

    if (row.assignment?.role === 'staff') {
      return 'Replace staff with admin'
    }

    return 'Add admin'
  }

  if (props.role === 'staff') {
    if (row.isAssigned) {
      return row.isHackathonAdmin ? 'Already on staff' : 'Already staff'
    }

    if (row.isHackathonAdmin) {
      return 'Grant staff access'
    }

    return row.assignment?.role === 'judge' ? 'Replace judge with staff' : 'Add staff'
  }

  if (row.isAssigned) {
    return row.isHackathonAdmin ? 'Already judging' : 'Already a judge'
  }

  if (row.isHackathonAdmin) {
    return 'Enable judging'
  }

  return row.assignment?.role === 'staff' ? 'Replace staff with judge' : 'Add judge'
}

function isCandidateActionDisabled(row: HackathonRoleRosterRow) {
  return row.isAssigned
}

function isAssignedActionDisabled(row: HackathonRoleRosterRow) {
  return props.role === 'admin' && row.isPlatformAdmin
}

function getAssignedActionLabel(row: HackathonRoleRosterRow) {
  if (props.role === 'judge') {
    return row.isHackathonAdmin ? 'Stop judging' : 'Remove from judges'
  }

  if (props.role === 'staff') {
    return 'Remove staff access'
  }

  if (row.isPlatformAdmin) {
    return 'Platform admin'
  }

  return 'Remove from admins'
}

function getRoleBadges(row: HackathonRoleRosterRow) {
  return listHackathonRoleRosterBadges(row)
}

function isPendingAction(
  userId: string,
  prefixes: Array<'assign' | 'remove' | 'toggle'> = ['assign', 'remove', 'toggle']
) {
  return prefixes.some(prefix => pendingActionKey.value === getAssignmentActionKey(prefix, userId))
}

function resetCandidateState() {
  candidateRequestSequence.value += 1
  candidateUsers.value = []
  candidateUsersTotal.value = 0
  currentCandidatePage.value = 1
  candidateUsersStatus.value = 'idle'
  candidateUsersErrorMessage.value = ''
  isLoadingMoreCandidates.value = false
  loadMoreCandidatesErrorMessage.value = ''
}

async function fetchCandidatePage(page: number) {
  return await $fetch<ApiListResponse<HackathonRoleUserSummary>>(
    `/api/hackathons/${props.hackathonId}/roles/candidates`,
    {
      query: {
        page,
        page_size: roleCandidatePageSize,
        ...(appliedCandidateSearch.value.length > 0
          ? {
              search: appliedCandidateSearch.value
            }
          : {})
      }
    }
  )
}

async function loadCandidateUsers() {
  const requestId = ++candidateRequestSequence.value

  candidateUsersStatus.value = 'pending'
  candidateUsersErrorMessage.value = ''
  loadMoreCandidatesErrorMessage.value = ''

  try {
    const response = await fetchCandidatePage(1)

    if (requestId !== candidateRequestSequence.value) {
      return
    }

    candidateUsers.value = response.data
    candidateUsersTotal.value = response.meta?.total ?? response.data.length
    currentCandidatePage.value = 1
    candidateUsersStatus.value = 'success'
  } catch (error) {
    if (requestId !== candidateRequestSequence.value) {
      return
    }

    candidateUsers.value = []
    candidateUsersTotal.value = 0
    currentCandidatePage.value = 1
    candidateUsersStatus.value = 'error'
    candidateUsersErrorMessage.value = normalizeApiError(error).message
  }
}

async function loadMoreCandidates() {
  if (candidateUsersStatus.value === 'pending' || isLoadingMoreCandidates.value || !hasMoreCandidates.value) {
    return
  }

  const requestId = ++candidateRequestSequence.value
  const nextPage = currentCandidatePage.value + 1

  isLoadingMoreCandidates.value = true
  loadMoreCandidatesErrorMessage.value = ''

  try {
    const response = await fetchCandidatePage(nextPage)

    if (requestId !== candidateRequestSequence.value) {
      return
    }

    const nextUsers = [...candidateUsers.value, ...response.data].filter((user, index, items) =>
      items.findIndex(candidate => candidate.id === user.id) === index
    )

    candidateUsers.value = nextUsers
    candidateUsersTotal.value = response.meta?.total ?? nextUsers.length
    currentCandidatePage.value = nextPage
  } catch (error) {
    if (requestId !== candidateRequestSequence.value) {
      return
    }

    loadMoreCandidatesErrorMessage.value = normalizeApiError(error).message
  } finally {
    if (requestId === candidateRequestSequence.value) {
      isLoadingMoreCandidates.value = false
    }
  }
}

function cancelPendingCandidateSearch() {
  if (pendingCandidateSearchTimeout) {
    clearTimeout(pendingCandidateSearchTimeout)
    pendingCandidateSearchTimeout = null
  }
}

function scheduleCandidateSearch(value: string) {
  cancelPendingCandidateSearch()

  pendingCandidateSearchTimeout = setTimeout(async () => {
    pendingCandidateSearchTimeout = null
    appliedCandidateSearch.value = value

    await loadCandidateUsers()
  }, 250)
}

watch(candidateSearchInput, (value) => {
  const normalizedValue = value.trim()

  if (normalizedValue === appliedCandidateSearch.value) {
    return
  }

  loadMoreCandidatesErrorMessage.value = ''
  scheduleCandidateSearch(normalizedValue)
})

watch([() => props.hackathonId, () => props.role], async ([hackathonId, role]) => {
  const nextRosterKey = `${hackathonId}:${role}`

  if (initializedRosterKey.value === nextRosterKey) {
    return
  }

  cancelPendingCandidateSearch()
  initializedRosterKey.value = nextRosterKey
  appliedCandidateSearch.value = ''
  candidateSearchInput.value = ''
  resetCandidateState()
  await loadCandidateUsers()
}, {
  immediate: import.meta.client
})

onBeforeUnmount(() => {
  cancelPendingCandidateSearch()
})

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

async function putRoleAssignment(
  userId: string,
  role: HackathonRoleAssignment['role'],
  isInJudgePool: boolean,
  isStaff: boolean,
  successTitle: string,
  successDescription: string
) {
  await runMutation(
    getAssignmentActionKey('assign', userId),
    async () => {
      await $fetch(`/api/hackathons/${props.hackathonId}/roles/${userId}`, {
        method: 'PUT',
        body: {
          role,
          isInJudgePool,
          isStaff
        }
      })
    },
    successTitle,
    successDescription
  )
}

async function patchRoleCapabilities(
  userId: string,
  updates: {
    isInJudgePool?: boolean
    isStaff?: boolean
  },
  successTitle: string,
  successDescription: string
) {
  await runMutation(
    getAssignmentActionKey('toggle', userId),
    async () => {
      await $fetch(`/api/hackathons/${props.hackathonId}/roles/${userId}`, {
        method: 'PATCH',
        body: updates
      })
    },
    successTitle,
    successDescription
  )
}

async function deleteRoleAssignment(
  userId: string,
  successTitle: string,
  successDescription: string
) {
  await runMutation(
    getAssignmentActionKey('remove', userId),
    async () => {
      await $fetch(`/api/hackathons/${props.hackathonId}/roles/${userId}`, {
        method: 'DELETE'
      })
    },
    successTitle,
    successDescription
  )
}

async function assignRole(userId: string) {
  const trimmedUserId = userId.trim()

  if (!trimmedUserId) {
    mutationError.value = `Pick a registered user before assigning ${roleLabel.value}.`
    return
  }

  const existingAssignment = findRoleAssignment(trimmedUserId)
  const isPlatformAdmin = isPlatformAdminTarget(trimmedUserId)

  if (props.role === 'admin') {
    const nextFlags = deriveAdminCapableRoleFlags(existingAssignment)

    await putRoleAssignment(
      trimmedUserId,
      'hackathon_admin',
      nextFlags.isInJudgePool,
      nextFlags.isStaff,
      existingAssignment ? 'Admin access granted' : 'Admin added',
      existingAssignment?.role === 'judge'
        ? 'Judging stayed enabled on the new admin assignment.'
        : existingAssignment?.role === 'staff'
          ? 'Staff visibility stayed enabled on the new admin assignment.'
          : 'The admin roster was updated for this hackathon.'
    )
    return
  }

  if (props.role === 'staff') {
    if (existingAssignment?.role === 'hackathon_admin') {
      await patchRoleCapabilities(
        trimmedUserId,
        {
          isStaff: true
        },
        'Staff access granted',
        'This admin can now see participant and team data through the staff surface.'
      )
      return
    }

    if (isPlatformAdmin) {
      await normalizeAdminCapableAssignment(
        trimmedUserId,
        {
          isStaff: true
        },
        'Staff access granted',
        deriveAdminCapableRoleFlags(existingAssignment, { isStaff: true }).isInJudgePool
          ? 'This platform admin now has staff visibility and still has judging enabled.'
          : 'This platform admin now has staff visibility through the admin assignment.'
      )
      return
    }

    await putRoleAssignment(
      trimmedUserId,
      'staff',
      false,
      true,
      existingAssignment?.role === 'judge' ? 'Staff access granted' : 'Staff member added',
      existingAssignment?.role === 'judge'
        ? 'Judge access was replaced with staff access.'
        : 'The staff roster was updated for this hackathon.'
    )
    return
  }

  if (existingAssignment?.role === 'hackathon_admin') {
    await patchRoleCapabilities(
      trimmedUserId,
      {
        isInJudgePool: true
      },
      'Judging enabled',
      'This admin can now review submissions through judge assignments.'
    )
    return
  }

  if (isPlatformAdmin) {
    await normalizeAdminCapableAssignment(
      trimmedUserId,
      {
        isInJudgePool: true
      },
      'Judging enabled',
      deriveAdminCapableRoleFlags(existingAssignment, { isInJudgePool: true }).isStaff
        ? 'This platform admin can now review submissions and still has staff visibility.'
        : 'This platform admin can now review submissions through the admin assignment.'
    )
    return
  }

  await putRoleAssignment(
    trimmedUserId,
    'judge',
    true,
    false,
    'Judge added',
    existingAssignment?.role === 'staff'
      ? 'Staff access was replaced with judge access.'
      : 'The judges roster was updated for this hackathon.'
  )
}

async function removeRoleAssignment(assignment: HackathonRoleAssignment) {
  if (props.role === 'admin') {
    await deleteRoleAssignment(
      assignment.userId,
      'Admin access removed',
      assignment.isInJudgePool && assignment.isStaff
        ? 'Staff and judging access were removed with this admin assignment.'
        : assignment.isInJudgePool
          ? 'Judging access was removed with this admin assignment.'
          : assignment.isStaff
            ? 'Staff access was removed with this admin assignment.'
            : 'The admin roster was updated for this hackathon.'
    )
    return
  }

  if (props.role === 'staff') {
    if (assignment.role === 'hackathon_admin') {
      await patchRoleCapabilities(
        assignment.userId,
        {
          isStaff: false
        },
        'Staff access removed',
        assignment.isInJudgePool
          ? 'This admin still has judging enabled.'
          : 'This admin no longer appears in the staff roster.'
      )
      return
    }

    if (isAdminLikeAssignment(assignment)) {
      await normalizeAdminCapableAssignment(
        assignment.userId,
        {
          isStaff: false
        },
        'Staff access removed',
        deriveAdminCapableRoleFlags(assignment, { isStaff: false }).isInJudgePool
          ? 'This platform admin still has judging enabled.'
          : 'This platform admin still appears in the admins roster.'
      )
      return
    }

    await deleteRoleAssignment(
      assignment.userId,
      'Staff access removed',
      'The staff roster was updated for this hackathon.'
    )
    return
  }

  if (assignment.role === 'hackathon_admin') {
    await patchRoleCapabilities(
      assignment.userId,
      {
        isInJudgePool: false
      },
      'Judging disabled',
      assignment.isStaff
        ? 'This admin still has staff access.'
        : 'This admin no longer appears in the judges roster.'
    )
    return
  }

  if (isAdminLikeAssignment(assignment)) {
    await normalizeAdminCapableAssignment(
      assignment.userId,
      {
        isInJudgePool: false
      },
      'Judging disabled',
      deriveAdminCapableRoleFlags(assignment, { isInJudgePool: false }).isStaff
        ? 'This platform admin still has staff access.'
        : 'This platform admin still appears in the admins roster.'
    )
    return
  }

  await deleteRoleAssignment(
    assignment.userId,
    'Judge removed',
    'The judges roster was updated for this hackathon.'
  )
}
</script>

<template>
  <AppCard class="hackathon-workspace-detail-panel">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted dark:text-white">
          {{ title }}
        </h2>
        <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
          {{ description }}
        </p>
      </div>
    </template>

    <div class="space-y-4">
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

      <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            {{ currentAssignmentsTitle }}
          </h3>
          <p class="text-xs text-muted">
            {{ assignedRows.length }} assigned
          </p>
        </div>

        <div
          v-if="props.role === 'judge' && assignedRows.length > 0"
          class="space-y-5"
        >
          <div
            v-if="adminJudgeRows.length > 0"
            class="space-y-3"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Admins who judge
            </p>

            <div
              v-for="row in adminJudgeRows"
              :key="row.id"
              class="min-h-[4.75rem] flex flex-col gap-3 rounded-lg border border-black/8 bg-white/85 px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-white/[0.08] dark:bg-[#111111]"
            >
              <div class="min-w-0 flex-1 space-y-0.5">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="mr-1 font-semibold text-highlighted">
                    {{ row.displayName }}
                  </p>
                  <AppBadge
                    v-for="badge in getRoleBadges(row)"
                    :key="`${row.id}-${badge}`"
                    color="primary"
                    variant="soft"
                    class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  >
                    {{ roleBadgeLabels[badge] }}
                  </AppBadge>
                </div>
                <p class="text-sm text-muted">
                  {{ row.email }}
                </p>
              </div>

              <AppButton
                size="sm"
                color="neutral"
                variant="soft"
                class="shrink-0 self-start md:self-auto"
                :loading="isPendingAction(row.id)"
                @click="row.assignment ? removeRoleAssignment(row.assignment) : undefined"
              >
                {{ getAssignedActionLabel(row) }}
              </AppButton>
            </div>
          </div>

          <div
            v-if="adminJudgeRows.length > 0 && reviewOnlyJudgeRows.length > 0"
            class="border-t border-black/8 pt-5 dark:border-white/[0.08]"
          />

          <div
            v-if="reviewOnlyJudgeRows.length > 0"
            class="space-y-3"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Review-only judges
            </p>

            <div
              v-for="row in reviewOnlyJudgeRows"
              :key="row.id"
              class="min-h-[4.75rem] flex flex-col gap-3 rounded-lg border border-black/8 bg-white/85 px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-white/[0.08] dark:bg-[#111111]"
            >
              <div class="min-w-0 flex-1 space-y-0.5">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold text-highlighted">
                    {{ row.displayName }}
                  </p>
                  <AppBadge
                    v-for="badge in getRoleBadges(row)"
                    :key="`${row.id}-${badge}`"
                    color="primary"
                    variant="soft"
                    class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  >
                    {{ roleBadgeLabels[badge] }}
                  </AppBadge>
                </div>
                <p class="text-sm text-muted">
                  {{ row.email }}
                </p>
              </div>

              <AppButton
                size="sm"
                color="error"
                variant="soft"
                class="shrink-0 self-start md:self-auto"
                :loading="isPendingAction(row.id)"
                @click="row.assignment ? removeRoleAssignment(row.assignment) : undefined"
              >
                {{ getAssignedActionLabel(row) }}
              </AppButton>
            </div>
          </div>
        </div>

        <div
          v-else-if="assignedRows.length > 0"
          class="grid gap-3"
        >
          <div
            v-for="row in assignedRows"
            :key="row.id"
            class="min-h-[4.75rem] flex flex-col gap-3 rounded-lg border border-black/8 bg-white/85 px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-white/[0.08] dark:bg-[#111111]"
          >
            <div class="min-w-0 flex-1 space-y-0.5">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-semibold text-highlighted">
                  {{ row.displayName }}
                </p>
                <AppBadge
                  v-for="badge in getRoleBadges(row)"
                  :key="`${row.id}-${badge}`"
                  color="primary"
                  variant="soft"
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                >
                  {{ roleBadgeLabels[badge] }}
                </AppBadge>
              </div>
              <p class="text-sm text-muted">
                {{ row.email }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <AppButton
                size="sm"
                color="error"
                variant="soft"
                class="shrink-0 self-start md:self-auto"
                :disabled="isAssignedActionDisabled(row)"
                :loading="!isAssignedActionDisabled(row) && isPendingAction(row.id)"
                @click="isAssignedActionDisabled(row) ? undefined : row.assignment ? removeRoleAssignment(row.assignment) : undefined"
              >
                {{ getAssignedActionLabel(row) }}
              </AppButton>
            </div>
          </div>
        </div>

        <p
          v-else
          class="text-sm text-muted"
        >
          {{ emptyAssignedMessage }}
        </p>
      </div>

      <div class="space-y-4 border-t border-black/8 pt-5 dark:border-white/[0.08]">
        <div class="space-y-1">
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            {{ addSectionTitle }}
          </h3>
          <p class="text-sm text-muted">
            {{ addSectionDescription }}
          </p>
        </div>

        <AppInput
          v-model="candidateSearchInput"
          type="search"
          name="role-candidate-search"
          autocomplete="off"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          placeholder="Search users by name, email, or user ID"
        />

        <AppAlert
          v-if="candidateUsersStatus === 'error'"
          color="error"
          variant="soft"
          title="Unable to load candidate users"
          :description="candidateUsersErrorMessage"
        />

        <div
          v-else
          class="grid gap-3"
        >
          <template v-if="candidateUsersStatus === 'pending' && candidateUsers.length === 0">
            <div
              v-for="index in candidateSkeletonRowCount"
              :key="`candidate-skeleton-${index}`"
              class="min-h-[4.75rem] flex flex-col gap-3 rounded-lg border border-black/8 bg-white/85 px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-white/[0.08] dark:bg-[#111111]"
              aria-hidden="true"
            >
              <div class="space-y-1.5">
                <div class="h-5 w-36 rounded-full bg-black/8 dark:bg-white/[0.08] animate-pulse" />
                <div class="h-4 w-52 rounded-full bg-black/6 dark:bg-white/[0.06] animate-pulse" />
              </div>

              <div class="h-8 w-24 rounded-lg bg-black/6 dark:bg-white/[0.06] animate-pulse md:self-auto" />
            </div>
          </template>

          <template v-else>
            <div
              v-for="row in candidateRows"
              :key="row.id"
              class="min-h-[4.75rem] flex flex-col gap-3 rounded-lg border border-black/8 bg-white/85 px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-white/[0.08] dark:bg-[#111111]"
            >
              <div class="min-w-0 flex-1 space-y-0.5">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="mr-1 font-semibold text-highlighted">
                    {{ row.displayName }}
                  </p>
                  <AppBadge
                    v-for="badge in getRoleBadges(row)"
                    :key="`${row.id}-${badge}`"
                    color="primary"
                    variant="soft"
                    class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  >
                    {{ roleBadgeLabels[badge] }}
                  </AppBadge>
                </div>
                <p class="text-sm text-muted">
                  {{ row.email }}
                </p>
              </div>

              <AppButton
                size="sm"
                color="neutral"
                variant="soft"
                class="shrink-0 self-start md:self-auto"
                :disabled="isCandidateActionDisabled(row)"
                :loading="!isCandidateActionDisabled(row) && isPendingAction(row.id)"
                @click="isCandidateActionDisabled(row) ? undefined : assignRole(row.id)"
              >
                {{ getCandidateActionLabel(row) }}
              </AppButton>
            </div>

            <p
              v-if="candidateRows.length === 0"
              class="text-sm text-muted"
            >
              {{ emptyCandidateMessage }}
            </p>
          </template>
        </div>

        <div class="flex flex-col items-start gap-3">
          <AppButton
            v-if="hasMoreCandidates && candidateUsersStatus !== 'error'"
            color="neutral"
            variant="outline"
            :loading="isLoadingMoreCandidates"
            @click="loadMoreCandidates"
          >
            Load more
          </AppButton>

          <AppAlert
            v-if="loadMoreCandidatesErrorMessage"
            color="warning"
            variant="soft"
            title="More users unavailable"
            :description="loadMoreCandidatesErrorMessage"
          />
        </div>
      </div>
    </div>
  </AppCard>
</template>
