<script setup lang="ts">
import type { HackathonFormState } from '~/utils/admin-workspace'

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
  canUploadManagedImages?: boolean
  backgroundImageUploadPending?: boolean
  backgroundImageUploadSuccess?: string
  backgroundImageUploadError?: string
  bannerImageUploadPending?: boolean
  bannerImageUploadSuccess?: string
  bannerImageUploadError?: string
}>()

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
</script>

<template>
  <form
    class="space-y-8"
    @submit.prevent="emit('submit')"
  >
    <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <AppCard class="border border-default/70 bg-elevated/90">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Basic Information
            </h2>
            <p class="text-sm text-muted">
              Define the canonical public metadata and schedule that the backend already validates.
            </p>
          </div>
        </template>

        <div class="grid gap-5">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Hackathon name</span>
            <input
              v-model="form.name"
              type="text"
              class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none focus:border-primary"
              placeholder="Codex Spring Builders 2026"
              required
            >
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Slug</span>
            <input
              v-model="form.slug"
              type="text"
              class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none focus:border-primary"
              placeholder="codex-spring-builders-2026"
              required
            >
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Description</span>
            <textarea
              v-model="form.description"
              rows="6"
              class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none focus:border-primary"
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
                @click="addAgendaItem"
              >
                Add item
              </AppButton>
            </div>

            <p class="text-xs text-muted">
              Agenda items are structured records used for public schedule rendering and admin editing.
            </p>

            <div
              v-if="form.agendaItems.length === 0"
              class="rounded-xl border border-dashed border-default/80 px-4 py-3 text-sm text-muted"
            >
              No agenda items yet.
            </div>

            <div
              v-for="item in form.agendaItems"
              :key="item.id"
              class="grid gap-3 rounded-xl border border-default/70 bg-default/30 p-4"
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
                    class="app-inset-field px-3 py-2 text-sm text-highlighted outline-none focus:border-primary"
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
                    class="app-inset-field px-3 py-2 text-sm text-highlighted outline-none focus:border-primary"
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
                    class="app-inset-field px-3 py-2 text-sm text-highlighted outline-none focus:border-primary"
                    required
                  >
                </label>

                <label class="grid gap-2">
                  <span class="text-xs font-medium text-toned">Ends at</span>
                  <input
                    v-model="item.endsAt"
                    type="datetime-local"
                    class="app-inset-field px-3 py-2 text-sm text-highlighted outline-none focus:border-primary"
                  >
                </label>
              </div>

              <label class="grid gap-2">
                <span class="text-xs font-medium text-toned">Details</span>
                <textarea
                  v-model="item.details"
                  rows="3"
                  class="app-inset-field px-3 py-2 text-sm text-highlighted outline-none focus:border-primary"
                  placeholder="Optional notes for this agenda item."
                />
              </label>
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard class="border border-default/70 bg-elevated/90">
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
              class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none focus:border-primary"
              placeholder="Vienna"
              required
            >
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Address</span>
            <input
              v-model="form.address"
              type="text"
              class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none focus:border-primary"
              placeholder="Operngasse 20, 1040 Vienna"
              required
            >
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Background image URL</span>
            <input
              v-model="form.backgroundImageUrl"
              type="url"
              class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none focus:border-primary"
              placeholder="https://images.example.com/background.jpg"
            >

            <div
              v-if="props.canUploadManagedImages"
              class="flex flex-wrap items-center gap-2"
            >
              <input
                type="file"
                accept="image/jpeg,image/png"
                class="block w-full text-sm text-toned file:mr-3 file:rounded-md file:border file:border-default file:bg-elevated file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-highlighted"
                :disabled="props.backgroundImageUploadPending"
                @change="uploadBackgroundImage"
              >
              <AppButton
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
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Banner image URL</span>
            <input
              v-model="form.bannerImageUrl"
              type="url"
              class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none focus:border-primary"
              placeholder="https://images.example.com/banner.jpg"
            >

            <div
              v-if="props.canUploadManagedImages"
              class="flex flex-wrap items-center gap-2"
            >
              <input
                type="file"
                accept="image/jpeg,image/png"
                class="block w-full text-sm text-toned file:mr-3 file:rounded-md file:border file:border-default file:bg-elevated file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-highlighted"
                :disabled="props.bannerImageUploadPending"
                @change="uploadBannerImage"
              >
              <AppButton
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
          </label>
        </div>
      </AppCard>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <AppCard class="border border-default/70 bg-elevated/90">
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
              class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none focus:border-primary"
              required
            >
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Registration closes</span>
            <input
              v-model="form.registrationClosesAt"
              type="datetime-local"
              class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none focus:border-primary"
              required
            >
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Submission opens</span>
            <input
              v-model="form.submissionOpensAt"
              type="datetime-local"
              class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none focus:border-primary"
              required
            >
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Submission closes</span>
            <input
              v-model="form.submissionClosesAt"
              type="datetime-local"
              class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none focus:border-primary"
              required
            >
          </label>
        </div>
      </AppCard>

      <AppCard class="border border-default/70 bg-elevated/90">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Participation Rules
            </h2>
            <p class="text-sm text-muted">
              Keep the model simple and aligned with the canonical hackathon configuration.
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
              class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none focus:border-primary"
              required
            >
          </label>

          <div class="grid gap-3">
            <label class="flex items-center gap-3 app-inset-choice px-4 py-3 text-sm text-toned">
              <input
                v-model="form.requireXProfile"
                type="checkbox"
                class="size-4 rounded border-default"
              >
              Require X profile for applications
            </label>

            <label class="flex items-center gap-3 app-inset-choice px-4 py-3 text-sm text-toned">
              <input
                v-model="form.requireLinkedinProfile"
                type="checkbox"
                class="size-4 rounded border-default"
              >
              Require LinkedIn profile for applications
            </label>

            <label class="flex items-center gap-3 app-inset-choice px-4 py-3 text-sm text-toned">
              <input
                v-model="form.requireGithubProfile"
                type="checkbox"
                class="size-4 rounded border-default"
              >
              Require GitHub profile for applications
            </label>

            <label class="flex items-center gap-3 app-inset-choice px-4 py-3 text-sm text-toned">
              <input
                v-model="form.requireChatgptEmail"
                type="checkbox"
                class="size-4 rounded border-default"
              >
              Require ChatGPT email for applications
            </label>

            <label class="flex items-center gap-3 app-inset-choice px-4 py-3 text-sm text-toned">
              <input
                v-model="form.requireOpenaiOrgId"
                type="checkbox"
                class="size-4 rounded border-default"
              >
              Require OpenAI org ID for applications
            </label>

            <label class="flex items-center gap-3 app-inset-choice px-4 py-3 text-sm text-toned">
              <input
                v-model="form.requireLumaProfile"
                type="checkbox"
                class="size-4 rounded border-default"
              >
              Require Luma username for applications
            </label>
          </div>
        </div>
      </AppCard>
    </section>

    <div class="flex flex-col gap-3 rounded-[1.75rem] border border-default/80 bg-elevated/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p class="max-w-3xl text-sm text-muted">
        {{ helperText ?? 'Changes are written through the canonical admin API endpoints and validated against the documented lifecycle constraints.' }}
      </p>

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
