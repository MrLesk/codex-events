<script setup lang="ts">
import type { HackathonFormState } from '~/utils/admin-workspace'

const form = defineModel<HackathonFormState>('form', {
  required: true
})

defineProps<{
  isSubmitting?: boolean
  submitLabel: string
  helperText?: string
}>()

defineEmits<{
  submit: []
}>()
</script>

<template>
  <form
    class="space-y-8"
    @submit.prevent="$emit('submit')"
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
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Banner image URL</span>
            <input
              v-model="form.bannerImageUrl"
              type="url"
              class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none focus:border-primary"
              placeholder="https://images.example.com/banner.jpg"
            >
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
