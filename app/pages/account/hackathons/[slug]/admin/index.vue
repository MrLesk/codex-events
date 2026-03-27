<script setup lang="ts">
import type {
  ApiDataResponse,
  EvaluationCriterion,
  HackathonFormState,
  HackathonRecord,
  HackathonRoleAssignment,
  PrizeDefinition,
  TermsDocument
} from '~/utils/admin-workspace'

import {
  canMutateRoleAssignments,
  formatHackathonState,
  fromDateTimeLocalValue,
  getHackathonStateColor,
  normalizeApiError,
  toHackathonAgendaPayload
} from '~/utils/admin-workspace'

definePageMeta({
  layout: 'hackathon-detail',
  middleware: ['require-hackathon-admin']
})

type CriterionEditState = Pick<EvaluationCriterion, 'name' | 'description' | 'weight' | 'displayOrder'>
type PrizeEditState = Pick<PrizeDefinition, 'name' | 'description' | 'rewardType' | 'rewardValue' | 'awardScope' | 'rankStart' | 'rankEnd' | 'displayOrder'> & {
  rewardCurrency: string
}
type AssignableUser = {
  id: string
  displayName: string
  email: string
}

const route = useRoute()
const toast = useToast()
const slug = computed(() => String(route.params.slug ?? '').trim())

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
  key: () => `admin-hackathon-workspace:${slug.value}`
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

const isSavingConfig = ref(false)
const isSavingCriterionOrder = ref(false)
const isSavingPrizeOrder = ref(false)
const mutationError = ref('')
const imageMutationState = reactive({
  background: {
    pending: false,
    success: '',
    error: ''
  },
  banner: {
    pending: false,
    success: '',
    error: ''
  }
})
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
const termsDraft = reactive({
  documentType: 'application_terms',
  title: '',
  content: ''
})
const criterionEdits = reactive<Record<string, CriterionEditState>>({})
const prizeEdits = reactive<Record<string, PrizeEditState>>({})
const draggedCriterionId = ref<string | null>(null)
const criterionDropTargetId = ref<string | null>(null)
const draggedPrizeId = ref<string | null>(null)
const prizeDropTargetId = ref<string | null>(null)
const adminAssignmentSearch = ref('')
const judgeAssignmentSearch = ref('')

const currentHackathon = computed(() => workspace.currentHackathon.value)
const actor = computed(() => workspace.actor.value)
const canManage = computed(() => workspace.canManageCurrentHackathon.value)
const headerStateLabel = computed(() =>
  currentHackathon.value ? formatHackathonState(currentHackathon.value.state).toUpperCase() : ''
)
const headerStateClass = computed(() => {
  if (currentHackathon.value?.state === 'submission_open') {
    return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
  }

  if (currentHackathon.value?.state === 'registration_open') {
    return 'border border-sky-600/35 bg-sky-500/16 text-sky-800 dark:border-sky-400/35 dark:bg-sky-500/14 dark:text-sky-300'
  }

  if (currentHackathon.value?.state === 'winners_announced') {
    return 'bg-green-500/10 text-green-400 border border-green-500/20'
  }

  return 'bg-white/[0.05] text-[#A3A3A3] border border-white/[0.08]'
})
const workspaceSummary = computed(() => {
  if (!currentHackathon.value) {
    return ''
  }

  return [
    formatHackathonWindow(currentHackathon.value.registrationOpensAt, currentHackathon.value.submissionClosesAt),
    currentHackathon.value.city,
    formatMaxTeamMembers(currentHackathon.value.maxTeamMembers)
  ].join(' • ')
})
const canMutateRoles = computed(() => canMutateRoleAssignments(actor.value))
const criteria = computed(() => workspace.criteria.data.value?.data ?? [])
const prizes = computed(() => workspace.prizes.data.value?.data ?? [])
const orderedCriteria = computed(() =>
  [...criteria.value].sort((left, right) => {
    const leftOrder = getCriterionEdit(left).displayOrder
    const rightOrder = getCriterionEdit(right).displayOrder
    return leftOrder - rightOrder || left.createdAt.localeCompare(right.createdAt)
  })
)
const orderedPrizes = computed(() =>
  [...prizes.value].sort((left, right) => {
    const leftOrder = getPrizeEdit(left).displayOrder
    const rightOrder = getPrizeEdit(right).displayOrder

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    return left.rankStart - right.rankStart || left.rankEnd - right.rankEnd || left.createdAt.localeCompare(right.createdAt)
  })
)
const hasCriterionOrderChanges = computed(() =>
  criteria.value.some(criterion => getCriterionEdit(criterion).displayOrder !== criterion.displayOrder)
)
const hasPrizeOrderChanges = computed(() =>
  prizes.value.some(prize => getPrizeEdit(prize).displayOrder !== prize.displayOrder)
)
const applicationTerms = computed(() => workspace.applicationTermsVersions.data.value?.data ?? [])
const winnerTerms = computed(() => workspace.winnerTermsVersions.data.value?.data ?? [])
const roleAssignments = computed(() => workspace.roleAssignments.data.value?.data ?? [])
const applications = computed(() => workspace.applications.data.value?.data ?? [])
const adminRoleAssignments = computed(() =>
  roleAssignments.value.filter(assignment => assignment.role === 'hackathon_admin')
)
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

const adminAssignableUsers = computed(() => {
  const currentAdminIds = new Set(adminRoleAssignments.value.map(assignment => assignment.userId))
  const query = adminAssignmentSearch.value.trim().toLowerCase()

  return assignableUsers.value.filter((user) => {
    if (currentAdminIds.has(user.id)) {
      return false
    }

    if (!query) {
      return true
    }

    const haystack = `${user.displayName} ${user.email} ${user.id}`.toLowerCase()
    return haystack.includes(query)
  })
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
    rankEnd: prize.rankEnd,
    displayOrder: prize.displayOrder
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

function moveItemWithinList<T extends { id: string }>(items: T[], sourceId: string, targetId: string) {
  if (!sourceId || sourceId === targetId) {
    return items
  }

  const sourceIndex = items.findIndex(item => item.id === sourceId)
  const targetIndex = items.findIndex(item => item.id === targetId)

  if (sourceIndex < 0 || targetIndex < 0) {
    return items
  }

  const reordered = [...items]
  const [movedItem] = reordered.splice(sourceIndex, 1)

  if (!movedItem) {
    return items
  }

  reordered.splice(targetIndex, 0, movedItem)
  return reordered
}

function moveItemByDirection<T extends { id: string }>(items: T[], itemId: string, direction: -1 | 1) {
  const currentIndex = items.findIndex(item => item.id === itemId)

  if (currentIndex < 0) {
    return items
  }

  const targetIndex = currentIndex + direction

  if (targetIndex < 0 || targetIndex >= items.length) {
    return items
  }

  const reordered = [...items]
  const [movedItem] = reordered.splice(currentIndex, 1)

  if (!movedItem) {
    return items
  }

  reordered.splice(targetIndex, 0, movedItem)
  return reordered
}

function applyCriterionOrderFromList(items: EvaluationCriterion[]) {
  items.forEach((criterion, index) => {
    getCriterionEdit(criterion).displayOrder = index + 1
  })
}

function applyPrizeOrderFromList(items: PrizeDefinition[]) {
  items.forEach((prize, index) => {
    getPrizeEdit(prize).displayOrder = index + 1
  })
}

function reorderCriteria(sourceId: string, targetId: string) {
  applyCriterionOrderFromList(moveItemWithinList(orderedCriteria.value, sourceId, targetId))
}

function moveCriterion(criterionId: string, direction: -1 | 1) {
  applyCriterionOrderFromList(moveItemByDirection(orderedCriteria.value, criterionId, direction))
}

function onCriterionDragStart(criterionId: string, event: DragEvent) {
  draggedCriterionId.value = criterionId
  criterionDropTargetId.value = null

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', criterionId)
  }
}

function onCriterionDragOver(criterionId: string) {
  if (!draggedCriterionId.value || draggedCriterionId.value === criterionId) {
    criterionDropTargetId.value = null
    return
  }

  criterionDropTargetId.value = criterionId
}

function onCriterionDragLeave(criterionId: string) {
  if (criterionDropTargetId.value === criterionId) {
    criterionDropTargetId.value = null
  }
}

function onCriterionDrop(targetId: string, event: DragEvent) {
  event.preventDefault()

  const sourceFromEvent = event.dataTransfer?.getData('text/plain')?.trim() ?? ''
  const sourceId = draggedCriterionId.value ?? sourceFromEvent

  draggedCriterionId.value = null
  criterionDropTargetId.value = null

  if (!sourceId) {
    return
  }

  reorderCriteria(sourceId, targetId)
}

function onCriterionDragEnd() {
  draggedCriterionId.value = null
  criterionDropTargetId.value = null
}

function reorderPrizes(sourceId: string, targetId: string) {
  applyPrizeOrderFromList(moveItemWithinList(orderedPrizes.value, sourceId, targetId))
}

function movePrize(prizeId: string, direction: -1 | 1) {
  applyPrizeOrderFromList(moveItemByDirection(orderedPrizes.value, prizeId, direction))
}

function onPrizeDragStart(prizeId: string, event: DragEvent) {
  draggedPrizeId.value = prizeId
  prizeDropTargetId.value = null

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', prizeId)
  }
}

function onPrizeDragOver(prizeId: string) {
  if (!draggedPrizeId.value || draggedPrizeId.value === prizeId) {
    prizeDropTargetId.value = null
    return
  }

  prizeDropTargetId.value = prizeId
}

function onPrizeDragLeave(prizeId: string) {
  if (prizeDropTargetId.value === prizeId) {
    prizeDropTargetId.value = null
  }
}

function onPrizeDrop(targetId: string, event: DragEvent) {
  event.preventDefault()

  const sourceFromEvent = event.dataTransfer?.getData('text/plain')?.trim() ?? ''
  const sourceId = draggedPrizeId.value ?? sourceFromEvent

  draggedPrizeId.value = null
  prizeDropTargetId.value = null

  if (!sourceId) {
    return
  }

  reorderPrizes(sourceId, targetId)
}

function onPrizeDragEnd() {
  draggedPrizeId.value = null
  prizeDropTargetId.value = null
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

async function saveConfiguration(configForm: HackathonFormState) {
  if (!currentHackathon.value) {
    return
  }

  mutationError.value = ''
  isSavingConfig.value = true

  try {
    const updateUrl = `/api/hackathons/${currentHackathon.value.id}` as string

    await $fetch(updateUrl, {
      method: 'PATCH',
      body: {
        name: configForm.name,
        slug: configForm.slug,
        description: configForm.description,
        agendaItems: toHackathonAgendaPayload(configForm.agendaItems),
        city: configForm.city,
        address: configForm.address,
        registrationOpensAt: fromDateTimeLocalValue(configForm.registrationOpensAt),
        registrationClosesAt: fromDateTimeLocalValue(configForm.registrationClosesAt),
        submissionOpensAt: fromDateTimeLocalValue(configForm.submissionOpensAt),
        submissionClosesAt: fromDateTimeLocalValue(configForm.submissionClosesAt),
        maxTeamMembers: configForm.maxTeamMembers,
        inPersonEvent: configForm.inPersonEvent,
        requireXProfile: configForm.requireXProfile,
        requireLinkedinProfile: configForm.requireLinkedinProfile,
        requireGithubProfile: configForm.requireGithubProfile,
        requireChatgptEmail: configForm.requireChatgptEmail,
        requireOpenaiOrgId: configForm.requireOpenaiOrgId,
        requireLumaProfile: configForm.requireLumaProfile,
        requireWhyThisHackathon: configForm.requireWhyThisHackathon,
        requireProofOfExecution: configForm.requireProofOfExecution
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

type HackathonImageSlot = 'background' | 'banner'

async function uploadHackathonImage(slot: HackathonImageSlot, file: File) {
  const hackathon = currentHackathon.value

  if (!hackathon) {
    return
  }

  const state = imageMutationState[slot]
  state.pending = true
  state.success = ''
  state.error = ''

  try {
    const formData = new FormData()
    formData.append('file', file)

    await $fetch<ApiDataResponse<HackathonRecord>>(`/api/hackathons/${hackathon.id}/images/${slot}`, {
      method: 'POST',
      body: formData
    })

    await workspace.refreshWorkspace()
    state.success = slot === 'background'
      ? 'Background image uploaded.'
      : 'Banner image uploaded.'
  } catch (error) {
    state.error = normalizeApiError(error).message
  } finally {
    state.pending = false
  }
}

async function removeHackathonImage(slot: HackathonImageSlot) {
  const hackathon = currentHackathon.value

  if (!hackathon) {
    return
  }

  const state = imageMutationState[slot]
  state.pending = true
  state.success = ''
  state.error = ''

  try {
    await $fetch<ApiDataResponse<HackathonRecord>>(`/api/hackathons/${hackathon.id}/images/${slot}`, {
      method: 'DELETE'
    })

    await workspace.refreshWorkspace()
    state.success = slot === 'background'
      ? 'Background image removed.'
      : 'Banner image removed.'
  } catch (error) {
    state.error = normalizeApiError(error).message
  } finally {
    state.pending = false
  }
}

async function uploadBackgroundImage(file: File) {
  await uploadHackathonImage('background', file)
}

async function removeBackgroundImage() {
  await removeHackathonImage('background')
}

async function uploadBannerImage(file: File) {
  await uploadHackathonImage('banner', file)
}

async function removeBannerImage() {
  await removeHackathonImage('banner')
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
        rankEnd: edit.rankEnd,
        displayOrder: edit.displayOrder
      }
    })
  }, 'Prize updated', 'The prize definition has been updated.')
}

async function saveCriterionOrder() {
  const hackathon = currentHackathon.value

  if (!hackathon || !hasCriterionOrderChanges.value) {
    return
  }

  const changedCriteria = orderedCriteria.value.filter(
    criterion => getCriterionEdit(criterion).displayOrder !== criterion.displayOrder
  )

  if (changedCriteria.length === 0) {
    return
  }

  const maxDisplayOrder = Math.max(
    0,
    ...criteria.value.map(criterion => criterion.displayOrder),
    ...orderedCriteria.value.map(criterion => getCriterionEdit(criterion).displayOrder)
  )

  isSavingCriterionOrder.value = true
  mutationError.value = ''

  try {
    for (const [index, criterion] of changedCriteria.entries()) {
      await $fetch(`/api/hackathons/${hackathon.id}/evaluation-criteria/${criterion.id}`, {
        method: 'PATCH',
        body: {
          displayOrder: maxDisplayOrder + index + 1
        }
      })
    }

    for (const criterion of changedCriteria) {
      await $fetch(`/api/hackathons/${hackathon.id}/evaluation-criteria/${criterion.id}`, {
        method: 'PATCH',
        body: {
          displayOrder: getCriterionEdit(criterion).displayOrder
        }
      })
    }

    toast.add({
      title: 'Criterion order updated',
      description: 'Evaluation criteria now follow the updated order.',
      color: 'success'
    })
    await workspace.refreshWorkspace()
  } catch (error) {
    mutationError.value = normalizeApiError(error).message
  } finally {
    isSavingCriterionOrder.value = false
  }
}

async function savePrizeOrder() {
  const hackathon = currentHackathon.value

  if (!hackathon || !hasPrizeOrderChanges.value) {
    return
  }

  const changedPrizes = orderedPrizes.value.filter(
    prize => getPrizeEdit(prize).displayOrder !== prize.displayOrder
  )

  if (changedPrizes.length === 0) {
    return
  }

  isSavingPrizeOrder.value = true
  mutationError.value = ''

  try {
    for (const prize of changedPrizes) {
      await $fetch(`/api/hackathons/${hackathon.id}/prizes/${prize.id}`, {
        method: 'PATCH',
        body: {
          displayOrder: getPrizeEdit(prize).displayOrder
        }
      })
    }

    toast.add({
      title: 'Prize order updated',
      description: 'Prizes now follow the updated order.',
      color: 'success'
    })
    await workspace.refreshWorkspace()
  } catch (error) {
    mutationError.value = normalizeApiError(error).message
  } finally {
    isSavingPrizeOrder.value = false
  }
}

async function assignHackathonAdmin(userId: string) {
  const hackathon = currentHackathon.value
  const trimmedUserId = userId.trim()

  if (!hackathon || !trimmedUserId) {
    if (!trimmedUserId) {
      mutationError.value = 'Pick a registered user before assigning hackathon-admin access.'
    }

    return
  }

  await runMutation(async () => {
    await $fetch(`/api/hackathons/${hackathon.id}/roles/${trimmedUserId}`, {
      method: 'PUT',
      body: {
        role: 'hackathon_admin',
        isInJudgePool: false
      }
    })
  }, 'Hackathon admin assigned', 'The admin roster was updated for this hackathon.')
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
  }, 'Hackathon admin removed', 'The admin roster was updated for this hackathon.')
}

async function assignJudge(userId: string) {
  const hackathon = currentHackathon.value
  const trimmedUserId = userId.trim()

  if (!hackathon || !trimmedUserId) {
    if (!trimmedUserId) {
      mutationError.value = 'Pick a registered user before assigning judge access.'
    }

    return
  }

  await runMutation(async () => {
    await $fetch(`/api/hackathons/${hackathon.id}/roles/${trimmedUserId}`, {
      method: 'PUT',
      body: {
        role: 'judge',
        isInJudgePool: true
      }
    })
  }, 'Judge assigned', 'The judge roster was updated for this hackathon.')
}

async function removeJudge(assignment: HackathonRoleAssignment) {
  const hackathon = currentHackathon.value

  if (!hackathon) {
    return
  }

  await runMutation(async () => {
    await $fetch(`/api/hackathons/${hackathon.id}/roles/${assignment.userId}`, {
      method: 'DELETE'
    })
  }, 'Judge removed', 'The judge roster was updated for this hackathon.')
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
</script>

<template>
  <div class="pb-14">
    <section class="border-b border-black/8 bg-white/42 backdrop-blur-lg dark:border-white/[0.08] dark:bg-black/48">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <AdminWorkspaceHeader
          eyebrow="Admin Settings"
          :title="currentHackathon ? `${currentHackathon.name} settings` : 'Hackathon settings'"
          description="Edit hackathon configuration, manage terms, and assign or remove hackathon-admin and judge access."
          back-to="/account/admin"
          back-label="Back to admin operations"
          :state-label="headerStateLabel"
          :state-class="headerStateClass"
          :summary="workspaceSummary"
        />

        <AdminHackathonWorkspaceTabs
          v-if="currentHackathon"
          :hackathon-slug="currentHackathon.slug"
          current-surface="settings"
        />
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] space-y-10 pt-6">
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
        <section class="space-y-6">
          <AdminHackathonCreateEditForm
            :initial-hackathon="currentHackathon"
            :can-upload-managed-images="true"
            :is-submitting="isSavingConfig"
            :background-image-upload-pending="imageMutationState.background.pending"
            :background-image-upload-success="imageMutationState.background.success"
            :background-image-upload-error="imageMutationState.background.error"
            :banner-image-upload-pending="imageMutationState.banner.pending"
            :banner-image-upload-success="imageMutationState.banner.success"
            :banner-image-upload-error="imageMutationState.banner.error"
            submit-label="Save Configuration"
            helper-text="This workspace stays focused on setup controls. Day-to-day application, team, submission, and lifecycle operations now live in the dedicated Operations workspace."
            @submit="saveConfiguration"
            @upload-background-image="uploadBackgroundImage"
            @remove-background-image="removeBackgroundImage"
            @upload-banner-image="uploadBannerImage"
            @remove-banner-image="removeBannerImage"
          />

          <AppCard class="rounded-xl border border-black/8 bg-white/70 shadow-none dark:border-white/[0.08] dark:bg-black/36">
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

            <div class="grid gap-5 text-sm">
              <div class="grid gap-1">
                <span class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Actor</span>
                <span class="text-base font-semibold text-highlighted">
                  {{ actor?.platformUser?.displayName ?? actor?.sessionUser?.email }}
                </span>
                <span class="text-muted">
                  {{ actor?.isPlatformAdmin ? 'Platform admin authority' : 'Hackathon-admin authority' }}
                </span>
              </div>

              <div class="grid gap-1 border-t border-black/8 pt-4 dark:border-white/[0.08]">
                <span class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Current terms</span>
                <span class="text-highlighted">
                  Application: {{ currentHackathon.currentTerms?.applicationTerms?.title ?? 'None selected' }}
                </span>
                <span class="text-highlighted">
                  Winner: {{ currentHackathon.currentTerms?.winnerTerms?.title ?? 'None selected' }}
                </span>
              </div>
            </div>
          </AppCard>
        </section>

        <div class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Program Rules
          </p>
          <h2 class="text-xl font-semibold text-highlighted">
            Terms and Scoring
          </h2>
        </div>

        <section class="space-y-6">
          <AppCard class="rounded-xl border border-black/8 bg-white/70 shadow-none dark:border-white/[0.08] dark:bg-black/36">
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
                    class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
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
                    class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                    placeholder="Spring 2026 Application Terms v2"
                  >
                </label>
              </div>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-toned">Content</span>
                <textarea
                  v-model="termsDraft.content"
                  rows="5"
                  class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
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
                    class="rounded-lg border border-black/8 bg-white/85 px-4 py-4 dark:border-white/[0.08] dark:bg-[#111111]"
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
                    class="rounded-lg border border-black/8 bg-white/85 px-4 py-4 dark:border-white/[0.08] dark:bg-[#111111]"
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

          <AppCard class="rounded-xl border border-black/8 bg-white/70 shadow-none dark:border-white/[0.08] dark:bg-black/36">
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
                  color="primary"
                  label="Add Criterion"
                  @click="createCriterion"
                />
                <div class="space-y-3">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="text-xs text-muted">
                      Drag to reorder criteria.
                    </p>
                    <AppButton
                      size="sm"
                      variant="soft"
                      :disabled="!hasCriterionOrderChanges || isSavingCriterionOrder || isSavingPrizeOrder"
                      :loading="isSavingCriterionOrder"
                      @click="saveCriterionOrder"
                    >
                      Save criterion order
                    </AppButton>
                  </div>

                  <div class="grid gap-3">
                    <div
                      v-for="(criterion, index) in orderedCriteria"
                      :key="criterion.id"
                      class="rounded-lg border border-black/8 bg-white/85 px-4 py-4 transition-colors dark:border-white/[0.08] dark:bg-[#111111]"
                      :class="criterionDropTargetId === criterion.id ? 'border-black/25 dark:border-white/[0.25]' : ''"
                      @dragover.prevent="onCriterionDragOver(criterion.id)"
                      @dragleave="onCriterionDragLeave(criterion.id)"
                      @drop="onCriterionDrop(criterion.id, $event)"
                    >
                      <div class="grid gap-4">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                          <div class="flex items-center gap-2">
                            <button
                              type="button"
                              class="rounded-md border border-black/8 bg-white px-2 py-1 text-xs font-medium text-toned transition hover:border-black/25 hover:text-highlighted dark:border-white/[0.08] dark:bg-[#111111] dark:hover:border-white/[0.25]"
                              draggable="true"
                              @dragstart="onCriterionDragStart(criterion.id, $event)"
                              @dragend="onCriterionDragEnd"
                            >
                              Drag
                            </button>
                            <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                              Criterion {{ index + 1 }}
                            </p>
                          </div>

                          <div class="flex items-center gap-2">
                            <AppButton
                              size="sm"
                              variant="ghost"
                              color="neutral"
                              :disabled="index === 0"
                              @click="moveCriterion(criterion.id, -1)"
                            >
                              Move up
                            </AppButton>
                            <AppButton
                              size="sm"
                              variant="ghost"
                              color="neutral"
                              :disabled="index === orderedCriteria.length - 1"
                              @click="moveCriterion(criterion.id, 1)"
                            >
                              Move down
                            </AppButton>
                            <AppButton
                              size="sm"
                              variant="soft"
                              @click="updateCriterion(criterion.id)"
                            >
                              Save updates
                            </AppButton>
                          </div>
                        </div>

                        <div class="grid gap-4 md:grid-cols-[1fr_140px]">
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
                        </div>

                        <textarea
                          v-model="getCriterionEdit(criterion).description"
                          rows="3"
                          class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                          placeholder="Criterion description"
                        />
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
                    class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                    placeholder="Prize name"
                  >
                  <input
                    v-model="prizeDraft.rewardValue"
                    type="text"
                    class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                    placeholder="Reward value"
                  >
                </div>
                <textarea
                  v-model="prizeDraft.description"
                  rows="3"
                  class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                  placeholder="Prize description"
                />
                <div class="grid gap-4 md:grid-cols-4">
                  <select
                    v-model="prizeDraft.rewardType"
                    class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
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
                    class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
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
                    class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                    placeholder="Rank start"
                  >
                  <input
                    v-model.number="prizeDraft.rankEnd"
                    type="number"
                    min="1"
                    class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                    placeholder="Rank end"
                  >
                </div>
                <AppButton
                  color="primary"
                  label="Add Prize"
                  @click="createPrize"
                />
                <div class="space-y-3">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="text-xs text-muted">
                      Drag to reorder prizes.
                    </p>
                    <AppButton
                      size="sm"
                      variant="soft"
                      :disabled="!hasPrizeOrderChanges || isSavingPrizeOrder || isSavingCriterionOrder"
                      :loading="isSavingPrizeOrder"
                      @click="savePrizeOrder"
                    >
                      Save prize order
                    </AppButton>
                  </div>

                  <div class="grid gap-3">
                    <div
                      v-for="(prize, index) in orderedPrizes"
                      :key="prize.id"
                      class="rounded-lg border border-black/8 bg-white/85 px-4 py-4 transition-colors dark:border-white/[0.08] dark:bg-[#111111]"
                      :class="prizeDropTargetId === prize.id ? 'border-black/25 dark:border-white/[0.25]' : ''"
                      @dragover.prevent="onPrizeDragOver(prize.id)"
                      @dragleave="onPrizeDragLeave(prize.id)"
                      @drop="onPrizeDrop(prize.id, $event)"
                    >
                      <div class="grid gap-4">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                          <div class="flex items-center gap-2">
                            <button
                              type="button"
                              class="rounded-md border border-black/8 bg-white px-2 py-1 text-xs font-medium text-toned transition hover:border-black/25 hover:text-highlighted dark:border-white/[0.08] dark:bg-[#111111] dark:hover:border-white/[0.25]"
                              draggable="true"
                              @dragstart="onPrizeDragStart(prize.id, $event)"
                              @dragend="onPrizeDragEnd"
                            >
                              Drag
                            </button>
                            <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                              Prize {{ index + 1 }}
                            </p>
                          </div>

                          <div class="flex items-center gap-2">
                            <AppButton
                              size="sm"
                              variant="ghost"
                              color="neutral"
                              :disabled="index === 0"
                              @click="movePrize(prize.id, -1)"
                            >
                              Move up
                            </AppButton>
                            <AppButton
                              size="sm"
                              variant="ghost"
                              color="neutral"
                              :disabled="index === orderedPrizes.length - 1"
                              @click="movePrize(prize.id, 1)"
                            >
                              Move down
                            </AppButton>
                            <AppButton
                              size="sm"
                              variant="soft"
                              @click="updatePrize(prize.id)"
                            >
                              Save updates
                            </AppButton>
                          </div>
                        </div>

                        <div class="grid gap-4 md:grid-cols-2">
                          <input
                            v-model="getPrizeEdit(prize).name"
                            type="text"
                            class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                            placeholder="Prize name"
                          >
                          <input
                            v-model="getPrizeEdit(prize).rewardValue"
                            type="text"
                            class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                            placeholder="Reward value"
                          >
                        </div>

                        <textarea
                          v-model="getPrizeEdit(prize).description"
                          rows="3"
                          class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                          placeholder="Prize description"
                        />

                        <div class="grid gap-4 md:grid-cols-5">
                          <select
                            v-model="getPrizeEdit(prize).rewardType"
                            class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
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
                            class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
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
                            class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                            placeholder="Currency"
                          >
                          <input
                            v-model.number="getPrizeEdit(prize).rankStart"
                            type="number"
                            min="1"
                            class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                            placeholder="Rank start"
                          >
                          <input
                            v-model.number="getPrizeEdit(prize).rankEnd"
                            type="number"
                            min="1"
                            class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                            placeholder="Rank end"
                          >
                        </div>

                        <div class="text-sm text-muted">
                          {{ prize.rewardType }} • ranks {{ prize.rankStart }}-{{ prize.rankEnd }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AppCard>
        </section>

        <div class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Access Control
          </p>
          <h2 class="text-xl font-semibold text-highlighted">
            Admins and Judges
          </h2>
        </div>

        <section class="space-y-6">
          <AppCard class="rounded-xl border border-black/8 bg-white/70 shadow-none dark:border-white/[0.08] dark:bg-black/36">
            <template #header>
              <div class="space-y-1">
                <h2 class="text-lg font-semibold text-highlighted">
                  Role Assignments
                </h2>
                <p class="text-sm text-muted">
                  Search approved and already-associated users, then assign or remove hackathon-admin and judge access for this hackathon.
                </p>
              </div>
            </template>

            <div class="space-y-4">
              <AppAlert
                v-if="!canMutateRoles"
                color="warning"
                variant="soft"
                title="Hackathon admin access required"
                description="The current actor can view this roster but cannot modify it for this hackathon."
              />

              <section class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                    Hackathon admins
                  </h3>
                  <p class="text-xs text-muted">
                    {{ adminRoleAssignments.length }} assigned
                  </p>
                </div>

                <template v-if="canMutateRoles">
                  <input
                    v-model="adminAssignmentSearch"
                    type="text"
                    class="w-full rounded-lg border border-black/8 bg-white/90 px-4 py-3 text-sm text-highlighted outline-none focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                    placeholder="Search users by name, email, or user ID"
                  >
                  <div class="grid gap-3">
                    <div
                      v-for="user in adminAssignableUsers"
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
                        @click="assignHackathonAdmin(user.id)"
                      >
                        Assign admin
                      </AppButton>
                    </div>

                    <p
                      v-if="adminAssignableUsers.length === 0"
                      class="text-sm text-muted"
                    >
                      No assignable users match the current search.
                    </p>
                  </div>
                </template>

                <div class="grid gap-3">
                  <div
                    v-for="assignment in adminRoleAssignments"
                    :key="assignment.id"
                    class="rounded-lg border border-black/8 bg-white/85 px-4 py-4 dark:border-white/[0.08] dark:bg-[#111111]"
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
                      </div>

                      <div
                        v-if="canMutateRoles"
                        class="flex flex-wrap items-center justify-between gap-3"
                      >
                        <p class="text-sm text-muted">
                          hackathon_admin
                        </p>
                        <AppButton
                          size="sm"
                          color="error"
                          variant="soft"
                          @click="deleteRoleAssignment(assignment)"
                        >
                          Remove
                        </AppButton>
                      </div>

                      <div
                        v-else
                        class="text-sm text-muted"
                      >
                        <p>hackathon_admin</p>
                      </div>
                    </div>
                  </div>

                  <p
                    v-if="adminRoleAssignments.length === 0"
                    class="text-sm text-muted"
                  >
                    No hackathon admins have been explicitly assigned yet.
                  </p>
                </div>
              </section>

              <section class="space-y-3 border-t border-black/8 pt-4 dark:border-white/[0.08]">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                    Judges
                  </h3>
                  <p class="text-xs text-muted">
                    {{ judgeRoleAssignments.length }} assigned
                  </p>
                </div>

                <template v-if="canMutateRoles">
                  <input
                    v-model="judgeAssignmentSearch"
                    type="text"
                    class="w-full rounded-lg border border-black/8 bg-white/90 px-4 py-3 text-sm text-highlighted outline-none focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                    placeholder="Search users by name, email, or user ID"
                  >
                  <div class="grid gap-3">
                    <div
                      v-for="user in judgeAssignableUsers"
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
                    class="rounded-lg border border-black/8 bg-white/85 px-4 py-4 dark:border-white/[0.08] dark:bg-[#111111]"
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
                      </div>

                      <div
                        v-if="canMutateRoles"
                        class="flex flex-wrap items-center justify-between gap-3"
                      >
                        <p class="text-sm text-muted">
                          judge
                        </p>
                        <AppButton
                          size="sm"
                          color="error"
                          variant="soft"
                          @click="removeJudge(assignment)"
                        >
                          Remove
                        </AppButton>
                      </div>

                      <div
                        v-else
                        class="text-sm text-muted"
                      >
                        <p>judge</p>
                      </div>
                    </div>
                  </div>

                  <p
                    v-if="judgeRoleAssignments.length === 0"
                    class="text-sm text-muted"
                  >
                    No judges have been explicitly assigned yet.
                  </p>
                </div>
              </section>
            </div>
          </AppCard>
        </section>
      </template>
    </AppContainer>
  </div>
</template>
