<script setup lang="ts">
interface AccountSettingsProfileFormModel {
  displayName: string
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
}>(), {
  pending: false,
  error: '',
  submitLabel: 'Save changes'
})

const emit = defineEmits<{
  submit: []
}>()
</script>

<template>
  <form
    class="space-y-6"
    @submit.prevent="emit('submit')"
  >
    <section class="rounded-xl border border-default/70 bg-default/45 p-5">
      <div class="mb-4 flex items-center gap-2">
        <AppIcon
          name="i-lucide-user"
          class="size-4 text-muted"
        />
        <p class="text-sm font-semibold text-highlighted">
          Profile information
        </p>
      </div>

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
          class="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm text-toned outline-none transition focus:border-primary"
        >
      </div>
    </section>

    <section class="rounded-xl border border-default/70 bg-default/45 p-5">
      <div class="mb-4 flex items-center gap-2">
        <AppIcon
          name="i-lucide-globe"
          class="size-4 text-muted"
        />
        <p class="text-sm font-semibold text-highlighted">
          Social profiles
        </p>
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
            class="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm text-toned outline-none transition focus:border-primary"
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
            class="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm text-toned outline-none transition focus:border-primary"
          >
        </div>

        <div class="space-y-2 md:col-span-2">
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
            class="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm text-toned outline-none transition focus:border-primary"
          >
        </div>
      </div>
    </section>

    <section class="rounded-xl border border-default/70 bg-default/45 p-5">
      <div class="mb-4 flex items-center gap-2">
        <AppIcon
          name="i-lucide-id-card"
          class="size-4 text-muted"
        />
        <p class="text-sm font-semibold text-highlighted">
          Hackathon profile fields
        </p>
      </div>

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
            class="w-full rounded-lg border border-default bg-elevated px-3 py-2.5 text-sm text-toned outline-none transition focus:border-primary"
          >
        </div>

        <div class="space-y-2 md:col-span-2">
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
          >
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
