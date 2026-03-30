<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

import { accountProfileFormSchema } from '~/utils/form-schemas'
import { cloneFormValues } from '~/utils/form-values'

interface PlatformAccountProfileFormModel {
  firstName: string
  familyName: string
  xProfileUrl: string
  linkedinProfileUrl: string
  githubProfileUrl: string
  chatgptEmail: string
  openaiOrgId: string
  lumaUsername: string
}

const model = defineModel<PlatformAccountProfileFormModel>({ required: true })

withDefaults(defineProps<{
  pending?: boolean
  error?: string
  submitLabel?: string
  footerMessage?: string
}>(), {
  pending: false,
  error: '',
  submitLabel: 'Save profile',
  footerMessage: 'Empty fields are stored as absent values, which means hackathons that require a specific profile field will block application submission until you add it.'
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
    class="space-y-5"
    @submit.prevent="submitProfileForm"
  >
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
          class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
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
          class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
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

    <div class="grid gap-4 md:grid-cols-2">
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
          class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
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
          class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
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
        class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
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
        placeholder="org-1234567890"
        class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
        :class="submitCount > 0 && errors.openaiOrgId ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
      >
      <p
        v-if="submitCount > 0 && errors.openaiOrgId"
        class="text-xs text-error"
      >
        {{ errors.openaiOrgId }}
      </p>
    </div>

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
        class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
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
        class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
        :class="submitCount > 0 && errors.xProfileUrl ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
      >
      <p
        v-if="submitCount > 0 && errors.xProfileUrl"
        class="text-xs text-error"
      >
        {{ errors.xProfileUrl }}
      </p>
    </div>

    <AppAlert
      v-if="error"
      color="error"
      variant="subtle"
      :description="error"
    />

    <div class="flex items-center justify-between gap-4">
      <p class="max-w-md text-sm text-muted">
        {{ footerMessage }}
      </p>

      <AppButton
        type="submit"
        :label="submitLabel"
        :loading="pending"
        size="lg"
      />
    </div>
  </form>
</template>
