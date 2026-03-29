<script setup lang="ts">
import Sortable from 'sortablejs'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

import AdminMarkdownEditorField from '~/components/admin/AdminMarkdownEditorField.vue'

import type { HackathonFormState } from '~/utils/admin-workspace'
import type { HackathonProgramSettingsMode } from '~/utils/hackathon-program-settings'

import {
  createHackathonSlug,
  getNextAgendaItemDefaultTimes
} from '~/utils/admin-workspace'
import { getCountryOptions } from '~/utils/country-options'
import { hackathonConfigFormSchema } from '~/utils/form-schemas'
import { cloneFormValues } from '~/utils/form-values'
import { getHackathonConfigFormModeView } from '~/utils/hackathon-program-settings'
import { moveListItemByIndex } from '~/utils/reorder-list'

const form = defineModel<HackathonFormState>('form', {
  required: true
})

const emit = defineEmits<{
  submit: []
  uploadBackgroundImage: [file: File]
  removeBackgroundImage: []
  uploadBannerImage: [file: File]
  removeBannerImage: []
}>()

type AgendaFormItem = HackathonFormState['agendaItems'][number]

const props = defineProps<{
  isSubmitting?: boolean
  submitLabel: string
  helperText?: string
  mode?: HackathonProgramSettingsMode
  autoGenerateSlug?: boolean
  canUploadManagedImages?: boolean
  backgroundImageUploadPending?: boolean
  backgroundImageUploadSuccess?: string
  backgroundImageUploadError?: string
  bannerImageUploadPending?: boolean
  bannerImageUploadSuccess?: string
  bannerImageUploadError?: string
}>()

const formMode = computed<HackathonProgramSettingsMode>(() => props.mode ?? 'full')
const formModeView = computed(() => getHackathonConfigFormModeView(formMode.value))
const showBasicInformationFields = computed(() => formModeView.value.showBasicInformationFields)
const showAgendaItemsSection = computed(() => formModeView.value.showAgendaItemsSection)
const showProgramIdentitySection = computed(() => formModeView.value.showProgramIdentitySection)
const showProgramSettingsSections = computed(() => formModeView.value.showProgramSettingsSections)
const showInlineDetailsActions = computed(() => formMode.value === 'details')
const basicsHeading = computed(() => formModeView.value.basicsHeading)
const basicsDescription = computed(() => formModeView.value.basicsDescription)
const programIdentityDescription = computed(() => formModeView.value.programIdentityDescription)
const countryOptions = computed(() => getCountryOptions(form.value.country))

const hasManuallyEditedSlug = ref(false)
const isProgrammaticSlugUpdate = ref(false)
const backgroundImageInput = ref<HTMLInputElement | null>(null)
const bannerImageInput = ref<HTMLInputElement | null>(null)
const activeAgendaDragId = ref<string | null>(null)
const agendaDropTargetId = ref<string | null>(null)
const agendaListElement = ref<HTMLElement | null>(null)
let agendaSortable: Sortable | null = null

const managedBackgroundImageUrl = computed(() => form.value.backgroundImageUrl.trim())
const managedBannerImageUrl = computed(() => form.value.bannerImageUrl.trim())
const showBackgroundImageSection = computed(() =>
  Boolean(props.canUploadManagedImages || managedBackgroundImageUrl.value)
)
const showBannerImageSection = computed(() =>
  Boolean(props.canUploadManagedImages || managedBannerImageUrl.value)
)
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

function uploadBackgroundImage(event: Event) {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.item(0) ?? null

  if (!file) {
    return
  }

  emit('uploadBackgroundImage', file)

  if (target) {
    target.value = ''
  }
}

function uploadBannerImage(event: Event) {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.item(0) ?? null

  if (!file) {
    return
  }

  emit('uploadBannerImage', file)

  if (target) {
    target.value = ''
  }
}

function promptBackgroundImageUpload() {
  backgroundImageInput.value?.click()
}

function promptBannerImageUpload() {
  bannerImageInput.value?.click()
}

function createAgendaItemId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `agenda-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function nextAgendaDisplayOrder() {
  return form.value.agendaItems.length + 1
}

function applyAgendaOrderFromList(items: AgendaFormItem[]) {
  form.value.agendaItems = items.map((item, index) => ({
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

function removeAgendaItem(itemId: string) {
  applyAgendaOrderFromList(form.value.agendaItems.filter(item => item.id !== itemId))
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

function destroyAgendaSortable() {
  agendaSortable?.destroy()
  agendaSortable = null
  activeAgendaDragId.value = null
  agendaDropTargetId.value = null
}

function initializeAgendaSortable() {
  if (!import.meta.client || !showAgendaItemsSection.value || !agendaListElement.value || form.value.agendaItems.length === 0) {
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

const {
  errors,
  submitCount,
  setValues,
  handleSubmit
} = useForm({
  validationSchema: toTypedSchema(hackathonConfigFormSchema),
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

  const generatedSlug = createHackathonSlug(nextName)

  if (form.value.slug === generatedSlug) {
    return
  }

  isProgrammaticSlugUpdate.value = true
  form.value.slug = generatedSlug
})

watch(() => form.value.slug, (nextSlug) => {
  const normalizedSlug = createHackathonSlug(nextSlug)
  const generatedSlugFromName = createHackathonSlug(form.value.name)
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

watch([agendaItemsOrderKey, showAgendaItemsSection], async () => {
  await nextTick()
  initializeAgendaSortable()
}, {
  immediate: true,
  flush: 'post'
})

onBeforeUnmount(() => {
  destroyAgendaSortable()
})

const submitConfigForm = handleSubmit(() => {
  emit('submit')
})
</script>

<template>
  <form
    class="space-y-10"
    @submit.prevent="submitConfigForm"
  >
    <section
      id="admin-config-basics"
      class="space-y-6"
    >
      <AppCard class="scroll-mt-28 rounded-xl hackathon-workspace-detail-panel">
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

        <div class="grid gap-5">
          <template v-if="showBasicInformationFields">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Hackathon name</span>
              <input
                v-model="form.name"
                type="text"
                class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                placeholder="Codex Spring Builders 2026"
                required
              >
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Slug (the path in the URL, for example: codex-hackathons.com/hackathons/codex-spring-builders-2026)</span>
              <input
                v-model="form.slug"
                type="text"
                class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                placeholder="codex-spring-builders-2026"
                required
              >
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Luma event URL</span>
              <input
                v-model="form.lumaEventUrl"
                type="url"
                class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                placeholder="https://lu.ma/your-event"
              >
              <span class="text-xs text-muted">Optional public Luma event link for this hackathon. Leave blank if you are not using Luma.</span>
            </label>

            <AdminMarkdownEditorField
              v-model="form.description"
              name="hackathon-description-editor"
              editor-id="hackathon-description-editor"
              label="Description"
              description="Write the public overview shown to participants. Markdown headings, lists, links, and emphasis are supported."
              placeholder="Describe the event, focus areas, and expectations for participants."
              required
            />
          </template>

          <div
            v-if="showAgendaItemsSection"
            class="grid gap-3"
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
              class="grid gap-3"
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

                <div class="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-4">
                  <div class="flex w-11 flex-col items-center justify-center gap-3 self-center">
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
                  </div>

                  <div class="grid gap-3">
                    <label class="grid gap-2">
                      <span class="text-xs font-medium text-toned">Title</span>
                      <input
                        v-model="item.title"
                        type="text"
                        class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-3 py-2 text-sm text-highlighted outline-none"
                        placeholder="Opening workshop"
                        required
                      >
                    </label>

                    <label class="grid gap-2">
                      <span class="text-xs font-medium text-toned">Description</span>
                      <textarea
                        v-model="item.details"
                        rows="1"
                        class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-3 py-2 text-sm text-highlighted outline-none"
                        placeholder="Optional notes for this agenda item."
                      />
                    </label>

                    <div class="grid gap-3 pb-2 md:grid-cols-2">
                      <label class="grid gap-2">
                        <span class="text-xs font-medium text-toned">Starts at</span>
                        <input
                          v-model="item.startsAt"
                          type="datetime-local"
                          class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-3 py-2 text-sm text-highlighted outline-none"
                          required
                        >
                      </label>

                      <label class="grid gap-2">
                        <span class="text-xs font-medium text-toned">Ends at</span>
                        <input
                          v-model="item.endsAt"
                          type="datetime-local"
                          class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-3 py-2 text-sm text-highlighted outline-none"
                        >
                      </label>
                    </div>
                  </div>

                  <div class="flex w-11 items-center justify-center self-center">
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
                  </div>
                </div>
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
        </div>
      </AppCard>

      <AppCard
        v-if="showProgramIdentitySection"
        id="admin-config-identity"
        class="scroll-mt-28 rounded-xl hackathon-workspace-detail-panel"
      >
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Program Identity
            </h2>
            <p class="text-sm text-muted">
              {{ programIdentityDescription }}
            </p>
          </div>
        </template>

        <div class="grid gap-5">
          <div class="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.6fr)]">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">City</span>
              <input
                v-model="form.city"
                type="text"
                class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                placeholder="Vienna"
                required
              >
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Country</span>
              <div class="relative">
                <select
                  v-model="form.country"
                  class="w-full appearance-none rounded-lg border border-black/8 bg-white py-3 pl-4 pr-11 text-sm text-highlighted outline-none focus:border-black/25 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
                  required
                >
                  <option
                    disabled
                    value=""
                  >
                    Select a country
                  </option>
                  <option
                    v-for="option in countryOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <AppIcon
                  name="i-lucide-chevron-down"
                  class="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted"
                />
              </div>
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Address</span>
              <input
                v-model="form.address"
                type="text"
                class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
                placeholder="Operngasse 20, 1040 Vienna"
                required
              >
            </label>
          </div>

          <section
            v-if="showBackgroundImageSection"
            class="grid gap-3"
          >
            <div class="space-y-1">
              <h3 class="text-sm font-medium text-toned">
                Background image
              </h3>
              <p class="text-xs text-muted">
                Managed image upload only. JPG/PNG up to 1mb.
              </p>
            </div>

            <div class="overflow-hidden rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111]">
              <img
                v-if="managedBackgroundImageUrl"
                :src="managedBackgroundImageUrl"
                alt="Hackathon background preview"
                class="h-36 w-full object-cover"
              >
              <div
                v-else
                class="flex h-36 items-center justify-center px-4 text-center text-sm text-muted"
              >
                No background image uploaded yet.
              </div>
            </div>

            <div
              v-if="props.canUploadManagedImages"
              class="flex flex-wrap items-center gap-2"
            >
              <input
                ref="backgroundImageInput"
                type="file"
                accept="image/jpeg,image/png"
                class="sr-only"
                :disabled="props.backgroundImageUploadPending"
                @change="uploadBackgroundImage"
              >
              <AppButton
                type="button"
                color="neutral"
                variant="soft"
                size="sm"
                :disabled="props.backgroundImageUploadPending"
                @click="promptBackgroundImageUpload"
              >
                {{ managedBackgroundImageUrl ? 'Replace background image' : 'Upload background image' }}
              </AppButton>
              <AppButton
                v-if="managedBackgroundImageUrl"
                type="button"
                color="neutral"
                variant="soft"
                size="sm"
                :disabled="props.backgroundImageUploadPending"
                @click="emit('removeBackgroundImage')"
              >
                Remove uploaded background
              </AppButton>
            </div>
            <p
              v-else
              class="text-xs text-muted"
            >
              Save the draft first to enable managed background uploads.
            </p>

            <p
              v-if="props.backgroundImageUploadSuccess"
              class="text-xs text-success"
            >
              {{ props.backgroundImageUploadSuccess }}
            </p>
            <p
              v-if="props.backgroundImageUploadError"
              class="text-xs text-error"
            >
              {{ props.backgroundImageUploadError }}
            </p>
          </section>

          <section
            v-if="showBannerImageSection"
            class="grid gap-3"
          >
            <div class="space-y-1">
              <h3 class="text-sm font-medium text-toned">
                Banner image
              </h3>
              <p class="text-xs text-muted">
                Managed image upload only. JPG/PNG up to 1mb.
              </p>
            </div>

            <div class="overflow-hidden rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111]">
              <img
                v-if="managedBannerImageUrl"
                :src="managedBannerImageUrl"
                alt="Hackathon banner preview"
                class="h-36 w-full object-cover"
              >
              <div
                v-else
                class="flex h-36 items-center justify-center px-4 text-center text-sm text-muted"
              >
                No banner image uploaded yet.
              </div>
            </div>

            <div
              v-if="props.canUploadManagedImages"
              class="flex flex-wrap items-center gap-2"
            >
              <input
                ref="bannerImageInput"
                type="file"
                accept="image/jpeg,image/png"
                class="sr-only"
                :disabled="props.bannerImageUploadPending"
                @change="uploadBannerImage"
              >
              <AppButton
                type="button"
                color="neutral"
                variant="soft"
                size="sm"
                :disabled="props.bannerImageUploadPending"
                @click="promptBannerImageUpload"
              >
                {{ managedBannerImageUrl ? 'Replace banner image' : 'Upload banner image' }}
              </AppButton>
              <AppButton
                v-if="managedBannerImageUrl"
                type="button"
                color="neutral"
                variant="soft"
                size="sm"
                :disabled="props.bannerImageUploadPending"
                @click="emit('removeBannerImage')"
              >
                Remove uploaded banner
              </AppButton>
            </div>
            <p
              v-else
              class="text-xs text-muted"
            >
              Save the draft first to enable managed banner uploads.
            </p>

            <p
              v-if="props.bannerImageUploadSuccess"
              class="text-xs text-success"
            >
              {{ props.bannerImageUploadSuccess }}
            </p>
            <p
              v-if="props.bannerImageUploadError"
              class="text-xs text-error"
            >
              {{ props.bannerImageUploadError }}
            </p>
          </section>

          <div
            v-if="showInlineDetailsActions"
            class="flex flex-col gap-4 border-t border-black/8 pt-5 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="max-w-3xl space-y-3">
              <p class="text-sm text-muted">
                {{ helperText ?? 'Save your changes to update this hackathon.' }}
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
      </AppCard>
    </section>

    <section
      v-if="showProgramSettingsSections"
      class="space-y-6"
    >
      <AppCard
        id="admin-config-timeline"
        class="scroll-mt-28 rounded-xl hackathon-workspace-detail-panel"
      >
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Timeline
            </h2>
            <p class="text-sm text-muted">
              Registration must close before submission opens, and submission must close before judging preparation can begin.
            </p>
          </div>
        </template>

        <div class="grid gap-5 md:grid-cols-2">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Registration opens</span>
            <input
              v-model="form.registrationOpensAt"
              type="datetime-local"
              class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
              required
            >
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Registration closes</span>
            <input
              v-model="form.registrationClosesAt"
              type="datetime-local"
              class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
              required
            >
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Submission opens</span>
            <input
              v-model="form.submissionOpensAt"
              type="datetime-local"
              class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
              required
            >
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Submission closes</span>
            <input
              v-model="form.submissionClosesAt"
              type="datetime-local"
              class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
              required
            >
          </label>
        </div>
      </AppCard>

      <AppCard
        id="admin-config-rules"
        class="scroll-mt-28 rounded-xl hackathon-workspace-detail-panel"
      >
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Participation Rules
            </h2>
            <p class="text-sm text-muted">
              Choose team limits and required profile fields for applicants.
            </p>
          </div>
        </template>

        <div class="grid gap-5">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Maximum team members</span>
            <input
              v-model.number="form.maxTeamMembers"
              type="number"
              min="1"
              class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
              required
            >
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Participants limit</span>
            <input
              v-model="participantsLimitInput"
              type="number"
              min="1"
              class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
              placeholder="Leave empty for no limit"
            >
            <span class="text-xs text-muted">Maximum approved participants for the hackathon. Leave blank for no cap.</span>
          </label>

          <div class="grid gap-3">
            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.inPersonEvent"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              In-person event (require in-person attendance commitment at registration)
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireChatgptEmail"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require ChatGPT email for applications
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireOpenaiOrgId"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require OpenAI org ID for applications
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireLumaProfile"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require Luma username for applications
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireWhyThisHackathon"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require "Why this hackathon" in applications
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireProofOfExecution"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require proof-of-execution links in applications
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireLinkedinProfile"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require LinkedIn profile for applications
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireGithubProfile"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require GitHub profile for applications
            </label>

            <label class="flex items-center gap-3 rounded-lg border border-black/8 px-4 py-3 text-sm text-toned dark:border-white/[0.08]">
              <input
                v-model="form.requireXProfile"
                type="checkbox"
                class="size-4 rounded border-black/20 dark:border-white/[0.3]"
              >
              Require X profile for applications
            </label>
          </div>
        </div>
      </AppCard>
    </section>

    <div
      v-if="!showInlineDetailsActions"
      class="hackathon-workspace-detail-inset flex flex-col gap-4 rounded-xl px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="max-w-3xl text-sm text-muted">
        {{ helperText ?? 'Save your changes to update this hackathon.' }}
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
