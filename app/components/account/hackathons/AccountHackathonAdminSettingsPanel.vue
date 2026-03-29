<script setup lang="ts">
import Sortable from 'sortablejs'

import type {
  ApiDataResponse,
  EvaluationCriterion,
  HackathonFormState,
  HackathonRecord,
  PrizeDefinition,
  TermsDocument
} from '~/utils/admin-workspace'
import type { HackathonProgramSettingsMode } from '~/utils/hackathon-program-settings'
import { moveListItemByIndex } from '~/utils/reorder-list'

import {
  formatHackathonState,
  fromDateTimeLocalValue,
  getHackathonStateColor,
  normalizeApiError,
  toHackathonAgendaPayload
} from '~/utils/admin-workspace'
import { getHackathonProgramSettingsCopy } from '~/utils/hackathon-program-settings'

const props = withDefaults(defineProps<{
  slug: string
  showProgramSettings?: boolean
  programSettingsMode?: HackathonProgramSettingsMode
  showTermsManagement?: boolean
  showCriteriaConfiguration?: boolean
  showPrizeConfiguration?: boolean
}>(), {
  showProgramSettings: true,
  programSettingsMode: 'settings',
  showTermsManagement: true,
  showCriteriaConfiguration: true,
  showPrizeConfiguration: true
})

type CriterionEditState = Pick<EvaluationCriterion, 'name' | 'description' | 'weight' | 'displayOrder'>
type PrizeEditState = Pick<PrizeDefinition, 'name' | 'description' | 'rewardType' | 'rewardValue' | 'awardScope' | 'rankStart' | 'rankEnd' | 'displayOrder'> & {
  rewardCurrency: string
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
const activePrizeDragId = ref<string | null>(null)
const prizeDropTargetId = ref<string | null>(null)
const prizeListElement = ref<HTMLElement | null>(null)
let prizeSortable: Sortable | null = null

const currentHackathon = computed(() => workspace.currentHackathon.value)
const actor = computed(() => workspace.actor.value)
const canManage = computed(() => workspace.canManageCurrentHackathon.value)
const programSettingsCopy = computed(() => getHackathonProgramSettingsCopy(props.programSettingsMode))
const showProgramSnapshot = computed(() => props.programSettingsMode === 'settings')
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

    return left.rankEnd - right.rankEnd || right.rankStart - left.rankStart || left.createdAt.localeCompare(right.createdAt)
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

function movePrize(prizeId: string, direction: -1 | 1) {
  applyPrizeOrderFromList(moveItemByDirection(orderedPrizes.value, prizeId, direction))
}

function destroyPrizeSortable() {
  prizeSortable?.destroy()
  prizeSortable = null
  activePrizeDragId.value = null
  prizeDropTargetId.value = null
}

function initializePrizeSortable() {
  if (!import.meta.client || !props.showPrizeConfiguration || !prizeListElement.value) {
    destroyPrizeSortable()
    return
  }

  destroyPrizeSortable()

  prizeSortable = Sortable.create(prizeListElement.value, {
    animation: 180,
    handle: '[data-prize-sort-handle]',
    draggable: '[data-prize-row]',
    dataIdAttr: 'data-prize-id',
    ghostClass: 'opacity-45',
    chosenClass: 'cursor-grabbing',
    dragClass: 'cursor-grabbing',
    onChoose(event) {
      activePrizeDragId.value = event.item.dataset.prizeId ?? null
      prizeDropTargetId.value = null
    },
    onMove(event) {
      const relatedId = event.related?.dataset.prizeId ?? null
      prizeDropTargetId.value = relatedId !== activePrizeDragId.value ? relatedId : null
      return true
    },
    onEnd(event) {
      const oldIndex = event.oldDraggableIndex ?? event.oldIndex
      const newIndex = event.newDraggableIndex ?? event.newIndex

      if (oldIndex !== undefined && newIndex !== undefined) {
        applyPrizeOrderFromList(moveListItemByIndex(orderedPrizes.value, oldIndex, newIndex))
      }

      activePrizeDragId.value = null
      prizeDropTargetId.value = null
    }
  })
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

watch([orderedPrizes, () => props.showPrizeConfiguration], async () => {
  await nextTick()
  initializePrizeSortable()
}, {
  immediate: true,
  flush: 'post'
})

onBeforeUnmount(() => {
  destroyPrizeSortable()
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

  if (props.programSettingsMode === 'details') {
    await patchConfiguration(
      {
        agendaItems: toHackathonAgendaPayload(configForm.agendaItems),
        city: configForm.city,
        country: configForm.country,
        address: configForm.address
      },
      programSettingsCopy.value.successTitle,
      programSettingsCopy.value.successDescription
    )
    return
  }

  await patchConfiguration(
    {
      name: configForm.name,
      slug: configForm.slug,
      lumaEventUrl: configForm.lumaEventUrl.trim() || null,
      description: configForm.description,
      agendaItems: toHackathonAgendaPayload(configForm.agendaItems),
      city: configForm.city,
      country: configForm.country,
      address: configForm.address,
      registrationOpensAt: fromDateTimeLocalValue(configForm.registrationOpensAt),
      registrationClosesAt: fromDateTimeLocalValue(configForm.registrationClosesAt),
      submissionOpensAt: fromDateTimeLocalValue(configForm.submissionOpensAt),
      submissionClosesAt: fromDateTimeLocalValue(configForm.submissionClosesAt),
      maxTeamMembers: configForm.maxTeamMembers,
      participantsLimit: configForm.participantsLimit,
      inPersonEvent: configForm.inPersonEvent,
      requireXProfile: configForm.requireXProfile,
      requireLinkedinProfile: configForm.requireLinkedinProfile,
      requireGithubProfile: configForm.requireGithubProfile,
      requireChatgptEmail: configForm.requireChatgptEmail,
      requireOpenaiOrgId: configForm.requireOpenaiOrgId,
      requireLumaProfile: configForm.requireLumaProfile,
      requireWhyThisHackathon: configForm.requireWhyThisHackathon,
      requireProofOfExecution: configForm.requireProofOfExecution
    },
    programSettingsCopy.value.successTitle,
    programSettingsCopy.value.successDescription
  )
}

async function patchConfiguration(
  body: Record<string, unknown>,
  successTitle: string,
  successDescription: string
) {
  if (!currentHackathon.value) {
    return
  }

  mutationError.value = ''
  isSavingConfig.value = true

  try {
    const updateUrl = `/api/hackathons/${currentHackathon.value.id}` as string

    await $fetch(updateUrl, {
      method: 'PATCH',
      body
    })

    toast.add({
      title: successTitle,
      description: successDescription,
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
  <div class="space-y-10">
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
      <section
        v-if="props.showProgramSettings"
        class="space-y-6"
      >
        <AdminHackathonCreateEditForm
          :initial-hackathon="currentHackathon"
          :can-upload-managed-images="true"
          :is-submitting="isSavingConfig"
          :mode="props.programSettingsMode"
          :background-image-upload-pending="imageMutationState.background.pending"
          :background-image-upload-success="imageMutationState.background.success"
          :background-image-upload-error="imageMutationState.background.error"
          :banner-image-upload-pending="imageMutationState.banner.pending"
          :banner-image-upload-success="imageMutationState.banner.success"
          :banner-image-upload-error="imageMutationState.banner.error"
          :submit-label="programSettingsCopy.submitLabel"
          :helper-text="programSettingsCopy.helperText"
          @submit="saveConfiguration"
          @upload-background-image="uploadBackgroundImage"
          @remove-background-image="removeBackgroundImage"
          @upload-banner-image="uploadBannerImage"
          @remove-banner-image="removeBannerImage"
        />

        <AppCard
          v-if="showProgramSnapshot"
          class="rounded-xl hackathon-workspace-detail-panel"
        >
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

      <div
        v-if="props.showTermsManagement || props.showCriteriaConfiguration"
        class="space-y-1"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Program Rules
        </p>
        <h2 class="text-xl font-semibold text-highlighted">
          Terms and Scoring
        </h2>
      </div>

      <section class="space-y-6">
        <AppCard
          v-if="props.showTermsManagement"
          class="rounded-xl hackathon-workspace-detail-panel"
        >
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

        <AppCard
          v-if="props.showCriteriaConfiguration"
          class="rounded-xl hackathon-workspace-detail-panel"
        >
          <template #header>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-highlighted">
                Judging Criteria
              </h2>
              <p class="text-sm text-muted">
                Configure the canonical scoring dimensions that later judging and leaderboard workflows rely on.
              </p>
            </div>
          </template>

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
        </AppCard>

        <AppCard
          v-if="props.showPrizeConfiguration"
          class="rounded-xl hackathon-workspace-detail-panel"
        >
          <template #header>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-highlighted">
                Prize Configuration
              </h2>
              <p class="text-sm text-muted">
                Configure prize definitions and ordering for the outcomes and redemption flows.
              </p>
            </div>
          </template>

          <div class="grid gap-4">
            <div class="space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-xs text-muted">
                  Use the left handle to drag prizes into a new order.
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

              <div
                ref="prizeListElement"
                class="grid gap-3"
              >
                <div
                  v-for="(prize, index) in orderedPrizes"
                  :key="prize.id"
                  :data-prize-id="prize.id"
                  data-prize-row
                  class="rounded-xl border bg-white/88 p-3 transition-all dark:bg-[#111111]"
                  :class="[
                    prizeDropTargetId === prize.id
                      ? 'border-dashed border-black/30 ring-2 ring-black/6 dark:border-white/[0.32] dark:ring-white/[0.08]'
                      : 'border-black/8 dark:border-white/[0.08]',
                    activePrizeDragId === prize.id
                      ? 'shadow-[0_16px_40px_-34px_rgba(15,23,42,0.55)]'
                      : ''
                  ]"
                >
                  <div
                    v-if="prizeDropTargetId === prize.id"
                    class="mb-3 rounded-lg border border-dashed border-black/18 bg-black/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted dark:border-white/[0.14] dark:bg-white/[0.03]"
                  >
                    Drop prize here
                  </div>

                  <div class="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)]">
                    <div class="flex items-center">
                      <button
                        type="button"
                        data-prize-sort-handle
                        class="group inline-flex h-11 w-11 cursor-grab items-center justify-center rounded-xl border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted active:cursor-grabbing dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                        :aria-label="`Drag to reorder ${getPrizeEdit(prize).name || `prize ${index + 1}`}`"
                      >
                        <AppIcon
                          name="i-lucide-grip-vertical"
                          class="size-4.5 transition group-hover:scale-105"
                        />
                      </button>
                    </div>

                    <div class="grid gap-2.5">
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div class="flex items-center gap-2">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
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

                      <div class="grid gap-2.5 md:grid-cols-[minmax(0,1.8fr)_140px_110px]">
                        <label class="grid gap-1">
                          <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Prize name</span>
                          <input
                            v-model="getPrizeEdit(prize).name"
                            type="text"
                            class="rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                            placeholder="Best overall"
                          >
                        </label>
                        <label class="grid gap-1">
                          <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Reward value</span>
                          <input
                            v-model="getPrizeEdit(prize).rewardValue"
                            type="text"
                            class="rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                            placeholder="5000"
                          >
                        </label>
                        <label class="grid gap-1">
                          <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Currency</span>
                          <input
                            v-model="getPrizeEdit(prize).rewardCurrency"
                            type="text"
                            class="rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                            placeholder="USD"
                          >
                        </label>
                      </div>

                      <div class="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_120px_88px_88px]">
                        <label class="grid gap-1">
                          <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Reward type</span>
                          <select
                            v-model="getPrizeEdit(prize).rewardType"
                            class="rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
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
                        </label>
                        <label class="grid gap-1">
                          <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Awarded to</span>
                          <select
                            v-model="getPrizeEdit(prize).awardScope"
                            class="rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                          >
                            <option value="team">
                              Team
                            </option>
                            <option value="member">
                              Member
                            </option>
                          </select>
                        </label>
                        <label class="grid gap-1">
                          <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Rank from</span>
                          <input
                            v-model.number="getPrizeEdit(prize).rankStart"
                            type="number"
                            min="1"
                            class="rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                            placeholder="1"
                          >
                        </label>
                        <label class="grid gap-1">
                          <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Rank to</span>
                          <input
                            v-model.number="getPrizeEdit(prize).rankEnd"
                            type="number"
                            min="1"
                            class="rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                            placeholder="1"
                          >
                        </label>
                      </div>

                      <label class="grid gap-1">
                        <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Description</span>
                        <textarea
                          v-model="getPrizeEdit(prize).description"
                          rows="1"
                          class="min-h-10 rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none transition focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                          placeholder="Explain what the winner receives."
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <p
                  v-if="orderedPrizes.length === 0"
                  class="text-sm text-muted"
                >
                  No prizes configured yet.
                </p>
              </div>
            </div>

            <div class="rounded-xl border border-dashed border-black/12 bg-black/[0.02] p-4 dark:border-white/[0.1] dark:bg-white/[0.02]">
              <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div class="space-y-1">
                  <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                    Add Prize
                  </h3>
                  <p class="text-sm text-muted">
                    New prize details are entered here below the configured prize list.
                  </p>
                </div>

                <AppButton
                  color="primary"
                  label="Add Prize"
                  @click="createPrize"
                />
              </div>

              <div class="grid gap-2.5 md:grid-cols-[minmax(0,1.8fr)_140px_110px]">
                <label class="grid gap-1">
                  <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Prize name</span>
                  <input
                    v-model="prizeDraft.name"
                    type="text"
                    class="w-full rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                    placeholder="Best overall"
                  >
                </label>
                <label class="grid gap-1">
                  <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Reward value</span>
                  <input
                    v-model="prizeDraft.rewardValue"
                    type="text"
                    class="w-full rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                    placeholder="5000"
                  >
                </label>
                <label class="grid gap-1">
                  <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Currency</span>
                  <input
                    v-model="prizeDraft.rewardCurrency"
                    type="text"
                    class="w-full rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                    placeholder="USD"
                  >
                </label>
              </div>

              <div class="mt-2.5 grid gap-2.5 md:grid-cols-[minmax(0,1fr)_120px_88px_88px]">
                <label class="grid gap-1">
                  <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Reward type</span>
                  <select
                    v-model="prizeDraft.rewardType"
                    class="w-full rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
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
                </label>
                <label class="grid gap-1">
                  <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Awarded to</span>
                  <select
                    v-model="prizeDraft.awardScope"
                    class="w-full rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                  >
                    <option value="team">
                      Team
                    </option>
                    <option value="member">
                      Member
                    </option>
                  </select>
                </label>
                <label class="grid gap-1">
                  <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Rank from</span>
                  <input
                    v-model.number="prizeDraft.rankStart"
                    type="number"
                    min="1"
                    class="w-full rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                    placeholder="1"
                  >
                </label>
                <label class="grid gap-1">
                  <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Rank to</span>
                  <input
                    v-model.number="prizeDraft.rankEnd"
                    type="number"
                    min="1"
                    class="w-full rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                    placeholder="1"
                  >
                </label>
              </div>

              <label class="mt-2.5 grid gap-1">
                <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Description</span>
                <textarea
                  v-model="prizeDraft.description"
                  rows="1"
                  class="min-h-10 w-full rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-highlighted outline-none focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                  placeholder="Explain what the winner receives."
                />
              </label>
            </div>
          </div>
        </AppCard>
      </section>
    </template>
  </div>
</template>
