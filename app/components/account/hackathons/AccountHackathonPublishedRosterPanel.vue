<script setup lang="ts">
import type {
  ApiListResponse,
  HackathonRoleAssignment,
  HackathonRoleUserSummary
} from '~/utils/admin-workspace'
import type {
  HackathonRoleRosterBadge,
  HackathonRoleRosterRow
} from '~/utils/hackathon-role-roster'
import type {
  PublishedHackathonRosterLoadState,
  PublishedHackathonRosterMember,
  PublishedHackathonRosterRole
} from '~/utils/hackathon-published-roster'

import {
  buildAdminWorkspaceCacheKey,
  getAdminWorkspaceSubjectKey,
  normalizeApiError
} from '~/utils/admin-workspace'
import {
  buildAssignedRoleRosterRows,
  buildRoleRosterRows,
  deriveAdminCapableRoleFlags,
  isAdminCapableHackathonUser,
  listHackathonRoleRosterBadges
} from '~/utils/hackathon-role-roster'
import {
  getPublishedHackathonRosterLinks,
  loadPublishedHackathonRoster
} from '~/utils/hackathon-published-roster'
import { buildProfileIconHref } from '~/utils/profile-icon'

const props = defineProps<{
  hackathonId: string
  role: PublishedHackathonRosterRole
  roster: PublishedHackathonRosterLoadState
  title: string
  description: string
  managementHackathonId?: string | null
}>()

const toast = useToast()
const authenticatedUser = useUser()
const { actor } = useSessionActor()
const roleCandidatePageSize = 20
type LoadStatus = 'idle' | 'pending' | 'success' | 'error'

const rosterState = ref(props.roster)
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

watch(() => props.roster, (value) => {
  rosterState.value = value
})

const members = computed(() => rosterState.value.members)
const emptyState = computed(() => props.role === 'judge'
  ? {
      title: 'No judges published yet',
      description: 'Assigned judges will appear here once the official judge roster is set for this hackathon.'
    }
  : {
      title: 'No staff published yet',
      description: 'Assigned staff will appear here once the official staff roster is set for this hackathon.'
    })
const errorState = computed(() => props.role === 'judge'
  ? {
      title: 'Judge roster unavailable'
    }
  : {
      title: 'Staff roster unavailable'
    })
const errorMessage = computed(() => rosterState.value.errorMessage?.trim() ?? '')
const managementHackathonId = computed(() => props.managementHackathonId?.trim() ?? '')
const canManageRoster = computed(() => managementHackathonId.value.length > 0)
const subjectKey = computed(() => getAdminWorkspaceSubjectKey(authenticatedUser.value?.sub))
const roleAssignmentsResponse = useFetch<ApiListResponse<HackathonRoleAssignment>>(
  () => `/api/hackathons/${managementHackathonId.value}/roles`,
  {
    key: () => buildAdminWorkspaceCacheKey(
      'hackathon-role-roster-roles',
      subjectKey.value,
      managementHackathonId.value || 'none'
    ),
    watch: [subjectKey, managementHackathonId],
    immediate: canManageRoster.value
  }
)
const roleAssignments = computed(() => roleAssignmentsResponse.data.value?.data ?? [])
const assignedRosterRows = computed(() =>
  canManageRoster.value ? buildAssignedRoleRosterRows(roleAssignments.value, props.role) : []
)
const candidateRows = computed(() =>
  canManageRoster.value
    ? buildRoleRosterRows(
        candidateUsers.value,
        roleAssignments.value,
        props.role,
        ''
      ).filter(row => appliedCandidateSearch.value.length > 0 || !row.isAssigned)
    : []
)
const addSectionTitle = computed(() =>
  props.role === 'judge' ? 'Add judges or enable judging' : 'Add staff access'
)
const addSectionDescription = computed(() =>
  props.role === 'judge'
    ? 'Search by name, email, or user ID. Admins can also review submissions when judging is enabled for their admin assignment.'
    : 'Search by name, email, or user ID. Staff and judge access stay separate unless the person is already a hackathon admin.'
)
const hasMoreCandidates = computed(() => candidateUsers.value.length < candidateUsersTotal.value)
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
const currentPlatformUserId = computed(() =>
  actor.value.kind === 'platform_user' ? actor.value.platformUser.id : null
)

function getMemberProfileIconHref(member: PublishedHackathonRosterMember) {
  return buildProfileIconHref(
    member.id,
    member.profileIconUpdatedAt,
    props.hackathonId
  )
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

function findAssignedRosterRow(userId: string) {
  return assignedRosterRows.value.find(row => row.id === userId) ?? null
}

function getRoleBadges(row: HackathonRoleRosterRow) {
  return listHackathonRoleRosterBadges(row)
}

function isCurrentPlatformUser(userId: string) {
  return currentPlatformUserId.value === userId
}

function isPendingAction(
  userId: string,
  prefixes: Array<'assign' | 'remove' | 'toggle'> = ['assign', 'remove', 'toggle']
) {
  return prefixes.some(prefix => pendingActionKey.value === getAssignmentActionKey(prefix, userId))
}

function isPlatformAdminTarget(userId: string) {
  return findRoleAssignment(userId)?.user?.isPlatformAdmin === true
    || findCandidateUser(userId)?.isPlatformAdmin === true
}

function isAdminLikeAssignment(assignment: HackathonRoleAssignment | null) {
  return isAdminCapableHackathonUser(assignment, assignment?.user)
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

async function refreshPublishedRoster() {
  rosterState.value = await loadPublishedHackathonRoster(
    path => $fetch<ApiListResponse<PublishedHackathonRosterMember>>(path),
    {
      hackathonId: props.hackathonId,
      role: props.role
    }
  )
}

async function fetchCandidatePage(page: number) {
  return await $fetch<ApiListResponse<HackathonRoleUserSummary>>(
    `/api/hackathons/${managementHackathonId.value}/roles/candidates`,
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
  if (!canManageRoster.value) {
    return
  }

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
  if (
    !canManageRoster.value
    || candidateUsersStatus.value === 'pending'
    || isLoadingMoreCandidates.value
    || !hasMoreCandidates.value
  ) {
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

  if (!canManageRoster.value || normalizedValue === appliedCandidateSearch.value) {
    return
  }

  loadMoreCandidatesErrorMessage.value = ''
  scheduleCandidateSearch(normalizedValue)
})

watch([managementHackathonId, canManageRoster], async ([hackathonId, canManage]) => {
  const nextRosterKey = canManage ? hackathonId : null

  if (initializedRosterKey.value === nextRosterKey) {
    return
  }

  cancelPendingCandidateSearch()
  initializedRosterKey.value = nextRosterKey
  appliedCandidateSearch.value = ''
  candidateSearchInput.value = ''
  resetCandidateState()

  if (!canManage) {
    return
  }

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
    await roleAssignmentsResponse.refresh()
    await refreshPublishedRoster()
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
      await $fetch(`/api/hackathons/${managementHackathonId.value}/roles/${userId}`, {
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
      await $fetch(`/api/hackathons/${managementHackathonId.value}/roles/${userId}`, {
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
      await $fetch(`/api/hackathons/${managementHackathonId.value}/roles/${userId}`, {
        method: 'DELETE'
      })
    },
    successTitle,
    successDescription
  )
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
  if (props.role === 'judge') {
    if (row.isAssigned) {
      return row.isHackathonAdmin ? 'Already judging' : 'Already a judge'
    }

    if (row.isHackathonAdmin) {
      return 'Enable judging'
    }

    return row.assignment?.role === 'staff' ? 'Replace staff with judge' : 'Add judge'
  }

  if (row.isAssigned) {
    return row.isHackathonAdmin ? 'Already on staff' : 'Already staff'
  }

  if (row.isHackathonAdmin) {
    return 'Grant staff access'
  }

  return row.assignment?.role === 'judge' ? 'Replace judge with staff' : 'Add staff'
}

function isCandidateActionDisabled(row: HackathonRoleRosterRow) {
  return row.isAssigned
}

async function assignRosterAccess(userId: string) {
  const trimmedUserId = userId.trim()

  if (!trimmedUserId) {
    mutationError.value = props.role === 'judge'
      ? 'Pick a registered user before assigning judge access.'
      : 'Pick a registered user before assigning staff access.'
    return
  }

  const existingAssignment = findRoleAssignment(trimmedUserId)
  const isPlatformAdmin = isPlatformAdminTarget(trimmedUserId)

  if (props.role === 'judge' && existingAssignment?.role === 'hackathon_admin') {
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

  if (props.role === 'judge' && isPlatformAdmin) {
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

  if (props.role === 'judge') {
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
    return
  }

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
}

async function removeRosterAccess(assignment: HackathonRoleAssignment) {
  if (props.role === 'judge' && assignment.role === 'hackathon_admin') {
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

  if (props.role === 'judge' && isAdminLikeAssignment(assignment)) {
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

  if (props.role === 'judge') {
    await deleteRoleAssignment(
      assignment.userId,
      'Judge removed',
      'The judges roster was updated for this hackathon.'
    )
    return
  }

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
}

async function removePublishedRosterMember(userId: string) {
  const assignment = findAssignedRosterRow(userId)?.assignment

  if (!assignment) {
    return
  }

  await removeRosterAccess(assignment)
}
</script>

<template>
  <AppCard class="rounded-xl hackathon-workspace-detail-panel">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          {{ props.title }}
        </h2>
        <p class="text-sm text-muted">
          {{ props.description }}
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <AppAlert
        v-if="mutationError"
        color="error"
        variant="soft"
        title="Role update failed"
        :description="mutationError"
      />

      <AppAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        :title="errorState.title"
        :description="errorMessage"
      />

      <AppAlert
        v-else-if="members.length === 0"
        color="neutral"
        variant="soft"
        :title="emptyState.title"
        :description="emptyState.description"
      />

      <div
        v-else
        class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <article
          v-for="member in members"
          :key="member.id"
          class="hackathon-workspace-detail-inset flex h-full flex-col gap-4 rounded-xl p-5"
        >
          <div class="flex items-start gap-4">
            <AppAvatar
              size="3xl"
              :src="getMemberProfileIconHref(member)"
              :alt="member.fullName"
              class="shrink-0"
            />

            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-base font-semibold text-highlighted dark:text-white">
                      {{ member.fullName }}
                    </h3>
                    <AppBadge
                      v-if="isCurrentPlatformUser(member.id)"
                      color="info"
                      variant="soft"
                    >
                      You
                    </AppBadge>
                  </div>

                  <p
                    v-if="member.company"
                    class="text-sm text-muted"
                  >
                    {{ member.company }}
                  </p>
                </div>

                <AppButton
                  v-if="canManageRoster && findAssignedRosterRow(member.id)?.assignment"
                  size="sm"
                  color="error"
                  variant="soft"
                  class="shrink-0"
                  :loading="isPendingAction(member.id)"
                  @click="removePublishedRosterMember(member.id)"
                >
                  <AppIcon
                    name="i-lucide-trash-2"
                    class="size-4"
                  />
                  Remove
                </AppButton>
              </div>
            </div>
          </div>

          <p
            v-if="member.bio"
            class="text-sm leading-6 text-neutral-700 dark:text-[#C7C7C7]"
          >
            {{ member.bio }}
          </p>

          <div class="mt-auto space-y-3 pt-1">
            <div
              v-if="getPublishedHackathonRosterLinks(member).length > 0"
              class="flex flex-wrap gap-2"
            >
              <a
                v-for="link in getPublishedHackathonRosterLinks(member)"
                :key="link.key"
                :href="link.href"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-sm text-sky-700 transition hover:border-black/20 hover:text-sky-800 dark:border-white/[0.12] dark:text-sky-300 dark:hover:border-white/[0.22] dark:hover:text-sky-200"
              >
                {{ link.label }}
                <AppIcon
                  name="i-lucide-external-link"
                  class="size-3"
                />
              </a>
            </div>
          </div>
        </article>
      </div>

      <div
        v-if="canManageRoster"
        class="space-y-4 border-t border-black/8 pt-5 dark:border-white/[0.08]"
      >
        <AppAlert
          v-if="roleAssignmentsResponse.error.value"
          color="error"
          variant="soft"
          title="Unable to load role assignments"
          :description="roleAssignmentsResponse.error.value.message"
        />

        <template v-else>
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
            :name="props.role === 'judge' ? 'judge-candidate-search' : 'staff-candidate-search'"
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
                  <div class="h-5 w-36 animate-pulse rounded-full bg-black/8 dark:bg-white/[0.08]" />
                  <div class="h-4 w-52 animate-pulse rounded-full bg-black/6 dark:bg-white/[0.06]" />
                </div>

                <div class="h-8 w-24 rounded-lg bg-black/6 dark:bg-white/[0.06] md:self-auto" />
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
                    <AppBadge
                      v-if="isCurrentPlatformUser(row.id)"
                      color="info"
                      variant="soft"
                    >
                      You
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
                  @click="isCandidateActionDisabled(row) ? undefined : assignRosterAccess(row.id)"
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
        </template>
      </div>
    </div>
  </AppCard>
</template>
