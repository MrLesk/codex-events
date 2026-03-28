<script setup lang="ts">
import type {
  ApiDataResponse,
  ApiListResponse,
  EvaluationCriterion,
  HackathonRecord,
  HackathonRoleAssignment,
  JudgeAssignmentSummary,
  LeaderboardEntry,
  ShortlistEntry,
  WinnerEntry
} from '~/utils/admin-workspace'
import type { PrizeRedemptionAdminView, PrizeRedemptionRecord } from '~/utils/prize-redemptions'

import {
  canMutateRoleAssignments,
  formatHackathonState,
  getCurrentLifecycleControl,
  getHackathonStateColor,
  normalizeApiError
} from '~/utils/admin-workspace'

const props = defineProps<{
  slug: string
}>()

type LoadStatus = 'idle' | 'pending' | 'success' | 'error'

type JudgeChoice = {
  value: string
  label: string
}

type CriterionEditState = Pick<EvaluationCriterion, 'name' | 'description' | 'weight' | 'displayOrder'>

type AssignableUser = {
  id: string
  displayName: string
  email: string
}

const toast = useToast()
const slug = computed(() => props.slug.trim())

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const {
  data: hackathonResponse,
  error: hackathonError
} = await useFetch<ApiDataResponse<HackathonRecord>>(() => `/api/hackathons/slug/${slug.value}`, {
  key: () => `admin-hackathon-competition:${slug.value}`
})

if (hackathonError.value) {
  throw createError({
    statusCode: hackathonError.value.statusCode ?? hackathonError.value.status ?? 500,
    statusMessage: hackathonError.value.statusMessage ?? 'Unable to load the requested hackathon.'
  })
}

if (!hackathonResponse.value?.data) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const hackathonId = computed(() => hackathonResponse.value!.data.id)
const workspace = useAdminHackathonWorkspace(hackathonId)

const mutationError = ref('')
const pendingActionKey = ref<string | null>(null)
const initializedHackathonId = ref<string | null>(null)

const assignments = ref<JudgeAssignmentSummary[]>([])
const assignmentsStatus = ref<LoadStatus>('idle')
const assignmentsErrorMessage = ref('')

const leaderboardEntries = ref<LeaderboardEntry[]>([])
const leaderboardStatus = ref<LoadStatus>('idle')
const leaderboardErrorMessage = ref('')

const shortlistEntries = ref<ShortlistEntry[]>([])
const shortlistStatus = ref<LoadStatus>('idle')
const shortlistErrorMessage = ref('')

const winners = ref<WinnerEntry[]>([])
const winnersStatus = ref<LoadStatus>('idle')
const winnersErrorMessage = ref('')

const redemptions = ref<PrizeRedemptionRecord[]>([])
const redemptionsStatus = ref<LoadStatus>('idle')
const redemptionsErrorMessage = ref('')
const criteriaDraft = reactive({
  name: '',
  description: '',
  weight: 10,
  displayOrder: 1
})
const criterionEdits = reactive<Record<string, CriterionEditState>>({})
const judgeAssignmentSearch = ref('')

const currentHackathon = computed(() => workspace.currentHackathon.value)
const actor = computed(() => workspace.actor.value)
const canManage = computed(() => workspace.canManageCurrentHackathon.value)
const canMutateRoles = computed(() => canMutateRoleAssignments(actor.value))
const criteria = computed(() => workspace.criteria.data.value?.data ?? [])
const prizes = computed(() => workspace.prizes.data.value?.data ?? [])
const roleAssignments = computed(() => workspace.roleAssignments.data.value?.data ?? [])
const applications = computed(() => workspace.applications.data.value?.data ?? [])
const judgeRoleAssignments = computed(() =>
  roleAssignments.value.filter(assignment => assignment.role === 'judge')
)

const assignableUsers = computed<AssignableUser[]>(() => {
  const usersById = new Map<string, AssignableUser>()

  for (const application of applications.value) {
    if (application.status !== 'approved' || !application.user) {
      continue
    }

    usersById.set(application.user.id, {
      id: application.user.id,
      displayName: application.user.displayName,
      email: application.user.email
    })
  }

  for (const assignment of roleAssignments.value) {
    if (!assignment.user) {
      continue
    }

    usersById.set(assignment.user.id, {
      id: assignment.user.id,
      displayName: assignment.user.displayName,
      email: assignment.user.email
    })
  }

  return [...usersById.values()].sort((left, right) => left.displayName.localeCompare(right.displayName))
})

const judgeAssignableUsers = computed(() => {
  const assignedJudgeIds = new Set(judgeRoleAssignments.value.map(assignment => assignment.userId))
  const query = judgeAssignmentSearch.value.trim().toLowerCase()

  return assignableUsers.value.filter((user) => {
    if (assignedJudgeIds.has(user.id)) {
      return false
    }

    if (!query) {
      return true
    }

    const haystack = `${user.displayName} ${user.email} ${user.id}`.toLowerCase()
    return haystack.includes(query)
  })
})

const canLoadShortlist = computed(() =>
  Boolean(currentHackathon.value && ['shortlist', 'winners_announced', 'completed'].includes(currentHackathon.value.state))
)

const canLoadWinners = computed(() =>
  Boolean(currentHackathon.value && ['winners_announced', 'completed'].includes(currentHackathon.value.state))
)

const judgeChoices = computed<JudgeChoice[]>(() =>
  roleAssignments.value
    .filter((assignment): assignment is HackathonRoleAssignment & { user: NonNullable<HackathonRoleAssignment['user']> } =>
      assignment.role === 'judge' && assignment.isInJudgePool && Boolean(assignment.user)
    )
    .map(assignment => ({
      value: assignment.userId,
      label: `${assignment.user.displayName} (${assignment.user.email})`
    }))
)

const rankedLeaderboardEntries = computed(() =>
  leaderboardEntries.value.filter(entry => entry.rank !== null)
)

const outcomeControl = computed(() => {
  if (!currentHackathon.value || !['shortlist', 'winners_announced'].includes(currentHackathon.value.state)) {
    return null
  }

  const lockedEntries = leaderboardEntries.value.filter(entry => entry.submissionStatus === 'locked')

  return getCurrentLifecycleControl(currentHackathon.value, {
    submittedSubmissionCount: 0,
    judgePoolCount: judgeChoices.value.length,
    lockedSubmissionCount: lockedEntries.length,
    activeAssignmentCount: assignments.value.filter(assignment =>
      assignment.status === 'assigned' || assignment.status === 'judge_started'
    ).length,
    lockedLeaderboardEntryCount: lockedEntries.length,
    completedReviewCount: lockedEntries.filter(entry => entry.reviewStatus === 'judge_completed').length,
    prizeCount: prizes.value.length,
    hasCurrentWinnerTerms: Boolean(currentHackathon.value.currentTerms?.winnerTerms)
  })
})

const assignmentSummaryValue = computed(() => {
  if (assignmentsStatus.value === 'pending') {
    return 'Loading...'
  }

  if (assignmentsStatus.value === 'error') {
    return 'Unavailable'
  }

  return `${assignments.value.length}`
})

const leaderboardSummaryValue = computed(() => {
  if (leaderboardStatus.value === 'pending') {
    return 'Loading...'
  }

  if (leaderboardStatus.value === 'error') {
    return 'Unavailable'
  }

  return `${rankedLeaderboardEntries.value.length}`
})

const shortlistSummaryValue = computed(() => {
  if (!canLoadShortlist.value) {
    return 'Unavailable'
  }

  if (shortlistStatus.value === 'pending') {
    return 'Loading...'
  }

  if (shortlistStatus.value === 'error') {
    return 'Unavailable'
  }

  return `${shortlistEntries.value.length}`
})

const winnerSummaryValue = computed(() => {
  if (!canLoadWinners.value) {
    return 'Pending announcement'
  }

  if (winnersStatus.value === 'pending') {
    return 'Loading...'
  }

  if (winnersStatus.value === 'error') {
    return 'Unavailable'
  }

  return `${winners.value.length}`
})

function nextDisplayOrder(items: Array<EvaluationCriterion>) {
  return items.reduce((highest, item) => Math.max(highest, item.displayOrder), 0) + 1
}

function replaceReactiveMap<T>(target: Record<string, T>, source: Record<string, T>) {
  for (const key of Object.keys(target)) {
    if (!(key in source)) {
      Reflect.deleteProperty(target, key)
    }
  }

  Object.assign(target, source)
}

function createCriterionEditState(criterion: EvaluationCriterion): CriterionEditState {
  return {
    name: criterion.name,
    description: criterion.description,
    weight: criterion.weight,
    displayOrder: criterion.displayOrder
  }
}

function getCriterionEdit(criterion: EvaluationCriterion) {
  const existing = criterionEdits[criterion.id]

  if (existing) {
    return existing
  }

  const next = createCriterionEditState(criterion)
  criterionEdits[criterion.id] = next
  return next
}

watch(criteria, (items) => {
  criteriaDraft.displayOrder = nextDisplayOrder(items)
  replaceReactiveMap(
    criterionEdits,
    Object.fromEntries(items.map(criterion => [criterion.id, createCriterionEditState(criterion)]))
  )
}, {
  immediate: true
})

function toSectionErrorMessage(error: unknown, fallback: string) {
  const message = normalizeApiError(error).message
  return message && message.length > 0 ? message : fallback
}

async function loadAssignments() {
  assignmentsStatus.value = 'pending'
  assignmentsErrorMessage.value = ''

  try {
    const response = await $fetch<ApiListResponse<JudgeAssignmentSummary>>(
      `/api/hackathons/${hackathonId.value}/judging/assignments`
    )
    assignments.value = response.data
    assignmentsStatus.value = 'success'
  } catch (error) {
    assignments.value = []
    assignmentsStatus.value = 'error'
    assignmentsErrorMessage.value = toSectionErrorMessage(
      error,
      'Assignment oversight data could not be loaded right now.'
    )
  }
}

async function loadLeaderboard() {
  leaderboardStatus.value = 'pending'
  leaderboardErrorMessage.value = ''

  try {
    const response = await $fetch<ApiListResponse<LeaderboardEntry>>(
      `/api/hackathons/${hackathonId.value}/leaderboard`
    )
    leaderboardEntries.value = response.data
    leaderboardStatus.value = 'success'
  } catch (error) {
    leaderboardEntries.value = []
    leaderboardStatus.value = 'error'
    leaderboardErrorMessage.value = toSectionErrorMessage(
      error,
      'Competition leaderboard data could not be loaded right now.'
    )
  }
}

async function loadShortlist() {
  if (!canLoadShortlist.value) {
    shortlistEntries.value = []
    shortlistStatus.value = 'idle'
    shortlistErrorMessage.value = ''
    return
  }

  shortlistStatus.value = 'pending'
  shortlistErrorMessage.value = ''

  try {
    const response = await $fetch<ApiListResponse<ShortlistEntry>>(
      `/api/hackathons/${hackathonId.value}/shortlist`
    )
    shortlistEntries.value = response.data
    shortlistStatus.value = 'success'
  } catch (error) {
    shortlistEntries.value = []
    shortlistStatus.value = 'error'
    shortlistErrorMessage.value = toSectionErrorMessage(
      error,
      'Shortlist ranking data could not be loaded right now.'
    )
  }
}

async function loadWinners() {
  if (!canLoadWinners.value) {
    winners.value = []
    winnersStatus.value = 'idle'
    winnersErrorMessage.value = ''
    return
  }

  winnersStatus.value = 'pending'
  winnersErrorMessage.value = ''

  try {
    const response = await $fetch<ApiListResponse<WinnerEntry>>(
      `/api/hackathons/${hackathonId.value}/winners`
    )
    winners.value = response.data
    winnersStatus.value = 'success'
  } catch (error) {
    winners.value = []
    winnersStatus.value = 'error'
    winnersErrorMessage.value = toSectionErrorMessage(
      error,
      'Winner records could not be loaded right now.'
    )
  }
}

async function loadPrizeRedemptions() {
  if (!canLoadWinners.value) {
    redemptions.value = []
    redemptionsStatus.value = 'idle'
    redemptionsErrorMessage.value = ''
    return
  }

  redemptionsStatus.value = 'pending'
  redemptionsErrorMessage.value = ''

  try {
    const response = await $fetch<ApiDataResponse<PrizeRedemptionAdminView>>(
      `/api/hackathons/${hackathonId.value}/prize-redemptions`
    )
    redemptions.value = response.data.redemptions
    redemptionsStatus.value = 'success'
  } catch (error) {
    redemptions.value = []
    redemptionsStatus.value = 'error'
    redemptionsErrorMessage.value = toSectionErrorMessage(
      error,
      'Prize redemption records could not be loaded right now.'
    )
  }
}

async function loadCompetitionData() {
  await Promise.all([
    loadAssignments(),
    loadLeaderboard(),
    loadShortlist(),
    loadWinners(),
    loadPrizeRedemptions()
  ])
}

watch([() => currentHackathon.value?.id, canManage], async ([id, allowed]) => {
  if (!id || !allowed) {
    return
  }

  if (initializedHackathonId.value === id) {
    return
  }

  initializedHackathonId.value = id
  await loadCompetitionData()
}, {
  immediate: true
})

async function refreshCompetition() {
  await Promise.all([
    workspace.hackathon.refresh(),
    workspace.criteria.refresh(),
    workspace.prizes.refresh(),
    workspace.roleAssignments.refresh(),
    workspace.applications.refresh(),
    workspace.winnerTermsVersions.refresh()
  ])
  await loadCompetitionData()
}

async function runMutation(actionKey: string, action: () => Promise<void>, successTitle: string, successDescription: string) {
  mutationError.value = ''
  pendingActionKey.value = actionKey

  try {
    await action()
    toast.add({
      title: successTitle,
      description: successDescription,
      color: 'success'
    })
    await refreshCompetition()
  } catch (error) {
    mutationError.value = normalizeApiError(error).message
  } finally {
    pendingActionKey.value = null
  }
}

async function createCriterion() {
  await runMutation(
    'criterion:create',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/evaluation-criteria`, {
        method: 'POST',
        body: { ...criteriaDraft }
      })
      criteriaDraft.name = ''
      criteriaDraft.description = ''
      criteriaDraft.weight = 10
    },
    'Criterion added',
    'The judging rubric has been updated.'
  )
}

async function updateCriterion(criterionId: string) {
  const edit = criterionEdits[criterionId]

  if (!edit) {
    return
  }

  await runMutation(
    `criterion:update:${criterionId}`,
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/evaluation-criteria/${criterionId}`, {
        method: 'PATCH',
        body: {
          name: edit.name,
          description: edit.description,
          weight: edit.weight,
          displayOrder: edit.displayOrder
        }
      })
    },
    'Criterion updated',
    'The judging rubric entry was updated.'
  )
}

async function assignJudge(userId: string) {
  const trimmedUserId = userId.trim()

  if (!trimmedUserId) {
    return
  }

  await runMutation(
    `judge:assign:${trimmedUserId}`,
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/roles/${trimmedUserId}`, {
        method: 'PUT',
        body: {
          role: 'judge',
          isInJudgePool: true
        }
      })
    },
    'Judge assigned',
    'The judge pool roster was updated.'
  )
}

async function removeJudge(assignment: HackathonRoleAssignment) {
  await runMutation(
    `judge:remove:${assignment.userId}`,
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/roles/${assignment.userId}`, {
        method: 'DELETE'
      })
    },
    'Judge removed',
    'The judge pool roster was updated.'
  )
}

async function reassignAssignment(payload: { assignmentId: string, judgeUserId?: string, reason?: string }) {
  await runMutation(
    `reassign:${payload.assignmentId}`,
    async () => {
      await $fetch(
        `/api/hackathons/${hackathonId.value}/judging/assignments/${payload.assignmentId}/actions/reassign`,
        {
          method: 'POST',
          body: payload
        }
      )
    },
    'Assignment reassigned',
    'The blind review assignment has been moved to a different judge.'
  )
}

async function forceSkipAssignment(payload: { assignmentId: string, reason?: string }) {
  await runMutation(
    `force-skip:${payload.assignmentId}`,
    async () => {
      await $fetch(
        `/api/hackathons/${hackathonId.value}/judging/assignments/${payload.assignmentId}/actions/force-skip`,
        {
          method: 'POST',
          body: {
            reason: payload.reason
          }
        }
      )
    },
    'Assignment force-skipped',
    'The active blind review was skipped and redistributed.'
  )
}

async function reorderShortlist(orderedSubmissionIds: string[]) {
  await runMutation(
    'shortlist-reorder',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/shortlist/actions/reorder`, {
        method: 'POST',
        body: {
          orderedSubmissionIds
        }
      })
    },
    'Shortlist updated',
    'The final ranking order has been updated without changing judge scores.'
  )
}

async function announceWinners() {
  await runMutation(
    'announce-winners',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/actions/announce-winners`, {
        method: 'POST'
      })
    },
    'Winners announced',
    'The final competition outcome is now published.'
  )
}

async function completeHackathon() {
  await runMutation(
    'complete-hackathon',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/actions/complete`, {
        method: 'POST'
      })
    },
    'Hackathon completed',
    'The competition outcome is now final.'
  )
}
</script>

<template>
  <div class="space-y-8">
      <AppAlert
        v-if="mutationError"
        color="error"
        variant="soft"
        title="Judging action failed"
        :description="mutationError"
      />

      <AppAlert
        v-if="workspace.hackathon.error.value"
        color="error"
        variant="soft"
        title="Unable to load hackathon"
        :description="workspace.hackathon.error.value.message"
      />

      <AppAlert
        v-else-if="workspace.hackathon.status.value === 'pending'"
        color="neutral"
        variant="soft"
        title="Loading judging workspace"
        description="Resolving the hackathon, role assignments, and judging surfaces for this admin session."
      />

      <AppAlert
        v-else-if="currentHackathon && !canManage"
        color="warning"
        variant="soft"
        title="Admin access required"
        description="This hackathon is visible, but the current actor does not have hackathon-admin capabilities for its judging workspace."
      />

      <template v-else-if="currentHackathon">
        <section class="grid gap-4 lg:grid-cols-4">
          <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Hackathon state
            </p>
            <div class="mt-2 flex items-center gap-3">
              <AppBadge
                data-testid="admin-competition-hackathon-state"
                :color="getHackathonStateColor(currentHackathon.state)"
                variant="soft"
              >
                {{ formatHackathonState(currentHackathon.state) }}
              </AppBadge>
            </div>
          </div>

          <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Assignment oversight
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ assignmentSummaryValue }}
            </p>
          </div>

          <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Ranked submissions
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ leaderboardSummaryValue }}
            </p>
          </div>

          <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Finalized winners
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ winnerSummaryValue }}
            </p>
          </div>
        </section>

        <section class="grid gap-6 xl:grid-cols-2">
          <AppCard class="rounded-xl hackathon-workspace-detail-panel">
            <template #header>
              <div class="space-y-1">
                <h2 class="text-lg font-semibold text-highlighted">
                  Judging Criteria
                </h2>
                <p class="text-sm text-muted">
                  Define and maintain the weighted rubric used for judge reviews and leaderboard scoring.
                </p>
              </div>
            </template>

            <div class="space-y-4">
              <div class="grid gap-4 md:grid-cols-2">
                <input
                  v-model="criteriaDraft.name"
                  type="text"
                  class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                  placeholder="Criterion name"
                >
                <input
                  v-model.number="criteriaDraft.weight"
                  type="number"
                  min="0"
                  class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                  placeholder="Weight"
                >
              </div>
              <textarea
                v-model="criteriaDraft.description"
                rows="3"
                class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                placeholder="Criterion description"
              />
              <AppButton
                v-if="canMutateRoles"
                color="primary"
                label="Add Criterion"
                @click="createCriterion"
              />

              <div class="grid gap-3">
                <div
                  v-for="criterion in criteria"
                  :key="criterion.id"
                  class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-4 py-4"
                >
                  <div class="grid gap-4">
                    <div class="grid gap-4 md:grid-cols-[1fr_120px_120px]">
                      <input
                        v-model="getCriterionEdit(criterion).name"
                        type="text"
                        class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                        placeholder="Criterion name"
                      >
                      <input
                        v-model.number="getCriterionEdit(criterion).weight"
                        type="number"
                        min="0"
                        class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                        placeholder="Weight"
                      >
                      <input
                        v-model.number="getCriterionEdit(criterion).displayOrder"
                        type="number"
                        min="1"
                        class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                        placeholder="Order"
                      >
                    </div>
                    <textarea
                      v-model="getCriterionEdit(criterion).description"
                      rows="3"
                      class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                      placeholder="Criterion description"
                    />
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                        Existing criterion
                      </p>
                      <AppButton
                        v-if="canMutateRoles"
                        size="sm"
                        variant="soft"
                        @click="updateCriterion(criterion.id)"
                      >
                        Save updates
                      </AppButton>
                    </div>
                  </div>
                </div>
                <p
                  v-if="criteria.length === 0"
                  class="text-sm text-muted"
                >
                  No judging criteria have been configured yet.
                </p>
              </div>
            </div>
          </AppCard>

          <AppCard class="rounded-xl hackathon-workspace-detail-panel">
            <template #header>
              <div class="space-y-1">
                <h2 class="text-lg font-semibold text-highlighted">
                  Judge Assignments
                </h2>
                <p class="text-sm text-muted">
                  Search approved users and manage who is explicitly assigned to judge this hackathon.
                </p>
              </div>
            </template>

            <div class="space-y-4">
              <AppAlert
                v-if="!canMutateRoles"
                color="warning"
                variant="soft"
                title="Hackathon admin access required"
                description="The current actor can review this roster but cannot modify it for this hackathon."
              />

              <template v-else>
                <input
                  v-model="judgeAssignmentSearch"
                  type="text"
                  class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                  placeholder="Search users by name, email, or user ID"
                >
                <div class="grid gap-3">
                  <div
                    v-for="user in judgeAssignableUsers"
                    :key="user.id"
                    class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent flex flex-wrap items-center justify-between gap-3 px-4 py-3"
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
                      @click="assignJudge(user.id)"
                    >
                      Assign judge
                    </AppButton>
                  </div>
                  <p
                    v-if="judgeAssignableUsers.length === 0"
                    class="text-sm text-muted"
                  >
                    No assignable users match the current search.
                  </p>
                </div>
              </template>

              <div class="grid gap-3">
                <div
                  v-for="assignment in judgeRoleAssignments"
                  :key="assignment.id"
                  class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-4 py-4"
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
                      v-if="canMutateRoles"
                      size="sm"
                      color="error"
                      variant="soft"
                      @click="removeJudge(assignment)"
                    >
                      Remove
                    </AppButton>
                  </div>
                </div>
                <p
                  v-if="judgeRoleAssignments.length === 0"
                  class="text-sm text-muted"
                >
                  No judges have been explicitly assigned yet.
                </p>
              </div>
            </div>
          </AppCard>
        </section>

        <AdminCompetitionAssignmentsPanel
          :hackathon-state="currentHackathon.state"
          :assignments="assignments"
          :judge-choices="judgeChoices"
          :is-loading="assignmentsStatus === 'pending'"
          :error-message="assignmentsStatus === 'error' ? assignmentsErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          @reassign="reassignAssignment"
          @force-skip="forceSkipAssignment"
        />

        <section class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <AdminCompetitionShortlistPanel
            :hackathon-state="currentHackathon.state"
            :leaderboard="leaderboardEntries"
            :shortlist="shortlistEntries"
            :is-leaderboard-loading="leaderboardStatus === 'pending'"
            :leaderboard-error-message="leaderboardStatus === 'error' ? leaderboardErrorMessage : ''"
            :is-shortlist-loading="shortlistStatus === 'pending'"
            :shortlist-error-message="shortlistStatus === 'error' ? shortlistErrorMessage : ''"
            :pending-action-key="pendingActionKey"
            @reorder="reorderShortlist"
          />

          <AdminCompetitionOutcomePanel
            :hackathon-state="currentHackathon.state"
            :winners="winners"
            :winner-terms-title="currentHackathon.currentTerms?.winnerTerms?.title ?? null"
            :outcome-control="outcomeControl"
            :is-loading="winnersStatus === 'pending'"
            :error-message="winnersStatus === 'error' ? winnersErrorMessage : ''"
            :pending-action-key="pendingActionKey"
            @announce-winners="announceWinners"
            @complete-hackathon="completeHackathon"
          />
        </section>

        <AdminCompetitionPrizeRedemptionsPanel
          :hackathon-state="currentHackathon.state"
          :winners="winners"
          :redemptions="redemptions"
          :is-loading="redemptionsStatus === 'pending'"
          :error-message="redemptionsStatus === 'error' ? redemptionsErrorMessage : ''"
        />

        <AppAlert
          v-if="!['judging_preparation', 'judge_review', 'shortlist', 'winners_announced', 'completed'].includes(currentHackathon.state)"
          color="neutral"
          variant="soft"
          title="Judging workflow is staged"
          description="Assignment operations become fully active once submissions close and judging preparation begins."
        />

        <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Shortlist status
          </p>
          <p class="mt-2 text-sm text-toned">
            Shortlist entries: {{ shortlistSummaryValue }}.
            Current winner terms: {{ currentHackathon.currentTerms?.winnerTerms?.title ?? 'None selected' }}.
          </p>
        </div>
      </template>
  </div>
</template>
