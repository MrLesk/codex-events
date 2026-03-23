<script setup lang="ts">
definePageMeta({
  middleware: [to => useUser().value
    ? undefined
    : navigateTo(`/auth/login?returnTo=${encodeURIComponent(to.fullPath)}`)]
})

const route = useRoute()
const { actor, status: actorStatus, refresh: refreshActor } = await useAccountLifecycleActor()
const {
  privacyPolicyDocument,
  platformTermsDocument,
  status: documentsStatus
} = await useCurrentPlatformDocuments()

if (actor.value?.hasPlatformAccount) {
  await navigateTo('/account')
}

const registrationForm = reactive({
  displayName: '',
  xProfileUrl: '',
  linkedinProfileUrl: '',
  githubProfileUrl: '',
  acceptPrivacyPolicy: false,
  acceptPlatformTerms: false
})

const submissionError = ref<string | null>(null)
const isSubmitting = ref(false)
const statusMessage = computed(() => {
  if (route.query.deleted === '1') {
    return 'The platform account was deleted. You can create a new one with the same authenticated identity.'
  }

  return null
})

watch(
  actor,
  (nextActor) => {
    if (
      !nextActor
      || nextActor.hasPlatformAccount
      || !nextActor.sessionUser
      || registrationForm.displayName
    ) {
      return
    }

    registrationForm.displayName = nextActor.sessionUser.name
      ?? nextActor.sessionUser.nickname
      ?? nextActor.sessionUser.email
      ?? ''
  },
  { immediate: true }
)

const pagePending = computed(() => actorStatus.value === 'pending' || documentsStatus.value === 'pending')
const sessionSummaryRows = computed(() => {
  if (!actor.value?.sessionUser) {
    return []
  }

  return [
    {
      label: 'Authenticated email',
      value: actor.value.sessionUser.email ?? 'Unavailable from the identity provider'
    },
    {
      label: 'Auth0 subject',
      value: actor.value.sessionUser.sub
    }
  ]
})

async function submitRegistration() {
  submissionError.value = null

  if (!privacyPolicyDocument.value || !platformTermsDocument.value) {
    submissionError.value = 'The current platform documents are unavailable. Try again once the documents are configured.'
    return
  }

  if (!registrationForm.acceptPrivacyPolicy || !registrationForm.acceptPlatformTerms) {
    submissionError.value = 'You must accept the current privacy policy and platform terms to create a platform account.'
    return
  }

  isSubmitting.value = true

  try {
    await $fetch('/api/account/registration', {
      method: 'POST',
      body: {
        displayName: registrationForm.displayName,
        privacyPolicyDocumentId: privacyPolicyDocument.value.id,
        platformTermsDocumentId: platformTermsDocument.value.id,
        xProfileUrl: registrationForm.xProfileUrl,
        linkedinProfileUrl: registrationForm.linkedinProfileUrl,
        githubProfileUrl: registrationForm.githubProfileUrl
      }
    })

    await refreshActor()
    await navigateTo('/account?created=1')
  } catch (error) {
    submissionError.value = error instanceof Error
      ? error.message
      : 'Unable to create the platform account.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UContainer class="py-12">
    <UPageSection
      title="Complete platform account"
      description="Create the platform-side account that powers hackathon applications, team membership, and role-based access."
    >
      <div
        v-if="pagePending"
        class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
      >
        <div class="h-64 rounded-[2rem] border border-default bg-elevated/70" />
        <div class="h-64 rounded-[2rem] border border-default bg-elevated/70" />
      </div>

      <div
        v-else
        class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
      >
        <UCard class="rounded-[2rem] border border-default/80 bg-elevated/85 shadow-xl shadow-primary/5">
          <template #header>
            <div class="space-y-2">
              <UBadge
                color="primary"
                variant="subtle"
              >
                Authenticated identity
              </UBadge>
              <p class="text-2xl font-semibold text-highlighted">
                Finish the platform-side setup before joining a hackathon.
              </p>
              <p class="text-sm text-muted">
                Auth0 confirms who you are. The platform account stores the profile data and document acceptance records required by the product workflows.
              </p>
            </div>
          </template>

          <UAlert
            v-if="statusMessage"
            color="warning"
            variant="subtle"
            :description="statusMessage"
            class="mb-4"
          />

          <dl class="grid gap-4">
            <div
              v-for="row in sessionSummaryRows"
              :key="row.label"
              class="rounded-2xl border border-default/70 bg-muted/40 p-4"
            >
              <dt class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                {{ row.label }}
              </dt>
              <dd class="mt-2 break-all text-sm text-toned">
                {{ row.value }}
              </dd>
            </div>
          </dl>
        </UCard>

        <UCard class="rounded-[2rem] border border-default/80 bg-elevated/90 shadow-xl shadow-primary/5">
          <template #header>
            <div class="space-y-2">
              <p class="text-lg font-semibold text-highlighted">
                Platform account registration
              </p>
              <p class="text-sm text-muted">
                Choose the display name and optional profile links that will be reused across hackathon applications.
              </p>
            </div>
          </template>

          <form
            class="space-y-5"
            @submit.prevent="submitRegistration"
          >
            <div class="space-y-2">
              <label
                class="text-sm font-medium text-highlighted"
                for="display-name"
              >
                Display name
              </label>
              <input
                id="display-name"
                v-model="registrationForm.displayName"
                type="text"
                required
                class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
              >
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <label
                  class="text-sm font-medium text-highlighted"
                  for="github-profile-url"
                >
                  GitHub profile URL
                </label>
                <input
                  id="github-profile-url"
                  v-model="registrationForm.githubProfileUrl"
                  type="url"
                  placeholder="https://github.com/your-name"
                  class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
                >
              </div>

              <div class="space-y-2">
                <label
                  class="text-sm font-medium text-highlighted"
                  for="linkedin-profile-url"
                >
                  LinkedIn profile URL
                </label>
                <input
                  id="linkedin-profile-url"
                  v-model="registrationForm.linkedinProfileUrl"
                  type="url"
                  placeholder="https://linkedin.com/in/your-name"
                  class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
                >
              </div>
            </div>

            <div class="space-y-2">
              <label
                class="text-sm font-medium text-highlighted"
                for="x-profile-url"
              >
                X profile URL
              </label>
              <input
                id="x-profile-url"
                v-model="registrationForm.xProfileUrl"
                type="url"
                placeholder="https://x.com/your-name"
                class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
              >
            </div>

            <div class="grid gap-4">
              <label class="rounded-2xl border border-default/70 bg-muted/40 p-4">
                <div class="flex items-start gap-3">
                  <input
                    v-model="registrationForm.acceptPrivacyPolicy"
                    type="checkbox"
                    class="mt-1 size-4 rounded border-default"
                  >
                  <div class="space-y-1">
                    <span class="text-sm font-medium text-highlighted">
                      Accept {{ privacyPolicyDocument?.title ?? 'Privacy Policy' }}
                    </span>
                    <p class="text-sm text-muted">
                      Version {{ privacyPolicyDocument?.version ?? 'n/a' }}
                    </p>
                    <details
                      v-if="privacyPolicyDocument"
                      class="text-sm text-toned"
                    >
                      <summary class="cursor-pointer font-medium text-primary">
                        Review document content
                      </summary>
                      <pre class="mt-3 whitespace-pre-wrap rounded-2xl bg-elevated p-4 text-xs text-toned">{{ privacyPolicyDocument.content }}</pre>
                    </details>
                  </div>
                </div>
              </label>

              <label class="rounded-2xl border border-default/70 bg-muted/40 p-4">
                <div class="flex items-start gap-3">
                  <input
                    v-model="registrationForm.acceptPlatformTerms"
                    type="checkbox"
                    class="mt-1 size-4 rounded border-default"
                  >
                  <div class="space-y-1">
                    <span class="text-sm font-medium text-highlighted">
                      Accept {{ platformTermsDocument?.title ?? 'Platform Terms' }}
                    </span>
                    <p class="text-sm text-muted">
                      Version {{ platformTermsDocument?.version ?? 'n/a' }}
                    </p>
                    <details
                      v-if="platformTermsDocument"
                      class="text-sm text-toned"
                    >
                      <summary class="cursor-pointer font-medium text-primary">
                        Review document content
                      </summary>
                      <pre class="mt-3 whitespace-pre-wrap rounded-2xl bg-elevated p-4 text-xs text-toned">{{ platformTermsDocument.content }}</pre>
                    </details>
                  </div>
                </div>
              </label>
            </div>

            <UAlert
              v-if="submissionError"
              color="error"
              variant="subtle"
              :description="submissionError"
            />

            <div class="flex items-center justify-between gap-4">
              <p class="max-w-md text-sm text-muted">
                This creates the platform `User` record and records the exact document versions accepted during registration.
              </p>

              <UButton
                type="submit"
                label="Create platform account"
                :loading="isSubmitting"
                size="lg"
              />
            </div>
          </form>
        </UCard>
      </div>
    </UPageSection>
  </UContainer>
</template>
