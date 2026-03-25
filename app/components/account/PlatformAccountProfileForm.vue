<script setup lang="ts">
interface PlatformAccountProfileFormModel {
  displayName: string
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
</script>

<template>
  <form
    class="space-y-5"
    @submit.prevent="emit('submit')"
  >
    <div class="space-y-2">
      <label
        class="text-sm font-medium text-highlighted"
        for="account-display-name"
      >
        Display name
      </label>
      <input
        id="account-display-name"
        v-model="model.displayName"
        type="text"
        required
        class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
      >
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
          type="url"
          placeholder="https://github.com/your-name"
          class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
        >
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
          type="url"
          placeholder="https://linkedin.com/in/your-name"
          class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
        >
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
      >
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
        class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
      >
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
      >
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
        type="url"
        placeholder="https://x.com/your-name"
        class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
      >
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
