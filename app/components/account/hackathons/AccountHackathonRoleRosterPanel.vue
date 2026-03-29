<script setup lang="ts">
import type {
  ApiListResponse,
  HackathonRoleAssignment,
  HackathonRoleUserSummary
} from '~/utils/admin-workspace'
import type { HackathonRosterRole } from '~/utils/hackathon-role-roster'

import { normalizeApiError } from '~/utils/admin-workspace'
import {
  buildAssignedRoleRosterRows,
  buildRoleRosterRows
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
const hackathonAdminUserIds = computed(() =>
  new Set(
    roleAssignments.value
      .filter(assignment => assignment.role === 'hackathon_admin')
      .map(assignment => assignment.userId)
  )
)

const roleLabel = computed(() => props.role === 'judge' ? 'judge' : 'hackathon admin')
const assignButtonLabel = computed(() => props.role === 'judge' ? 'Add judge' : 'Add admin')
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
const addSectionTitle = computed(() => props.role === 'judge' ? 'Add judges' : 'Add admins')
const emptyCandidateMessage = computed(() =>
  appliedCandidateSearch.value.length > 0
    ? 'No people match this search.'
    : hasMoreCandidates.value
      ? 'No new people in this batch. Load more to keep looking.'
      : 'No more people are available to add right now.'
)
const candidateSkeletonRowCount = 3

function getAssignmentActionKey(prefix: 'assign' | 'remove', userId: string) {
  return `${props.role}:${prefix}:${userId}`
}

function isCurrentHackathonAdmin(userId: string) {
  return hackathonAdminUserIds.value.has(userId)
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

      <div class="flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          Assigned {{ props.role === 'judge' ? 'judges' : 'hackathon admins' }}
        </h3>
        <p class="text-xs text-muted">
          {{ assignedRows.length }} assigned
        </p>
      </div>

      <div class="grid gap-3">
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
                v-if="row.isPlatformAdmin"
                color="primary"
                variant="soft"
                class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
              >
                Platform admin
              </AppBadge>
              <AppBadge
                v-if="props.role === 'judge' && isCurrentHackathonAdmin(row.id)"
                color="neutral"
                variant="soft"
                class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
              >
                Hackathon admin
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
            :loading="pendingActionKey === getAssignmentActionKey('remove', row.id)"
            @click="row.assignment ? removeRoleAssignment(row.assignment) : undefined"
          >
            Remove
          </AppButton>
        </div>

        <p
          v-if="assignedRows.length === 0"
          class="text-sm text-muted"
        >
          {{ emptyAssignedMessage }}
        </p>
      </div>

      <div class="flex items-center justify-between gap-3">
        <div class="space-y-1">
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            {{ addSectionTitle }}
          </h3>
          <p class="text-sm text-muted">
            Search by name, email, or user ID.
          </p>
        </div>
      </div>

      <input
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
        class="w-full rounded-lg border border-black/8 bg-white/90 px-4 py-3 text-sm text-highlighted outline-none focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
        placeholder="Search users by name, email, or user ID"
      >

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
                <p class="font-semibold text-highlighted">
                  {{ row.displayName }}
                </p>
                <AppBadge
                  v-if="row.isAssigned"
                  color="success"
                  variant="soft"
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                >
                  Assigned
                </AppBadge>
                <AppBadge
                  v-if="row.isPlatformAdmin"
                  color="primary"
                  variant="soft"
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                >
                  Platform admin
                </AppBadge>
                <AppBadge
                  v-if="isCurrentHackathonAdmin(row.id)"
                  color="neutral"
                  variant="soft"
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                >
                  Hackathon admin
                </AppBadge>
              </div>
              <p class="text-sm text-muted">
                {{ row.email }}
              </p>
            </div>

            <AppButton
              size="sm"
              :color="row.isAssigned ? 'error' : 'neutral'"
              variant="soft"
              class="shrink-0 self-start md:self-auto"
              :loading="pendingActionKey === getAssignmentActionKey(row.isAssigned ? 'remove' : 'assign', row.id)"
              @click="row.isAssigned && row.assignment ? removeRoleAssignment(row.assignment) : assignRole(row.id)"
            >
              {{ row.isAssigned ? 'Remove' : assignButtonLabel }}
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
  </AppCard>
</template>
