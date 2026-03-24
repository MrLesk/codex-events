<script setup lang="ts">
import type {
  EvaluationCriterion,
  HackathonRoleAssignment,
  PrizeDefinition,
  TermsDocument
} from '~/utils/admin-workspace'

import { requireAuthNavigationGuard } from '~/utils/auth-guards'
import {
  canMutateRoleAssignments,
  createHackathonFormState,
  formatHackathonState,
  fromDateTimeLocalValue,
  getCurrentLifecycleControl,
  getHackathonStateColor,
  normalizeApiError
} from '~/utils/admin-workspace'

definePageMeta({
  middleware: [requireAuthNavigationGuard]
})

type CriterionEditState = Pick<EvaluationCriterion, 'name' | 'description' | 'weight' | 'displayOrder'>
type PrizeEditState = Pick<PrizeDefinition, 'name' | 'description' | 'rewardType' | 'rewardValue' | 'awardScope' | 'rankStart' | 'rankEnd'> & {
  rewardCurrency: string
}
type RoleAssignmentEditState = Pick<HackathonRoleAssignment, 'role' | 'isInJudgePool'>
type RoleAssignmentDraftState = RoleAssignmentEditState & {
  userId: string
}

const route = useRoute()
const toast = useToast()
const hackathonId = computed(() => route.params.hackathonId as string)
const workspace = useAdminHackathonWorkspace(hackathonId)

const isSavingConfig = ref(false)
const mutationError = ref('')
const criteriaDraft = reactive({
  name: '',
  description: '',
  weight: 10,
  displayOrder: 1
})
const prizeDraft = reactive({
  name: '',
  description: '',
  rewardType: 'api_credits',
  rewardValue: '',
  rewardCurrency: '',
  awardScope: 'team',
  rankStart: 1,
  rankEnd: 1
})
const roleDraft = reactive<RoleAssignmentDraftState>({
  userId: '',
  role: 'judge',
  isInJudgePool: true
})
const termsDraft = reactive({
  documentType: 'application_terms',
  title: '',
  content: ''
})
const criterionEdits = reactive<Record<string, CriterionEditState>>({})
const prizeEdits = reactive<Record<string, PrizeEditState>>({})
const roleAssignmentEdits = reactive<Record<string, RoleAssignmentEditState>>({})

const configForm = reactive({
  ...createHackathonFormState({
    id: '',
    name: '',
    slug: '',
    description: '',
    backgroundImageUrl: null,
    bannerImageUrl: null,
    city: '',
    address: '',
    registrationOpensAt: '',
    registrationClosesAt: '',
    submissionOpensAt: '',
    submissionClosesAt: '',
    state: 'draft',
    maxTeamMembers: 4,
    requireXProfile: false,
    requireLinkedinProfile: false,
    requireGithubProfile: false,
    requireLumaProfile: false,
    currentApplicationTermsDocumentId: null,
    currentWinnerTermsDocumentId: null,
    createdByUserId: '',
    createdAt: '',
    updatedAt: ''
  })
})

watch(() => workspace.currentHackathon.value, (hackathon) => {
  if (!hackathon) {
    return
  }

  Object.assign(configForm, createHackathonFormState(hackathon))
}, {
  immediate: true
})

const currentHackathon = computed(() => workspace.currentHackathon.value)
const actor = computed(() => workspace.actor.value)
const canManage = computed(() => workspace.canManageCurrentHackathon.value)
const canMutateRoles = computed(() => canMutateRoleAssignments(actor.value))
const criteria = computed(() => workspace.criteria.data.value?.data ?? [])
const prizes = computed(() => workspace.prizes.data.value?.data ?? [])
const applicationTerms = computed(() => workspace.applicationTermsVersions.data.value?.data ?? [])
const winnerTerms = computed(() => workspace.winnerTermsVersions.data.value?.data ?? [])
const roleAssignments = computed(() => workspace.roleAssignments.data.value?.data ?? [])
const assignments = computed(() => workspace.assignments.data.value?.data ?? [])
const leaderboard = computed(() => workspace.leaderboard.data.value?.data ?? [])
const teams = computed(() => workspace.teams.data.value ?? [])
const noSubmissionTeams = computed(() => workspace.noSubmissionTeams.data.value?.data ?? [])

const lifecycleMetrics = computed(() => {
  const lockedEntries = leaderboard.value.filter(entry => entry.submissionStatus === 'locked')

  return {
    submittedSubmissionCount: Math.max(teams.value.length - noSubmissionTeams.value.length, 0),
    judgePoolCount: roleAssignments.value.filter(assignment => assignment.isInJudgePool).length,
    lockedSubmissionCount: lockedEntries.length,
    activeAssignmentCount: assignments.value.length,
    lockedLeaderboardEntryCount: lockedEntries.length,
    completedReviewCount: lockedEntries.filter(entry => entry.reviewStatus === 'judge_completed').length,
    prizeCount: prizes.value.length,
    hasCurrentWinnerTerms: Boolean(currentHackathon.value?.currentTerms?.winnerTerms)
  }
})

const lifecycleControl = computed(() => {
  if (!currentHackathon.value) {
    return null
  }

  return getCurrentLifecycleControl(currentHackathon.value, lifecycleMetrics.value)
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

function createPrizeEditState(prize: PrizeDefinition): PrizeEditState {
  return {
    name: prize.name,
    description: prize.description,
    rewardType: prize.rewardType,
    rewardValue: prize.rewardValue,
    rewardCurrency: prize.rewardCurrency ?? '',
    awardScope: prize.awardScope,
    rankStart: prize.rankStart,
    rankEnd: prize.rankEnd
  }
}

function createRoleAssignmentEditState(assignment: HackathonRoleAssignment): RoleAssignmentEditState {
  return {
    role: assignment.role,
    isInJudgePool: assignment.isInJudgePool
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

function getPrizeEdit(prize: PrizeDefinition) {
  const existing = prizeEdits[prize.id]

  if (existing) {
    return existing
  }

  const next = createPrizeEditState(prize)
  prizeEdits[prize.id] = next
  return next
}

function getRoleAssignmentEdit(assignment: HackathonRoleAssignment) {
  const existing = roleAssignmentEdits[assignment.id]

  if (existing) {
    return existing
  }

  const next = createRoleAssignmentEditState(assignment)
  roleAssignmentEdits[assignment.id] = next
  return next
}

function toRoleAssignmentPayload(draft: RoleAssignmentEditState) {
  return {
    role: draft.role,
    isInJudgePool: draft.role === 'judge' ? true : draft.isInJudgePool
  }
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

watch(prizes, (items) => {
  replaceReactiveMap(
    prizeEdits,
    Object.fromEntries(items.map(prize => [prize.id, createPrizeEditState(prize)]))
  )
}, {
  immediate: true
})

watch(roleAssignments, (items) => {
  replaceReactiveMap(
    roleAssignmentEdits,
    Object.fromEntries(items.map(assignment => [assignment.id, createRoleAssignmentEditState(assignment)]))
  )
}, {
  immediate: true
})

watch(() => roleDraft.role, (role) => {
  if (role === 'judge') {
    roleDraft.isInJudgePool = true
  }
})

async function runMutation(action: () => Promise<void>, successTitle: string, successDescription: string) {
  mutationError.value = ''

  try {
    await action()
    toast.add({
      title: successTitle,
      description: successDescription,
      color: 'success'
    })
    await workspace.refreshWorkspace()
  } catch (error) {
    mutationError.value = normalizeApiError(error).message
  }
}

async function saveConfiguration() {
  if (!currentHackathon.value) {
    return
  }

  mutationError.value = ''
  isSavingConfig.value = true

  try {
    await $fetch(`/api/hackathons/${currentHackathon.value.id}`, {
      method: 'PATCH',
      body: {
        name: configForm.name,
        slug: configForm.slug,
        description: configForm.description,
        backgroundImageUrl: configForm.backgroundImageUrl || null,
        bannerImageUrl: configForm.bannerImageUrl || null,
        city: configForm.city,
        address: configForm.address,
        registrationOpensAt: fromDateTimeLocalValue(configForm.registrationOpensAt),
        registrationClosesAt: fromDateTimeLocalValue(configForm.registrationClosesAt),
        submissionOpensAt: fromDateTimeLocalValue(configForm.submissionOpensAt),
        submissionClosesAt: fromDateTimeLocalValue(configForm.submissionClosesAt),
        maxTeamMembers: configForm.maxTeamMembers,
        requireXProfile: configForm.requireXProfile,
        requireLinkedinProfile: configForm.requireLinkedinProfile,
        requireGithubProfile: configForm.requireGithubProfile,
        requireLumaProfile: configForm.requireLumaProfile
      }
    })

    toast.add({
      title: 'Configuration saved',
      description: 'Hackathon settings now match the latest admin updates.',
      color: 'success'
    })

    await workspace.refreshWorkspace()
  } catch (error) {
    mutationError.value = normalizeApiError(error).message
  } finally {
    isSavingConfig.value = false
  }
}

async function createCriterion() {
  const hackathon = currentHackathon.value

  if (!hackathon) {
    return
  }

  await runMutation(async () => {
    await $fetch(`/api/hackathons/${hackathon.id}/evaluation-criteria`, {
      method: 'POST',
      body: { ...criteriaDraft }
    })
    criteriaDraft.name = ''
    criteriaDraft.description = ''
    criteriaDraft.weight = 10
  }, 'Criterion added', 'The evaluation criteria list has been updated.')
}

async function updateCriterion(criterionId: string) {
  const hackathon = currentHackathon.value
  const edit = criterionEdits[criterionId]

  if (!hackathon || !edit) {
    return
  }

  await runMutation(async () => {
    await $fetch(`/api/hackathons/${hackathon.id}/evaluation-criteria/${criterionId}`, {
      method: 'PATCH',
      body: {
        name: edit.name,
        description: edit.description,
        weight: edit.weight,
        displayOrder: edit.displayOrder
      }
    })
  }, 'Criterion updated', 'The evaluation criterion has been updated.')
}

async function createPrize() {
  const hackathon = currentHackathon.value

  if (!hackathon) {
    return
  }

  await runMutation(async () => {
    await $fetch(`/api/hackathons/${hackathon.id}/prizes`, {
      method: 'POST',
      body: {
        ...prizeDraft,
        rewardCurrency: prizeDraft.rewardCurrency || null
      }
    })
    prizeDraft.name = ''
    prizeDraft.description = ''
    prizeDraft.rewardValue = ''
    prizeDraft.rewardCurrency = ''
    prizeDraft.rankStart = 1
    prizeDraft.rankEnd = 1
  }, 'Prize added', 'The prize catalog has been updated.')
}

async function updatePrize(prizeId: string) {
  const hackathon = currentHackathon.value
  const edit = prizeEdits[prizeId]

  if (!hackathon || !edit) {
    return
  }

  await runMutation(async () => {
    await $fetch(`/api/hackathons/${hackathon.id}/prizes/${prizeId}`, {
      method: 'PATCH',
      body: {
        name: edit.name,
        description: edit.description,
        rewardType: edit.rewardType,
        rewardValue: edit.rewardValue,
        rewardCurrency: edit.rewardCurrency || null,
        awardScope: edit.awardScope,
        rankStart: edit.rankStart,
        rankEnd: edit.rankEnd
      }
    })
  }, 'Prize updated', 'The prize definition has been updated.')
}

async function createRoleAssignment() {
  const hackathon = currentHackathon.value
  const userId = roleDraft.userId.trim()

  if (!hackathon || !userId) {
    if (!userId) {
      mutationError.value = 'Enter a platform user ID before saving an explicit role assignment.'
    }

    return
  }

  await runMutation(async () => {
    await $fetch(`/api/hackathons/${hackathon.id}/roles/${userId}`, {
      method: 'PUT',
      body: toRoleAssignmentPayload(roleDraft)
    })
    roleDraft.userId = ''
    roleDraft.role = 'judge'
    roleDraft.isInJudgePool = true
  }, 'Role assignment saved', 'The explicit hackathon access list has been updated.')
}

async function updateRoleAssignment(assignment: HackathonRoleAssignment) {
  const hackathon = currentHackathon.value
  const edit = roleAssignmentEdits[assignment.id]

  if (!hackathon || !edit) {
    return
  }

  await runMutation(async () => {
    await $fetch(`/api/hackathons/${hackathon.id}/roles/${assignment.userId}`, {
      method: 'PUT',
      body: toRoleAssignmentPayload(edit)
    })
  }, 'Role assignment updated', 'The explicit hackathon access entry has been updated.')
}

async function deleteRoleAssignment(assignment: HackathonRoleAssignment) {
  const hackathon = currentHackathon.value

  if (!hackathon) {
    return
  }

  await runMutation(async () => {
    await $fetch(`/api/hackathons/${hackathon.id}/roles/${assignment.userId}`, {
      method: 'DELETE'
    })
  }, 'Role assignment removed', 'The explicit hackathon access entry has been removed.')
}

function reuseRoleAssignmentUserId(assignment: HackathonRoleAssignment) {
  roleDraft.userId = assignment.userId
  roleDraft.role = assignment.role
  roleDraft.isInJudgePool = assignment.isInJudgePool
}

async function createTermsVersion() {
  const hackathon = currentHackathon.value

  if (!hackathon) {
    return
  }

  await runMutation(async () => {
    await $fetch(`/api/hackathons/${hackathon.id}/terms/${termsDraft.documentType}/versions`, {
      method: 'POST',
      body: {
        title: termsDraft.title,
        content: termsDraft.content
      }
    })
    termsDraft.title = ''
    termsDraft.content = ''
  }, 'Terms version published', 'A new hackathon terms version is now available.')
}

async function setCurrentTerms(document: TermsDocument) {
  const hackathon = currentHackathon.value

  if (!hackathon) {
    return
  }

  await runMutation(async () => {
    await $fetch(`/api/hackathons/${hackathon.id}/terms/${document.documentType}/actions/set-current`, {
      method: 'POST',
      body: {
        hackathonTermsDocumentId: document.id
      }
    })
  }, 'Current terms updated', 'The hackathon now references the selected terms version.')
}

async function runLifecycleAction() {
  if (!lifecycleControl.value) {
    return
  }

  await runMutation(async () => {
    await $fetch(lifecycleControl.value!.endpoint, {
      method: 'POST'
    })
  }, 'Lifecycle updated', `${lifecycleControl.value.label} completed successfully.`)
}
</script>

<template>
  <AppContainer class="space-y-8 py-10 sm:py-14">
    <AdminWorkspaceHeader
      eyebrow="Admin Workspace"
      :title="currentHackathon ? currentHackathon.name : 'Hackathon workspace'"
      description="Configure the hackathon, manage terms and scoring rules, control explicit access, and advance only the lifecycle transitions that the current state allows."
    />

    <AdminHackathonWorkspaceTabs
      v-if="currentHackathon"
      :hackathon-id="currentHackathon.id"
      current-surface="setup"
    />

    <AppAlert
      v-if="mutationError"
      color="error"
      variant="soft"
      title="Admin action failed"
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
      v-else-if="currentHackathon && !canManage"
      color="warning"
      variant="soft"
      title="Admin access required"
      description="This hackathon is visible, but the current actor does not have hackathon-admin capabilities for it."
    />

    <template v-else-if="currentHackathon">
      <section class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <AppCard class="border border-default/70 bg-elevated/90">
          <template #header>
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="text-lg font-semibold text-highlighted">
                Program Snapshot
              </h2>
              <AppBadge
                :color="getHackathonStateColor(currentHackathon.state)"
                variant="soft"
              >
                {{ formatHackathonState(currentHackathon.state) }}
              </AppBadge>
            </div>
          </template>

          <div class="grid gap-4 text-sm">
            <div class="grid gap-1 rounded-2xl border border-default bg-default px-4 py-3">
              <span class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Actor</span>
              <span class="text-base font-semibold text-highlighted">
                {{ actor?.platformUser?.displayName ?? actor?.sessionUser?.email }}
              </span>
              <span class="text-muted">
                {{ actor?.isPlatformAdmin ? 'Platform admin authority' : 'Hackathon-admin authority' }}
              </span>
            </div>

            <div class="grid gap-1 rounded-2xl border border-default bg-default px-4 py-3">
              <span class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Current terms</span>
              <span class="text-highlighted">
                Application: {{ currentHackathon.currentTerms?.applicationTerms?.title ?? 'None selected' }}
              </span>
              <span class="text-highlighted">
                Winner: {{ currentHackathon.currentTerms?.winnerTerms?.title ?? 'None selected' }}
              </span>
            </div>

            <div
              v-if="lifecycleControl"
              class="grid gap-3 rounded-[1.75rem] border border-default bg-default px-4 py-4"
            >
              <div class="space-y-1">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Next lifecycle action
                </p>
                <h3 class="text-base font-semibold text-highlighted">
                  {{ lifecycleControl.label }}
                </h3>
                <p class="text-sm text-toned">
                  {{ lifecycleControl.description }}
                </p>
              </div>

              <AppAlert
                v-if="lifecycleControl.reason"
                color="warning"
                variant="soft"
                title="Not ready yet"
                :description="lifecycleControl.reason"
              />

              <AppButton
                :disabled="!lifecycleControl.isEnabled"
                color="primary"
                size="lg"
                @click="runLifecycleAction"
              >
                {{ lifecycleControl.label }}
              </AppButton>
            </div>
          </div>
        </AppCard>

        <HackathonConfigForm
          v-model:form="configForm"
          :is-submitting="isSavingConfig"
          submit-label="Save Configuration"
          helper-text="This workspace stays focused on setup and lifecycle controls. Day-to-day application, team, and submission operations now live in the dedicated Operations workspace."
          @submit="saveConfiguration"
        />
      </section>

      <section class="grid gap-6 xl:grid-cols-2">
        <AppCard class="border border-default/70 bg-elevated/90">
          <template #header>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-highlighted">
                Terms Management
              </h2>
              <p class="text-sm text-muted">
                Publish exact versions and set the current application or winner terms references.
              </p>
            </div>
          </template>

          <div class="space-y-6">
            <div class="grid gap-4 md:grid-cols-[0.4fr_0.6fr]">
              <label class="grid gap-2">
                <span class="text-sm font-medium text-toned">Document type</span>
                <select
                  v-model="termsDraft.documentType"
                  class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                >
                  <option value="application_terms">
                    Application terms
                  </option>
                  <option value="winner_terms">
                    Winner terms
                  </option>
                </select>
              </label>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-toned">Title</span>
                <input
                  v-model="termsDraft.title"
                  type="text"
                  class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                  placeholder="Spring 2026 Application Terms v2"
                >
              </label>
            </div>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Content</span>
              <textarea
                v-model="termsDraft.content"
                rows="5"
                class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                placeholder="Enter the canonical terms content."
              />
            </label>

            <AppButton
              color="primary"
              label="Publish Terms Version"
              @click="createTermsVersion"
            />

            <div class="grid gap-4 lg:grid-cols-2">
              <div class="space-y-3">
                <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                  Application terms
                </h3>
                <div
                  v-for="document in applicationTerms"
                  :key="document.id"
                  class="rounded-2xl border border-default bg-default px-4 py-4"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="space-y-1">
                      <p class="font-semibold text-highlighted">
                        {{ document.title }}
                      </p>
                      <p class="text-sm text-muted">
                        Version {{ document.version }}
                      </p>
                    </div>
                    <AppButton
                      size="sm"
                      variant="soft"
                      :disabled="currentHackathon.currentApplicationTermsDocumentId === document.id"
                      @click="setCurrentTerms(document)"
                    >
                      {{ currentHackathon.currentApplicationTermsDocumentId === document.id ? 'Current' : 'Set current' }}
                    </AppButton>
                  </div>
                </div>
              </div>

              <div class="space-y-3">
                <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                  Winner terms
                </h3>
                <div
                  v-for="document in winnerTerms"
                  :key="document.id"
                  class="rounded-2xl border border-default bg-default px-4 py-4"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="space-y-1">
                      <p class="font-semibold text-highlighted">
                        {{ document.title }}
                      </p>
                      <p class="text-sm text-muted">
                        Version {{ document.version }}
                      </p>
                    </div>
                    <AppButton
                      size="sm"
                      variant="soft"
                      :disabled="currentHackathon.currentWinnerTermsDocumentId === document.id"
                      @click="setCurrentTerms(document)"
                    >
                      {{ currentHackathon.currentWinnerTermsDocumentId === document.id ? 'Current' : 'Set current' }}
                    </AppButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AppCard>

        <AppCard class="border border-default/70 bg-elevated/90">
          <template #header>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-highlighted">
                Criteria and Prizes
              </h2>
              <p class="text-sm text-muted">
                Configure the canonical scoring dimensions and prize definitions that later operational tasks rely on.
              </p>
            </div>
          </template>

          <div class="space-y-8">
            <div class="grid gap-4">
              <div class="grid gap-4 md:grid-cols-2">
                <input
                  v-model="criteriaDraft.name"
                  type="text"
                  class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                  placeholder="Criterion name"
                >
                <input
                  v-model.number="criteriaDraft.weight"
                  type="number"
                  min="0"
                  class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                  placeholder="Weight"
                >
              </div>
              <textarea
                v-model="criteriaDraft.description"
                rows="3"
                class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                placeholder="Criterion description"
              />
              <AppButton
                color="primary"
                label="Add Criterion"
                @click="createCriterion"
              />
              <div class="grid gap-3">
                <div
                  v-for="criterion in criteria"
                  :key="criterion.id"
                  class="rounded-2xl border border-default bg-default px-4 py-4"
                >
                  <div class="grid gap-4">
                    <div class="grid gap-4 md:grid-cols-[1fr_120px_120px]">
                      <input
                        v-model="getCriterionEdit(criterion).name"
                        type="text"
                        class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                        placeholder="Criterion name"
                      >
                      <input
                        v-model.number="getCriterionEdit(criterion).weight"
                        type="number"
                        min="0"
                        class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                        placeholder="Weight"
                      >
                      <input
                        v-model.number="getCriterionEdit(criterion).displayOrder"
                        type="number"
                        min="1"
                        class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                        placeholder="Order"
                      >
                    </div>
                    <textarea
                      v-model="getCriterionEdit(criterion).description"
                      rows="3"
                      class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                      placeholder="Criterion description"
                    />
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                        Existing criterion
                      </p>
                      <AppButton
                        size="sm"
                        variant="soft"
                        @click="updateCriterion(criterion.id)"
                      >
                        Save updates
                      </AppButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid gap-4">
              <div class="grid gap-4 md:grid-cols-2">
                <input
                  v-model="prizeDraft.name"
                  type="text"
                  class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                  placeholder="Prize name"
                >
                <input
                  v-model="prizeDraft.rewardValue"
                  type="text"
                  class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                  placeholder="Reward value"
                >
              </div>
              <textarea
                v-model="prizeDraft.description"
                rows="3"
                class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                placeholder="Prize description"
              />
              <div class="grid gap-4 md:grid-cols-4">
                <select
                  v-model="prizeDraft.rewardType"
                  class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                >
                  <option value="api_credits">
                    API credits
                  </option>
                  <option value="subscription">
                    Subscription
                  </option>
                  <option value="physical">
                    Physical
                  </option>
                  <option value="other">
                    Other
                  </option>
                </select>
                <select
                  v-model="prizeDraft.awardScope"
                  class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                >
                  <option value="team">
                    Team
                  </option>
                  <option value="member">
                    Member
                  </option>
                </select>
                <input
                  v-model.number="prizeDraft.rankStart"
                  type="number"
                  min="1"
                  class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                  placeholder="Rank start"
                >
                <input
                  v-model.number="prizeDraft.rankEnd"
                  type="number"
                  min="1"
                  class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                  placeholder="Rank end"
                >
              </div>
              <AppButton
                color="primary"
                label="Add Prize"
                @click="createPrize"
              />
              <div class="grid gap-3">
                <div
                  v-for="prize in prizes"
                  :key="prize.id"
                  class="rounded-2xl border border-default bg-default px-4 py-4"
                >
                  <div class="grid gap-4">
                    <div class="grid gap-4 md:grid-cols-2">
                      <input
                        v-model="getPrizeEdit(prize).name"
                        type="text"
                        class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                        placeholder="Prize name"
                      >
                      <input
                        v-model="getPrizeEdit(prize).rewardValue"
                        type="text"
                        class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                        placeholder="Reward value"
                      >
                    </div>
                    <textarea
                      v-model="getPrizeEdit(prize).description"
                      rows="3"
                      class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                      placeholder="Prize description"
                    />
                    <div class="grid gap-4 md:grid-cols-5">
                      <select
                        v-model="getPrizeEdit(prize).rewardType"
                        class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                      >
                        <option value="api_credits">
                          API credits
                        </option>
                        <option value="subscription">
                          Subscription
                        </option>
                        <option value="physical">
                          Physical
                        </option>
                        <option value="other">
                          Other
                        </option>
                      </select>
                      <select
                        v-model="getPrizeEdit(prize).awardScope"
                        class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                      >
                        <option value="team">
                          Team
                        </option>
                        <option value="member">
                          Member
                        </option>
                      </select>
                      <input
                        v-model="getPrizeEdit(prize).rewardCurrency"
                        type="text"
                        class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                        placeholder="Currency"
                      >
                      <input
                        v-model.number="getPrizeEdit(prize).rankStart"
                        type="number"
                        min="1"
                        class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                        placeholder="Rank start"
                      >
                      <input
                        v-model.number="getPrizeEdit(prize).rankEnd"
                        type="number"
                        min="1"
                        class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                        placeholder="Rank end"
                      >
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div class="text-sm text-muted">
                        {{ prize.rewardType }} • ranks {{ prize.rankStart }}-{{ prize.rankEnd }}
                      </div>
                      <AppButton
                        size="sm"
                        variant="soft"
                        @click="updatePrize(prize.id)"
                      >
                        Save updates
                      </AppButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AppCard>
      </section>

      <section class="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <AppCard class="border border-default/70 bg-elevated/90">
          <template #header>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-highlighted">
                Explicit Role Assignments
              </h2>
              <p class="text-sm text-muted">
                Manual `userId` entry remains temporary until the backend exposes canonical user lookup for admin assignment workflows. Existing assignments surface the exact `userId` needed for follow-up edits or removal.
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <AppAlert
              v-if="!canMutateRoles"
              color="warning"
              variant="soft"
              title="Platform admin required for explicit role changes"
              description="Hackathon admins can review the access roster here, but create, update, and delete role assignments remain restricted to platform admins."
            />

            <template v-else>
              <input
                v-model="roleDraft.userId"
                type="text"
                class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                placeholder="Platform user ID"
              >
              <div class="grid gap-4 md:grid-cols-2">
                <select
                  v-model="roleDraft.role"
                  class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                >
                  <option value="judge">
                    Judge
                  </option>
                  <option value="hackathon_admin">
                    Hackathon admin
                  </option>
                </select>
                <label class="flex items-center gap-3 rounded-2xl border border-default bg-default px-4 py-3 text-sm text-toned">
                  <input
                    v-model="roleDraft.isInJudgePool"
                    :disabled="roleDraft.role === 'judge'"
                    type="checkbox"
                    class="size-4 rounded border-default"
                  >
                  Include in automatic judge pool
                </label>
              </div>
              <AppButton
                color="primary"
                label="Save Role Assignment"
                @click="createRoleAssignment"
              />
            </template>

            <div class="grid gap-3">
              <div
                v-for="assignment in roleAssignments"
                :key="assignment.id"
                class="rounded-2xl border border-default bg-default px-4 py-4"
              >
                <div class="grid gap-4">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div class="space-y-1">
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
                      variant="ghost"
                      @click="reuseRoleAssignmentUserId(assignment)"
                    >
                      Reuse ID
                    </AppButton>
                  </div>

                  <div
                    v-if="canMutateRoles"
                    class="grid gap-4"
                  >
                    <div class="grid gap-4 md:grid-cols-2">
                      <select
                        v-model="getRoleAssignmentEdit(assignment).role"
                        class="rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                        @change="getRoleAssignmentEdit(assignment).role === 'judge' ? getRoleAssignmentEdit(assignment).isInJudgePool = true : undefined"
                      >
                        <option value="judge">
                          Judge
                        </option>
                        <option value="hackathon_admin">
                          Hackathon admin
                        </option>
                      </select>
                      <label class="flex items-center gap-3 rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned">
                        <input
                          v-model="getRoleAssignmentEdit(assignment).isInJudgePool"
                          :disabled="getRoleAssignmentEdit(assignment).role === 'judge'"
                          type="checkbox"
                          class="size-4 rounded border-default"
                        >
                        Include in automatic judge pool
                      </label>
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <p class="text-sm text-muted">
                        {{ assignment.role }} • {{ assignment.isInJudgePool ? 'In judge pool' : 'Not in judge pool' }}
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <AppButton
                          size="sm"
                          variant="soft"
                          @click="updateRoleAssignment(assignment)"
                        >
                          Save updates
                        </AppButton>
                        <AppButton
                          size="sm"
                          color="error"
                          variant="soft"
                          @click="deleteRoleAssignment(assignment)"
                        >
                          Remove
                        </AppButton>
                      </div>
                    </div>
                  </div>

                  <div
                    v-else
                    class="text-sm text-muted"
                  >
                    <p>{{ assignment.role }}</p>
                    <p>{{ assignment.isInJudgePool ? 'In judge pool' : 'Not in judge pool' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AppCard>

        <AppCard class="border border-default/70 bg-elevated/90">
          <template #header>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-highlighted">
                Readiness Signals
              </h2>
              <p class="text-sm text-muted">
                These metrics give admins enough visibility to know why the next lifecycle action is enabled or blocked without stepping into later operational tasks.
              </p>
            </div>
          </template>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-2xl border border-default bg-default px-4 py-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Submitted submissions
              </p>
              <p class="mt-2 text-3xl font-semibold text-highlighted">
                {{ lifecycleMetrics.submittedSubmissionCount }}
              </p>
            </div>
            <div class="rounded-2xl border border-default bg-default px-4 py-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Automatic judge pool
              </p>
              <p class="mt-2 text-3xl font-semibold text-highlighted">
                {{ lifecycleMetrics.judgePoolCount }}
              </p>
            </div>
            <div class="rounded-2xl border border-default bg-default px-4 py-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Locked submissions
              </p>
              <p class="mt-2 text-3xl font-semibold text-highlighted">
                {{ lifecycleMetrics.lockedSubmissionCount }}
              </p>
            </div>
            <div class="rounded-2xl border border-default bg-default px-4 py-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Active assignments
              </p>
              <p class="mt-2 text-3xl font-semibold text-highlighted">
                {{ lifecycleMetrics.activeAssignmentCount }}
              </p>
            </div>
            <div class="rounded-2xl border border-default bg-default px-4 py-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Completed reviews
              </p>
              <p class="mt-2 text-3xl font-semibold text-highlighted">
                {{ lifecycleMetrics.completedReviewCount }}
              </p>
            </div>
            <div class="rounded-2xl border border-default bg-default px-4 py-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                No-submission teams
              </p>
              <p class="mt-2 text-3xl font-semibold text-highlighted">
                {{ noSubmissionTeams.length }}
              </p>
            </div>
          </div>
        </AppCard>
      </section>
    </template>
  </AppContainer>
</template>
