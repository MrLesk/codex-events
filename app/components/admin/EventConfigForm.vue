<script setup lang="ts">
import type Sortable from 'sortablejs'

import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

import AdminEditorRowShell from '~/components/admin/AdminEditorRowShell.vue'
import EventConfigProgramIdentitySection from '~/components/admin/EventConfigProgramIdentitySection.vue'

import type { EventFormState } from '~/domains/events/admin-event'
import type { EventProgramSettingsMode } from '~/domains/events/program-settings'

import {
  createEventSlug,
  getNextAgendaItemDefaultTimes,
  eventConfigFormSchema
} from '~/domains/events/admin-event'
import { cloneFormValues } from '~/utils/form-values'
import { getEventConfigFormModeView } from '~/domains/events/program-settings'
import { moveListItemByIndex } from '~/utils/reorder-list'

const form = defineModel<EventFormState>('form', {
  required: true
})

const emit = defineEmits<{
  submit: []
  uploadBackgroundImage: [file: File]
  removeBackgroundImage: []
  uploadBannerImage: [file: File]
  removeBannerImage: []
}>()

type AgendaFormItem = EventFormState['agendaItems'][number]
type TrackFormItem = EventFormState['tracks'][number]
type SortableInstance = Sortable
type SortableConstructor = typeof Sortable

const props = defineProps<{
  isSubmitting?: boolean
  submitLabel: string
  helperText?: string
  mode?: EventProgramSettingsMode
  autoGenerateSlug?: boolean
  canUploadManagedImages?: boolean
  backgroundImageUploadPending?: boolean
  backgroundImageUploadError?: string
  bannerImageUploadPending?: boolean
  bannerImageUploadError?: string
}>()

const formMode = computed<EventProgramSettingsMode>(() => props.mode ?? 'full')
const formModeView = computed(() => getEventConfigFormModeView(formMode.value))
const showBasicInformationFields = computed(() => formModeView.value.showBasicInformationFields)
const showAgendaItemsSection = computed(() => formModeView.value.showAgendaItemsSection)
const showProgramIdentitySection = computed(() => formModeView.value.showProgramIdentitySection)
const showProgramSettingsSections = computed(() => formModeView.value.showProgramSettingsSections)
const isHackathon = computed(() => form.value.eventType === 'hackathon')
const showEventTypeField = computed(() => formMode.value === 'full' && showBasicInformationFields.value)
const showTracksSection = computed(() => formMode.value !== 'details' && isHackathon.value)
const showInlineDetailsActions = computed(() => formMode.value === 'details')
const isSettingsMode = computed(() => formMode.value === 'settings')
const basicsHeading = computed(() => formModeView.value.basicsHeading)
const basicsDescription = computed(() => formModeView.value.basicsDescription)
const programIdentityDescription = computed(() => formModeView.value.programIdentityDescription)
const eventTypeOptions = [
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'build', label: 'Build' }
] as const

const hasManuallyEditedSlug = ref(false)
const isProgrammaticSlugUpdate = ref(false)
const activeAgendaDragId = ref<string | null>(null)
const agendaDropTargetId = ref<string | null>(null)
const agendaListElement = ref<HTMLElement | null>(null)
const activeTrackDragId = ref<string | null>(null)
const trackDropTargetId = ref<string | null>(null)
const trackListElement = ref<HTMLElement | null>(null)
let agendaSortable: SortableInstance | null = null
let trackSortable: SortableInstance | null = null
let sortableConstructor: SortableConstructor | null = null

const participantsLimitInput = computed({
  get: () => form.value.participantsLimit?.toString() ?? '',
  set: (value: string) => {
    const normalizedValue = value.trim()

    if (!normalizedValue) {
      form.value.participantsLimit = null
      return
    }

    const parsed = Number.parseInt(normalizedValue, 10)
    form.value.participantsLimit = Number.isNaN(parsed) ? null : parsed
  }
})

function createAgendaItemId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `agenda-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function createTrackId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `track-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function nextAgendaDisplayOrder() {
  return form.value.agendaItems.length + 1
}

function nextTrackDisplayOrder() {
  return form.value.tracks.length + 1
}

function applyAgendaOrderFromList(items: AgendaFormItem[]) {
  form.value.agendaItems = items.map((item, index) => ({
    ...item,
    displayOrder: index + 1
  }))
}

function applyTrackOrderFromList(items: TrackFormItem[]) {
  form.value.tracks = items.map((item, index) => ({
    ...item,
    displayOrder: index + 1
  }))
}

function addAgendaItem() {
  const previousItem = form.value.agendaItems[form.value.agendaItems.length - 1] ?? null
  const { startsAt, endsAt } = getNextAgendaItemDefaultTimes(previousItem)

  form.value.agendaItems.push({
    id: createAgendaItemId(),
    startsAt,
    endsAt,
    title: '',
    details: '',
    displayOrder: nextAgendaDisplayOrder()
  })
}

function addTrack() {
  form.value.tracks.push({
    id: createTrackId(),
    name: '',
    description: '',
    displayOrder: nextTrackDisplayOrder()
  })
}

function removeAgendaItem(itemId: string) {
  applyAgendaOrderFromList(form.value.agendaItems.filter(item => item.id !== itemId))
}

function removeTrack(trackId: string) {
  applyTrackOrderFromList(form.value.tracks.filter(track => track.id !== trackId))
}

function moveAgendaItem(itemId: string, direction: -1 | 1) {
  const currentIndex = form.value.agendaItems.findIndex(item => item.id === itemId)

  if (currentIndex < 0) {
    return
  }

  const nextIndex = currentIndex + direction

  if (nextIndex < 0 || nextIndex >= form.value.agendaItems.length) {
    return
  }

  applyAgendaOrderFromList(moveListItemByIndex(form.value.agendaItems, currentIndex, nextIndex))
}

function moveTrack(trackId: string, direction: -1 | 1) {
  const currentIndex = form.value.tracks.findIndex(track => track.id === trackId)

  if (currentIndex < 0) {
    return
  }

  const nextIndex = currentIndex + direction

  if (nextIndex < 0 || nextIndex >= form.value.tracks.length) {
    return
  }

  applyTrackOrderFromList(moveListItemByIndex(form.value.tracks, currentIndex, nextIndex))
}

function destroyAgendaSortable() {
  agendaSortable?.destroy()
  agendaSortable = null
  activeAgendaDragId.value = null
  agendaDropTargetId.value = null
}

function destroyTrackSortable() {
  trackSortable?.destroy()
  trackSortable = null
  activeTrackDragId.value = null
  trackDropTargetId.value = null
}

async function loadSortableConstructor() {
  if (!sortableConstructor) {
    const module = await import('sortablejs')
    sortableConstructor = module.default
  }

  return sortableConstructor
}

async function initializeAgendaSortable() {
  if (!import.meta.client || !showAgendaItemsSection.value || !agendaListElement.value || form.value.agendaItems.length === 0) {
    destroyAgendaSortable()
    return
  }

  const Sortable = await loadSortableConstructor()

  if (!showAgendaItemsSection.value || !agendaListElement.value || form.value.agendaItems.length === 0) {
    destroyAgendaSortable()
    return
  }

  destroyAgendaSortable()

  agendaSortable = Sortable.create(agendaListElement.value, {
    animation: 180,
    handle: '[data-agenda-sort-handle]',
    draggable: '[data-agenda-row]',
    dataIdAttr: 'data-agenda-id',
    ghostClass: 'opacity-45',
    chosenClass: 'cursor-grabbing',
    dragClass: 'cursor-grabbing',
    onChoose(event) {
      activeAgendaDragId.value = event.item.dataset.agendaId ?? null
      agendaDropTargetId.value = null
    },
    onMove(event) {
      const relatedId = event.related?.dataset.agendaId ?? null
      agendaDropTargetId.value = relatedId !== activeAgendaDragId.value ? relatedId : null
      return true
    },
    onEnd(event) {
      const oldIndex = event.oldDraggableIndex ?? event.oldIndex
      const newIndex = event.newDraggableIndex ?? event.newIndex

      if (oldIndex !== undefined && newIndex !== undefined) {
        applyAgendaOrderFromList(moveListItemByIndex(form.value.agendaItems, oldIndex, newIndex))
      }

      activeAgendaDragId.value = null
      agendaDropTargetId.value = null
    }
  })
}

async function initializeTrackSortable() {
  if (!import.meta.client || !showTracksSection.value || !trackListElement.value || form.value.tracks.length === 0) {
    destroyTrackSortable()
    return
  }

  const Sortable = await loadSortableConstructor()

  if (!showTracksSection.value || !trackListElement.value || form.value.tracks.length === 0) {
    destroyTrackSortable()
    return
  }

  destroyTrackSortable()

  trackSortable = Sortable.create(trackListElement.value, {
    animation: 180,
    handle: '[data-track-sort-handle]',
    draggable: '[data-track-row]',
    dataIdAttr: 'data-track-id',
    ghostClass: 'opacity-45',
    chosenClass: 'cursor-grabbing',
    dragClass: 'cursor-grabbing',
    onChoose(event) {
      activeTrackDragId.value = event.item.dataset.trackId ?? null
      trackDropTargetId.value = null
    },
    onMove(event) {
      const relatedId = event.related?.dataset.trackId ?? null
      trackDropTargetId.value = relatedId !== activeTrackDragId.value ? relatedId : null
      return true
    },
    onEnd(event) {
      const oldIndex = event.oldDraggableIndex ?? event.oldIndex
      const newIndex = event.newDraggableIndex ?? event.newIndex

      if (oldIndex !== undefined && newIndex !== undefined) {
        applyTrackOrderFromList(moveListItemByIndex(form.value.tracks, oldIndex, newIndex))
      }

      activeTrackDragId.value = null
      trackDropTargetId.value = null
    }
  })
}

const {
  errors,
  submitCount,
  setValues,
  handleSubmit
} = useForm({
  validationSchema: toTypedSchema(eventConfigFormSchema),
  initialValues: cloneFormValues(form.value)
})

watch(() => form.value, (nextForm) => {
  setValues(cloneFormValues(nextForm), false)
}, {
  deep: true,
  immediate: true
})

watch(() => form.value.name, (nextName) => {
  if (!props.autoGenerateSlug || hasManuallyEditedSlug.value) {
    return
  }

  const generatedSlug = createEventSlug(nextName)

  if (form.value.slug === generatedSlug) {
    return
  }

  isProgrammaticSlugUpdate.value = true
  form.value.slug = generatedSlug
})

watch(() => form.value.slug, (nextSlug) => {
  const normalizedSlug = createEventSlug(nextSlug)
  const generatedSlugFromName = createEventSlug(form.value.name)
  const cameFromUserEdit = !isProgrammaticSlugUpdate.value

  if (normalizedSlug !== nextSlug) {
    isProgrammaticSlugUpdate.value = true
    form.value.slug = normalizedSlug

    if (
      props.autoGenerateSlug
      && cameFromUserEdit
      && !hasManuallyEditedSlug.value
      && normalizedSlug !== generatedSlugFromName
    ) {
      hasManuallyEditedSlug.value = true
    }

    return
  }

  if (!props.autoGenerateSlug) {
    return
  }

  if (isProgrammaticSlugUpdate.value) {
    isProgrammaticSlugUpdate.value = false
    return
  }

  if (!hasManuallyEditedSlug.value && normalizedSlug !== generatedSlugFromName) {
    hasManuallyEditedSlug.value = true
  }
})

const validationErrorMessages = computed(() => {
  if (submitCount.value === 0) {
    return []
  }

  return [...new Set(Object.values(errors.value).filter((value): value is string => Boolean(value)))]
})

const agendaItemsOrderKey = computed(() => form.value.agendaItems.map(item => item.id).join('|'))
const tracksOrderKey = computed(() => form.value.tracks.map(track => track.id).join('|'))

watch([agendaItemsOrderKey, showAgendaItemsSection], async () => {
  await nextTick()
  await initializeAgendaSortable()
}, {
  immediate: true,
  flush: 'post'
})

watch([tracksOrderKey, showTracksSection], async () => {
  await nextTick()
  await initializeTrackSortable()
}, {
  immediate: true,
  flush: 'post'
})

onBeforeUnmount(() => {
  destroyAgendaSortable()
  destroyTrackSortable()
})

const submitConfigForm = handleSubmit(() => {
  emit('submit')
})
</script>

<template>
  <form
    class="space-y-6"
    @submit.prevent="submitConfigForm"
  >
    <section
      id="admin-config-basics"
      class="space-y-6"
    >
      <AppCard class="scroll-mt-28 rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              {{ basicsHeading }}
            </h2>
            <p class="text-sm text-muted">
              {{ basicsDescription }}
            </p>
          </div>
        </template>

        <div class="grid grid-cols-1 gap-5">
          <template v-if="showBasicInformationFields">
            <label
              v-if="showEventTypeField"
              class="grid gap-2"
            >
              <span class="text-sm font-medium text-toned">Event type</span>
              <AppSelect
                v-model="form.eventType"
                required
              >
                <option
                  v-for="option in eventTypeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </AppSelect>
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Event name</span>
              <AppInput
                v-model="form.name"
                type="text"
                placeholder="Codex Spring Builders 2026"
                required
              />
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Slug</span>
              <AppInput
                v-model="form.slug"
                type="text"
                placeholder="codex-spring-builders-2026"
                required
              />
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Discord server URL</span>
              <AppInput
                v-model="form.discordServerUrl"
                type="url"
                placeholder="https://discord.gg/your-invite"
              />
              <span class="text-xs text-muted">Shown only in the account workspace for approved participants, judges, staff, and admins.</span>
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Luma event URL</span>
              <AppInput
                v-model="form.lumaEventUrl"
                type="url"
                placeholder="https://lu.ma/your-event"
              />
              <span class="text-xs text-muted">Optional public Luma link.</span>
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Luma event API ID</span>
              <AppInput
                v-model="form.lumaEventApiId"
                type="text"
                placeholder="evt-FSlTqAmG9QanU4s"
              />
              <span class="text-xs text-muted">Use the Luma API ID, not the public URL.</span>
            </label>

            <LazyAdminMarkdownEditorField
              v-model="form.description"
              name="event-description-editor"
              editor-id="event-description-editor"
              label="Description"
              description="Shown on the public event page."
              placeholder="Describe the event, focus areas, and expectations for participants."
              required
            />
          </template>

          <section
            v-if="showTracksSection"
            class="grid grid-cols-1 gap-3 border-t border-black/8 pt-5 dark:border-white/[0.08]"
          >
            <div class="space-y-1">
              <h3 class="text-base font-semibold text-highlighted">
                Tracks
              </h3>
              <p class="text-sm text-muted">
                Add the submission tracks participants can choose from. Judges will also see the selected track in blind review.
              </p>
            </div>

            <div
              v-if="form.tracks.length === 0"
              class="grid gap-3 rounded-xl border border-dashed border-black/10 px-4 py-4 text-sm text-muted dark:border-white/[0.08]"
            >
              <p>No tracks yet.</p>
            </div>

            <div
              v-else
              ref="trackListElement"
              class="grid grid-cols-1 gap-3"
            >
              <article
                v-for="(track, index) in form.tracks"
                :key="track.id"
                :data-track-id="track.id"
                data-track-row
                class="rounded-xl border border-black/8 bg-white/88 p-3 dark:border-white/[0.08] dark:bg-[#111111]"
              >
                <AdminEditorRowShell>
                  <template #controls>
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                      :aria-label="`Move ${track.name || `track ${index + 1}`} up`"
                      :disabled="index === 0"
                      @click="moveTrack(track.id, -1)"
                    >
                      <AppIcon
                        name="i-lucide-arrow-up"
                        class="size-4"
                      />
                    </button>

                    <button
                      type="button"
                      data-track-sort-handle
                      class="group inline-flex h-11 w-11 cursor-grab items-center justify-center rounded-xl border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted active:cursor-grabbing dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                      :aria-label="`Drag to reorder ${track.name || `track ${index + 1}`}`"
                    >
                      <AppIcon
                        name="i-lucide-grip-vertical"
                        class="size-4.5 transition group-hover:scale-105"
                      />
                    </button>

                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                      :aria-label="`Move ${track.name || `track ${index + 1}`} down`"
                      :disabled="index === form.tracks.length - 1"
                      @click="moveTrack(track.id, 1)"
                    >
                      <AppIcon
                        name="i-lucide-arrow-down"
                        class="size-4"
                      />
                    </button>
                  </template>

                  <div class="grid grid-cols-1 gap-3">
                    <label class="grid gap-2">
                      <span class="text-xs font-medium text-toned">Track name</span>
                      <AppInput
                        v-model="track.name"
                        type="text"
                        placeholder="Best AI Agent"
                        required
                      />
                    </label>

                    <label class="grid gap-2">
                      <span class="text-xs font-medium text-toned">Description</span>
                      <AppTextarea
                        v-model="track.description"
                        rows="1"
                        placeholder="Describe what kinds of submissions belong in this track."
                      />
                    </label>
                  </div>

                  <template #actions>
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 bg-white text-toned transition hover:border-red-400/50 hover:text-red-600 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-red-400/40 dark:hover:text-red-300"
                      :aria-label="`Delete ${track.name || `track ${index + 1}`}`"
                      @click="removeTrack(track.id)"
                    >
                      <AppIcon
                        name="i-lucide-trash-2"
                        class="size-4"
                      />
                    </button>
                  </template>
                </AdminEditorRowShell>
              </article>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3">
              <AppButton
                type="button"
                color="neutral"
                variant="soft"
                size="sm"
                class="w-fit"
                @click="addTrack"
              >
                {{ form.tracks.length === 0 ? 'Add first track' : 'Add track' }}
              </AppButton>
            </div>
          </section>

          <div
            v-if="showAgendaItemsSection"
            class="grid grid-cols-1 gap-3"
          >
            <div
              v-if="form.agendaItems.length === 0"
              class="grid gap-3 rounded-xl border border-dashed border-black/10 px-4 py-4 text-sm text-muted dark:border-white/[0.08]"
            >
              <p>No agenda items yet.</p>
            </div>

            <div
              v-else
              ref="agendaListElement"
              class="grid grid-cols-1 gap-3"
            >
              <article
                v-for="(item, index) in form.agendaItems"
                :key="item.id"
                :data-agenda-id="item.id"
                data-agenda-row
                class="rounded-xl border bg-white/88 p-3 transition-all dark:bg-[#111111]"
                :class="[
                  agendaDropTargetId === item.id
                    ? 'border-dashed border-black/30 ring-2 ring-black/6 dark:border-white/[0.32] dark:ring-white/[0.08]'
                    : 'border-black/8 dark:border-white/[0.08]',
                  activeAgendaDragId === item.id
                    ? 'shadow-[0_16px_40px_-34px_rgba(15,23,42,0.55)]'
                    : ''
                ]"
              >
                <div
                  v-if="agendaDropTargetId === item.id"
                  class="mb-3 rounded-lg border border-dashed border-black/18 bg-black/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted dark:border-white/[0.14] dark:bg-white/[0.03]"
                >
                  Drop agenda item here
                </div>

                <AdminEditorRowShell>
                  <template #controls>
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                      :aria-label="`Move ${item.title || `agenda item ${index + 1}`} up`"
                      :disabled="index === 0"
                      @click="moveAgendaItem(item.id, -1)"
                    >
                      <AppIcon
                        name="i-lucide-arrow-up"
                        class="size-4"
                      />
                    </button>

                    <button
                      type="button"
                      data-agenda-sort-handle
                      class="group inline-flex h-11 w-11 cursor-grab items-center justify-center rounded-xl border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted active:cursor-grabbing dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                      :aria-label="`Drag to reorder ${item.title || `agenda item ${index + 1}`}`"
                    >
                      <AppIcon
                        name="i-lucide-grip-vertical"
                        class="size-4.5 transition group-hover:scale-105"
                      />
                    </button>

                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 bg-white text-toned transition hover:border-black/20 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-white/[0.18]"
                      :aria-label="`Move ${item.title || `agenda item ${index + 1}`} down`"
                      :disabled="index === form.agendaItems.length - 1"
                      @click="moveAgendaItem(item.id, 1)"
                    >
                      <AppIcon
                        name="i-lucide-arrow-down"
                        class="size-4"
                      />
                    </button>
                  </template>

                  <div class="grid grid-cols-1 gap-3">
                    <label class="grid gap-2">
                      <span class="text-xs font-medium text-toned">Title</span>
                      <AppInput
                        v-model="item.title"
                        type="text"
                        placeholder="Opening workshop"
                        required
                      />
                    </label>

                    <label class="grid gap-2">
                      <span class="text-xs font-medium text-toned">Description</span>
                      <AppTextarea
                        v-model="item.details"
                        rows="1"
                        class="min-h-10"
                        placeholder="Optional notes for this agenda item."
                      />
                    </label>

                    <div class="grid gap-3 pb-2 md:grid-cols-2">
                      <label class="grid gap-2">
                        <span class="text-xs font-medium text-toned">Starts at</span>
                        <AppDateTimeInput
                          v-model="item.startsAt"
                          picker-aria-label="Choose agenda start date and time"
                          required
                        />
                      </label>

                      <label class="grid gap-2">
                        <span class="text-xs font-medium text-toned">Ends at</span>
                        <AppDateTimeInput
                          v-model="item.endsAt"
                          picker-aria-label="Choose agenda end date and time"
                        />
                      </label>
                    </div>
                  </div>

                  <template #actions>
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 bg-white text-toned transition hover:border-red-400/50 hover:text-red-600 dark:border-white/[0.08] dark:bg-[#151515] dark:hover:border-red-400/40 dark:hover:text-red-300"
                      :aria-label="`Delete ${item.title || `agenda item ${index + 1}`}`"
                      @click="removeAgendaItem(item.id)"
                    >
                      <AppIcon
                        name="i-lucide-trash-2"
                        class="size-4"
                      />
                    </button>
                  </template>
                </AdminEditorRowShell>
              </article>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3">
              <AppButton
                type="button"
                color="neutral"
                variant="soft"
                size="sm"
                class="w-fit"
                @click="addAgendaItem"
              >
                {{ form.agendaItems.length === 0 ? 'Add first item' : 'Add item' }}
              </AppButton>
            </div>
          </div>

          <template v-if="showProgramSettingsSections && isSettingsMode">
            <section class="border-t border-black/8 pt-6 dark:border-white/[0.08]">
              <div class="space-y-1">
                <h3 class="text-lg font-semibold text-highlighted">
                  Timeline
                </h3>
                <p class="text-sm text-muted">
                  {{ isHackathon ? 'Set the registration and submission window.' : 'Set the registration window.' }}
                </p>
              </div>

              <div class="mt-5 grid gap-5 md:grid-cols-2">
                <label class="grid gap-2">
                  <span class="text-sm font-medium text-toned">Registration opens</span>
                  <AppDateTimeInput
                    v-model="form.registrationOpensAt"
                    picker-aria-label="Choose registration open date and time"
                    required
                  />
                </label>

                <label class="grid gap-2">
                  <span class="text-sm font-medium text-toned">Registration closes</span>
                  <AppDateTimeInput
                    v-model="form.registrationClosesAt"
                    picker-aria-label="Choose registration close date and time"
                    required
                  />
                </label>

                <label
                  v-if="isHackathon"
                  class="grid gap-2"
                >
                  <span class="text-sm font-medium text-toned">Submission opens</span>
                  <AppDateTimeInput
                    v-model="form.submissionOpensAt"
                    picker-aria-label="Choose submission open date and time"
                    required
                  />
                </label>

                <label
                  v-if="isHackathon"
                  class="grid gap-2"
                >
                  <span class="text-sm font-medium text-toned">Submission closes</span>
                  <AppDateTimeInput
                    v-model="form.submissionClosesAt"
                    picker-aria-label="Choose submission close date and time"
                    required
                  />
                </label>
              </div>
            </section>

            <section
              v-if="isHackathon"
              class="border-t border-black/8 pt-6 dark:border-white/[0.08]"
            >
              <div class="space-y-1">
                <h3 class="text-lg font-semibold text-highlighted">
                  Judging
                </h3>
                <p class="text-sm text-muted">
                  Set blind reviews per submission, pitch review, and score weighting.
                </p>
              </div>

              <div class="mt-5 grid grid-cols-1 gap-5">
                <div class="grid gap-5 md:grid-cols-2 md:items-start">
                  <label class="grid gap-2">
                    <span class="text-sm font-medium text-toned">Blind reviews per submission</span>
                    <AppInput
                      v-model.number="form.blindReviewCount"
                      type="number"
                      min="0"
                      max="2"
                      required
                    />
                    <span class="text-xs text-muted">Use 0 to disable blind review.</span>
                  </label>

                  <label class="grid gap-2">
                    <span class="text-sm font-medium text-toned">Blind score weight (%)</span>
                    <AppInput
                      v-model.number="form.blindScoreWeightPercent"
                      type="number"
                      min="0"
                      max="100"
                      required
                    />
                  </label>
                </div>

                <div class="grid gap-5 md:grid-cols-2 md:items-start">
                  <div class="grid gap-2">
                    <span class="text-sm font-medium text-toned">Pitch review</span>

                    <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
                      <input
                        v-model="form.pitchReviewEnabled"
                        type="checkbox"
                        class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                      >
                      Enable pitch review
                    </label>
                  </div>

                  <label
                    v-if="form.pitchReviewEnabled"
                    class="grid gap-2"
                  >
                    <span class="text-sm font-medium text-toned">Pitch score weight (%)</span>
                    <AppInput
                      v-model.number="form.pitchScoreWeightPercent"
                      type="number"
                      min="0"
                      max="100"
                      required
                    />
                  </label>

                  <label
                    v-if="form.pitchReviewEnabled && form.blindReviewCount > 0"
                    class="grid gap-2 md:max-w-[16rem]"
                  >
                    <span class="text-sm font-medium text-toned">Preselected finalists</span>
                    <AppInput
                      v-model.number="form.shortlistFinalistCount"
                      type="number"
                      min="1"
                      required
                    />
                    <span class="text-xs text-muted">When shortlist starts, the top ranked blind submissions appear as the default finalist boundary up to this count until shortlist is saved.</span>
                  </label>
                </div>

                <p class="text-xs text-muted">
                  Enable blind review, pitch review, or both. If both are enabled, the score weights must add up to 100.
                </p>
              </div>
            </section>

            <section class="border-t border-black/8 pt-6 dark:border-white/[0.08]">
              <div class="space-y-1">
                <h3 class="text-lg font-semibold text-highlighted">
                  Participation Rules
                </h3>
                <p class="text-sm text-muted">
                  {{ isHackathon ? 'Set team limits plus registration and submission requirements.' : 'Set participant limits and registration requirements.' }}
                </p>
              </div>

              <div class="mt-5 grid grid-cols-1 gap-5">
                <div class="grid gap-5 md:grid-cols-2 md:items-start">
                  <label
                    v-if="isHackathon"
                    class="grid gap-2"
                  >
                    <span class="text-sm font-medium text-toned">Maximum team members</span>
                    <AppInput
                      v-model.number="form.maxTeamMembers"
                      type="number"
                      min="1"
                      required
                    />
                  </label>

                  <label class="grid gap-2">
                    <span class="text-sm font-medium text-toned">Participants limit</span>
                    <AppInput
                      v-model="participantsLimitInput"
                      type="number"
                      min="1"
                      placeholder="Leave empty for no limit"
                    />
                  </label>
                </div>

                <div class="grid grid-cols-1 gap-3">
                  <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
                    <input
                      v-model="form.autoApproveApplications"
                      type="checkbox"
                      class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                    >
                    <span class="grid gap-0.5">
                      <span>Approve applications automatically</span>
                      <span class="text-xs text-muted">New applications are approved immediately after required checks pass.</span>
                    </span>
                  </label>

                  <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
                    <input
                      v-model="form.inPersonEvent"
                      type="checkbox"
                      class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                    >
                    In-person event
                  </label>

                  <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
                    <input
                      v-model="form.requireChatgptEmail"
                      type="checkbox"
                      class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                    >
                    Require ChatGPT email
                  </label>

                  <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
                    <input
                      v-model="form.requireOpenaiOrgId"
                      type="checkbox"
                      class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                    >
                    Require OpenAI org ID
                  </label>

                  <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
                    <input
                      v-model="form.requireLumaEmail"
                      type="checkbox"
                      class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                    >
                    Require Luma email
                  </label>

                  <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
                    <input
                      v-model="form.requireWhyThisEvent"
                      type="checkbox"
                      class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                    >
                    Require "Why this event" answer
                  </label>

                  <label
                    v-if="isHackathon"
                    class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]"
                  >
                    <input
                      v-model="form.requireProofOfExecution"
                      type="checkbox"
                      class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                    >
                    Require proof-of-execution links
                  </label>

                  <label
                    v-if="isHackathon"
                    class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]"
                  >
                    <input
                      v-model="form.requireSubmissionSummary"
                      type="checkbox"
                      class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                    >
                    Require submission summary
                  </label>

                  <label
                    v-if="isHackathon"
                    class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]"
                  >
                    <input
                      v-model="form.requireSubmissionRepositoryUrl"
                      type="checkbox"
                      class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                    >
                    Require repository URL
                  </label>

                  <label
                    v-if="isHackathon"
                    class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]"
                  >
                    <input
                      v-model="form.requireSubmissionDemoUrl"
                      type="checkbox"
                      class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                    >
                    Require demo URL
                  </label>

                  <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
                    <input
                      v-model="form.requireLinkedinProfile"
                      type="checkbox"
                      class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                    >
                    Require LinkedIn profile
                  </label>

                  <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
                    <input
                      v-model="form.requireGithubProfile"
                      type="checkbox"
                      class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                    >
                    Require GitHub profile
                  </label>

                  <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
                    <input
                      v-model="form.requireXProfile"
                      type="checkbox"
                      class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                    >
                    Require X profile
                  </label>
                </div>
              </div>
            </section>

            <div class="border-t border-black/8 pt-6 dark:border-white/[0.08]">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="max-w-3xl space-y-3">
                  <p class="text-sm text-muted">
                    {{ helperText ?? 'Save your changes to update this event.' }}
                  </p>

                  <AppAlert
                    v-if="validationErrorMessages.length > 0"
                    color="error"
                    variant="soft"
                    title="Form validation failed"
                    :description="validationErrorMessages[0]"
                  />
                </div>

                <AppButton
                  type="submit"
                  :loading="isSubmitting"
                  :disabled="isSubmitting"
                  color="primary"
                  size="lg"
                  class="justify-center"
                >
                  {{ submitLabel }}
                </AppButton>
              </div>
            </div>
          </template>
        </div>
      </AppCard>

      <EventConfigProgramIdentitySection
        v-if="showProgramIdentitySection"
        v-model:form="form"
        :description="programIdentityDescription"
        :can-upload-managed-images="props.canUploadManagedImages"
        :background-image-upload-pending="props.backgroundImageUploadPending"
        :background-image-upload-error="props.backgroundImageUploadError"
        :banner-image-upload-pending="props.bannerImageUploadPending"
        :banner-image-upload-error="props.bannerImageUploadError"
        @upload-background-image="emit('uploadBackgroundImage', $event)"
        @remove-background-image="emit('removeBackgroundImage')"
        @upload-banner-image="emit('uploadBannerImage', $event)"
        @remove-banner-image="emit('removeBannerImage')"
      />

      <AppCard
        v-if="showProgramIdentitySection && showInlineDetailsActions"
        class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="max-w-3xl space-y-3">
            <p class="text-sm text-muted">
              {{ helperText ?? 'Save your changes to update this event.' }}
            </p>

            <AppAlert
              v-if="validationErrorMessages.length > 0"
              color="error"
              variant="soft"
              title="Form validation failed"
              :description="validationErrorMessages[0]"
            />
          </div>

          <AppButton
            type="submit"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            color="primary"
            size="lg"
            class="justify-center"
          >
            {{ submitLabel }}
          </AppButton>
        </div>
      </AppCard>
    </section>

    <section
      v-if="showProgramSettingsSections && !isSettingsMode"
      class="space-y-6"
    >
      <AppCard
        id="admin-config-timeline"
        class="scroll-mt-28 rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60"
      >
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Timeline
            </h2>
            <p class="text-sm text-muted">
              {{ isHackathon ? 'Set the registration and submission window.' : 'Set the registration window.' }}
            </p>
          </div>
        </template>

        <div class="grid gap-5 md:grid-cols-2">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Registration opens</span>
            <AppDateTimeInput
              v-model="form.registrationOpensAt"
              picker-aria-label="Choose registration open date and time"
              required
            />
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Registration closes</span>
            <AppDateTimeInput
              v-model="form.registrationClosesAt"
              picker-aria-label="Choose registration close date and time"
              required
            />
          </label>

          <label
            v-if="isHackathon"
            class="grid gap-2"
          >
            <span class="text-sm font-medium text-toned">Submission opens</span>
            <AppDateTimeInput
              v-model="form.submissionOpensAt"
              picker-aria-label="Choose submission open date and time"
              required
            />
          </label>

          <label
            v-if="isHackathon"
            class="grid gap-2"
          >
            <span class="text-sm font-medium text-toned">Submission closes</span>
            <AppDateTimeInput
              v-model="form.submissionClosesAt"
              picker-aria-label="Choose submission close date and time"
              required
            />
          </label>
        </div>
      </AppCard>

      <AppCard
        v-if="isHackathon"
        id="admin-config-judging"
        class="scroll-mt-28 rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60"
      >
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Judging
            </h2>
            <p class="text-sm text-muted">
              Set blind reviews per submission, pitch review, and score weighting.
            </p>
          </div>
        </template>

        <div class="grid grid-cols-1 gap-5">
          <div class="grid gap-5 md:grid-cols-2 md:items-start">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Blind reviews per submission</span>
              <AppInput
                v-model.number="form.blindReviewCount"
                type="number"
                min="0"
                max="2"
                required
              />
              <span class="text-xs text-muted">Use 0 to disable blind review.</span>
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Blind score weight (%)</span>
              <AppInput
                v-model.number="form.blindScoreWeightPercent"
                type="number"
                min="0"
                max="100"
                required
              />
            </label>
          </div>

          <div class="grid gap-5 md:grid-cols-2 md:items-start">
            <div class="grid gap-2">
              <span class="text-sm font-medium text-toned">Pitch review</span>

              <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
                <input
                  v-model="form.pitchReviewEnabled"
                  type="checkbox"
                  class="size-4 rounded border-black/20 dark:border-white/[0.3]"
                >
                Enable pitch review
              </label>
            </div>

            <label
              v-if="form.pitchReviewEnabled"
              class="grid gap-2"
            >
              <span class="text-sm font-medium text-toned">Pitch score weight (%)</span>
              <AppInput
                v-model.number="form.pitchScoreWeightPercent"
                type="number"
                min="0"
                max="100"
                required
              />
            </label>

            <label
              v-if="form.pitchReviewEnabled && form.blindReviewCount > 0"
              class="grid gap-2 md:max-w-[16rem]"
            >
              <span class="text-sm font-medium text-toned">Preselected finalists</span>
              <AppInput
                v-model.number="form.shortlistFinalistCount"
                type="number"
                min="1"
                required
              />
              <span class="text-xs text-muted">When shortlist starts, the top ranked blind submissions appear as the default finalist boundary up to this count until shortlist is saved.</span>
            </label>
          </div>

          <p class="text-xs text-muted">
            Enable blind review, pitch review, or both. If both are enabled, the score weights must add up to 100.
          </p>
        </div>
      </AppCard>

      <AppCard
        id="admin-config-rules"
        class="scroll-mt-28 rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60"
      >
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Participation Rules
            </h2>
            <p class="text-sm text-muted">
              {{ isHackathon ? 'Set team limits plus registration and submission requirements.' : 'Set participant limits and registration requirements.' }}
            </p>
          </div>
        </template>

        <div class="grid grid-cols-1 gap-5">
          <div class="grid gap-5 md:grid-cols-2 md:items-start">
            <label
              v-if="isHackathon"
              class="grid gap-2"
            >
              <span class="text-sm font-medium text-toned">Maximum team members</span>
              <AppInput
                v-model.number="form.maxTeamMembers"
                type="number"
                min="1"
                required
              />
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Participants limit</span>
              <AppInput
                v-model="participantsLimitInput"
                type="number"
                min="1"
                placeholder="Leave empty for no limit"
              />
            </label>
          </div>

          <div class="grid grid-cols-1 gap-3">
            <label
              v-if="isHackathon"
              class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]"
            >
              <input
                v-model="form.autoApproveApplications"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              <span class="grid gap-0.5">
                <span>Approve applications automatically</span>
                <span class="text-xs text-muted">New applications are approved immediately after required checks pass.</span>
              </span>
            </label>

            <label
              v-if="isHackathon"
              class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]"
            >
              <input
                v-model="form.inPersonEvent"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              In-person event
            </label>

            <label
              v-if="isHackathon"
              class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]"
            >
              <input
                v-model="form.requireChatgptEmail"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require ChatGPT email
            </label>

            <label
              v-if="isHackathon"
              class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]"
            >
              <input
                v-model="form.requireOpenaiOrgId"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require OpenAI org ID
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireLumaEmail"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require Luma email
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireWhyThisEvent"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require "Why this event" answer
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireProofOfExecution"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require proof-of-execution links
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireSubmissionSummary"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require submission summary
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireSubmissionRepositoryUrl"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require repository URL
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireSubmissionDemoUrl"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require demo URL
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireLinkedinProfile"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require LinkedIn profile
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireGithubProfile"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require GitHub profile
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireXProfile"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require X profile
            </label>
          </div>
        </div>
      </AppCard>
    </section>

    <div
      v-if="!showInlineDetailsActions && !isSettingsMode"
      class="!border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 flex flex-col gap-4 rounded-xl px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="max-w-3xl text-sm text-muted">
        {{ helperText ?? 'Save your changes to update this event.' }}
      </p>

      <AppAlert
        v-if="validationErrorMessages.length > 0"
        color="error"
        variant="soft"
        title="Form validation failed"
        :description="validationErrorMessages[0]"
      />

      <AppButton
        type="submit"
        :loading="isSubmitting"
        :disabled="isSubmitting"
        color="primary"
        size="lg"
        class="justify-center"
      >
        {{ submitLabel }}
      </AppButton>
    </div>
  </form>
</template>
