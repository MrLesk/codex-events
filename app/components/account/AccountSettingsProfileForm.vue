<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

import { accountProfileFormSchema } from '~/utils/form-schemas'
import { cloneFormValues } from '~/utils/form-values'

interface AccountSettingsProfileFormModel {
  firstName: string
  familyName: string
  xProfileUrl: string
  linkedinProfileUrl: string
  githubProfileUrl: string
  chatgptEmail: string
  openaiOrgId: string
  lumaUsername: string
}

const model = defineModel<AccountSettingsProfileFormModel>({ required: true })

withDefaults(defineProps<{
  pending?: boolean
  error?: string
  submitLabel?: string
  hideProfileInformation?: boolean
}>(), {
  pending: false,
  error: '',
  submitLabel: 'Save changes',
  hideProfileInformation: false
})

const emit = defineEmits<{
  submit: []
}>()

const {
  errors,
  submitCount,
  values,
  setValues,
  handleSubmit
} = useForm({
  validationSchema: toTypedSchema(accountProfileFormSchema),
  initialValues: cloneFormValues(model.value)
})

watch(() => model.value, (nextModel) => {
  setValues(cloneFormValues(nextModel), false)
}, {
  deep: true,
  immediate: true
})

watch(values, (nextValues) => {
  Object.assign(model.value, cloneFormValues(nextValues))
}, {
  deep: true
})

const submitProfileForm = handleSubmit(() => {
  emit('submit')
})
</script>

<template>
  <form
    class="space-y-6"
    @submit.prevent="submitProfileForm"
  >
    <section
      v-if="!hideProfileInformation"
      class="rounded-xl border border-default/70 bg-default/45 p-5"
    >
      <div class="mb-4 flex items-center gap-2">
        <AppIcon
          name="i-lucide-user"
          class="size-4 text-dimmed"
        />
        <p class="text-sm font-semibold text-highlighted">
          Profile information
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label
            class="text-sm font-medium text-highlighted"
            for="account-first-name"
          >
            First name
          </label>
          <input
            id="account-first-name"
            v-model="model.firstName"
            type="text"
            class="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm text-toned outline-none transition focus:border-primary"
            :class="submitCount > 0 && errors.firstName ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
          >
          <p
            v-if="submitCount > 0 && errors.firstName"
            class="text-xs text-error"
          >
            {{ errors.firstName }}
          </p>
        </div>

        <div class="space-y-2">
          <label
            class="text-sm font-medium text-highlighted"
            for="account-family-name"
          >
            Family name
          </label>
          <input
            id="account-family-name"
            v-model="model.familyName"
            type="text"
            class="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm text-toned outline-none transition focus:border-primary"
            :class="submitCount > 0 && errors.familyName ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
          >
          <p
            v-if="submitCount > 0 && errors.familyName"
            class="text-xs text-error"
          >
            {{ errors.familyName }}
          </p>
        </div>
      </div>
    </section>

    <section class="rounded-xl border border-default/70 bg-default/45 p-5">
      <div class="mb-4 flex items-center gap-2">
        <AppIcon
          name="i-lucide-globe"
          class="size-4 text-dimmed"
        />
        <p class="text-sm font-semibold text-highlighted">
          Social profiles
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label
            class="text-sm font-medium text-highlighted"
            for="account-luma-username"
          >
            Luma username
          </label>
          <input
            id="account-luma-username"
            v-model="model.lumaUsername"
            type="text"
            placeholder="your-luma-name"
            class="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm text-toned outline-none transition focus:border-primary"
            :class="submitCount > 0 && errors.lumaUsername ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
          >
          <p
            v-if="submitCount > 0 && errors.lumaUsername"
            class="text-xs text-error"
          >
            {{ errors.lumaUsername }}
          </p>
        </div>

        <div class="space-y-2">
          <label
            class="text-sm font-medium text-highlighted"
            for="account-x-profile-url"
          >
            X profile URL
          </label>
          <input
            id="account-x-profile-url"
            v-model="model.xProfileUrl"
            type="text"
            inputmode="url"
            placeholder="https://x.com/your-name"
            class="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm text-toned outline-none transition focus:border-primary"
            :class="submitCount > 0 && errors.xProfileUrl ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
          >
          <p
            v-if="submitCount > 0 && errors.xProfileUrl"
            class="text-xs text-error"
          >
            {{ errors.xProfileUrl }}
          </p>
        </div>

        <div class="space-y-2">
          <label
            class="text-sm font-medium text-highlighted"
            for="account-github-profile-url"
          >
            GitHub profile URL
          </label>
          <input
            id="account-github-profile-url"
            v-model="model.githubProfileUrl"
            type="text"
            inputmode="url"
            placeholder="https://github.com/your-name"
            class="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm text-toned outline-none transition focus:border-primary"
            :class="submitCount > 0 && errors.githubProfileUrl ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
          >
          <p
            v-if="submitCount > 0 && errors.githubProfileUrl"
            class="text-xs text-error"
          >
            {{ errors.githubProfileUrl }}
          </p>
        </div>

        <div class="space-y-2">
          <label
            class="text-sm font-medium text-highlighted"
            for="account-linkedin-profile-url"
          >
            LinkedIn profile URL
          </label>
          <input
            id="account-linkedin-profile-url"
            v-model="model.linkedinProfileUrl"
            type="text"
            inputmode="url"
            placeholder="https://linkedin.com/in/your-name"
            class="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm text-toned outline-none transition focus:border-primary"
            :class="submitCount > 0 && errors.linkedinProfileUrl ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
          >
          <p
            v-if="submitCount > 0 && errors.linkedinProfileUrl"
            class="text-xs text-error"
          >
            {{ errors.linkedinProfileUrl }}
          </p>
        </div>
      </div>
    </section>

    <section class="rounded-xl border border-default/70 bg-default/45 p-5">
      <div class="mb-4 flex items-center gap-2">
        <AppIcon
          name="i-lucide-id-card"
          class="size-4 text-dimmed"
        />
        <p class="text-sm font-semibold text-highlighted">
          Hackathon profile fields
        </p>
      </div>
      <p class="mb-4 text-xs text-muted">
        These fields might be needed to credit Codex credits for a hackathon.
      </p>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label
            class="text-sm font-medium text-highlighted"
            for="account-chatgpt-email"
          >
            ChatGPT email
          </label>
          <input
            id="account-chatgpt-email"
            v-model="model.chatgptEmail"
            type="email"
            placeholder="you@example.com"
            class="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm text-toned outline-none transition focus:border-primary"
            :class="submitCount > 0 && errors.chatgptEmail ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
          >
          <p
            v-if="submitCount > 0 && errors.chatgptEmail"
            class="text-xs text-error"
          >
            {{ errors.chatgptEmail }}
          </p>
        </div>

        <div class="space-y-2">
          <label
            class="text-sm font-medium text-highlighted"
            for="account-openai-org-id"
          >
            OpenAI org ID
          </label>
          <input
            id="account-openai-org-id"
            v-model="model.openaiOrgId"
            type="text"
            placeholder="org_1234567890"
            class="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm text-toned outline-none transition focus:border-primary"
            :class="submitCount > 0 && errors.openaiOrgId ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
          >
          <p
            v-if="submitCount > 0 && errors.openaiOrgId"
            class="text-xs text-error"
          >
            {{ errors.openaiOrgId }}
          </p>
          <p class="text-xs text-muted">
            Find your org ID at
            <a
              href="https://platform.openai.com/orgid"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-1 text-sky-700 underline-offset-2 transition-colors hover:text-sky-800 hover:underline dark:text-sky-300 dark:hover:text-sky-200"
            >
              platform.openai.com/orgid
              <AppIcon
                name="i-lucide-external-link"
                class="size-3.5"
              />
            </a>
          </p>
        </div>
      </div>
    </section>

    <AppAlert
      v-if="error"
      color="error"
      variant="subtle"
      :description="error"
    />

    <div class="flex items-center justify-end">
      <AppButton
        type="submit"
        :label="submitLabel"
        :loading="pending"
        size="lg"
      />
    </div>
  </form>
</template>
