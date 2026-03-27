<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

import type { HackathonFormState } from '~/utils/admin-workspace'

import { createHackathonSlug } from '~/utils/admin-workspace'
import { hackathonConfigFormSchema } from '~/utils/form-schemas'
import { cloneFormValues } from '~/utils/form-values'

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

const props = defineProps<{
  isSubmitting?: boolean
  submitLabel: string
  helperText?: string
  autoGenerateSlug?: boolean
  canUploadManagedImages?: boolean
  backgroundImageUploadPending?: boolean
  backgroundImageUploadSuccess?: string
  backgroundImageUploadError?: string
  bannerImageUploadPending?: boolean
  bannerImageUploadSuccess?: string
  bannerImageUploadError?: string
}>()

const hasManuallyEditedSlug = ref(false)
const isProgrammaticSlugUpdate = ref(false)
const backgroundImageInput = ref<HTMLInputElement | null>(null)
const bannerImageInput = ref<HTMLInputElement | null>(null)

const managedBackgroundImageUrl = computed(() => form.value.backgroundImageUrl.trim())
const managedBannerImageUrl = computed(() => form.value.bannerImageUrl.trim())
const showBackgroundImageSection = computed(() =>
  Boolean(props.canUploadManagedImages || managedBackgroundImageUrl.value)
)
const showBannerImageSection = computed(() =>
  Boolean(props.canUploadManagedImages || managedBannerImageUrl.value)
)

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
  if (form.value.agendaItems.length === 0) {
    return 1
  }

  return Math.max(...form.value.agendaItems.map(item => item.displayOrder)) + 1
}

function addAgendaItem() {
  form.value.agendaItems.push({
    id: createAgendaItemId(),
    startsAt: '',
    endsAt: '',
    title: '',
    details: '',
    displayOrder: nextAgendaDisplayOrder()
  })
}

function removeAgendaItem(itemId: string) {
  form.value.agendaItems = form.value.agendaItems.filter(item => item.id !== itemId)
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
      <AppCard class="scroll-mt-28 rounded-xl border border-black/8 bg-white/70 shadow-none dark:border-white/[0.08] dark:bg-black/36">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Basic Information
            </h2>
            <p class="text-sm text-muted">
              Set the public basics for this hackathon: name, slug, description, and agenda.
            </p>
          </div>
        </template>

        <div class="grid gap-5">
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
            <span class="text-sm font-medium text-toned">Description</span>
            <textarea
              v-model="form.description"
              rows="6"
              class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
              placeholder="Describe the event, focus areas, and expectations for participants."
              required
            />
          </label>

          <div class="grid gap-3">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm font-medium text-toned">Agenda items</span>
              <AppButton
                type="button"
                color="neutral"
                variant="soft"
                size="sm"
                class="shrink-0"
                @click="addAgendaItem"
              >
                Add item
              </AppButton>
            </div>

            <p class="text-xs text-muted">
              Agenda items appear in the public schedule.
            </p>

            <div
              v-if="form.agendaItems.length === 0"
              class="rounded-xl border border-dashed border-black/10 px-4 py-3 text-sm text-muted dark:border-white/[0.08]"
            >
              No agenda items yet.
            </div>

            <div
              v-for="item in form.agendaItems"
              :key="item.id"
              class="grid gap-3 rounded-lg border border-black/8 p-4 dark:border-white/[0.08]"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs font-medium uppercase tracking-wide text-toned">
                  Agenda item
                </p>
                <AppButton
                  type="button"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="removeAgendaItem(item.id)"
                >
                  Remove
                </AppButton>
              </div>

              <div class="grid gap-3 md:grid-cols-3">
                <label class="grid gap-2 md:col-span-2">
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
                  <span class="text-xs font-medium text-toned">Display order</span>
                  <input
                    v-model.number="item.displayOrder"
                    type="number"
                    min="0"
                    class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-3 py-2 text-sm text-highlighted outline-none"
                    required
                  >
                </label>
              </div>

              <div class="grid gap-3 md:grid-cols-2">
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

              <label class="grid gap-2">
                <span class="text-xs font-medium text-toned">Details</span>
                <textarea
                  v-model="item.details"
                  rows="3"
                  class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-3 py-2 text-sm text-highlighted outline-none"
                  placeholder="Optional notes for this agenda item."
                />
              </label>
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard
        id="admin-config-identity"
        class="scroll-mt-28 rounded-xl border border-black/8 bg-white/70 shadow-none dark:border-white/[0.08] dark:bg-black/36"
      >
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Program Identity
            </h2>
            <p class="text-sm text-muted">
              Configure location, imagery, and participant profile requirements.
            </p>
          </div>
        </template>

        <div class="grid gap-5">
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
            <span class="text-sm font-medium text-toned">Address</span>
            <input
              v-model="form.address"
              type="text"
              class="w-full rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] focus:border-black/25 dark:focus:border-white/[0.25] px-4 py-3 text-sm text-highlighted outline-none"
              placeholder="Operngasse 20, 1040 Vienna"
              required
            >
          </label>

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
        </div>
      </AppCard>
    </section>

    <section class="space-y-6">
      <AppCard
        id="admin-config-timeline"
        class="scroll-mt-28 rounded-xl border border-black/8 bg-white/70 shadow-none dark:border-white/[0.08] dark:bg-black/36"
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
        class="scroll-mt-28 rounded-xl border border-black/8 bg-white/70 shadow-none dark:border-white/[0.08] dark:bg-black/36"
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
              Require proof-of-execution URL in applications
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

    <div class="flex flex-col gap-4 rounded-xl border border-black/8 bg-white/75 px-5 py-5 dark:border-white/[0.08] dark:bg-black/36 sm:flex-row sm:items-center sm:justify-between">
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
