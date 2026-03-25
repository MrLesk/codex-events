<script setup lang="ts">
import type { FetchError } from 'ofetch'

import {
  buildAccountOnboardingHref,
  buildAuthLoginHref,
  normalizeAuthReturnTo
} from '~/utils/auth-navigation'

interface ApiErrorResponse {
  error?: {
    message?: string
  }
}

const route = useRoute()
const {
  actor,
  refresh: refreshActor,
  isResolvingActor
} = useShellNavigation()
const {
  privacyPolicyDocument,
  platformTermsDocument,
  status: documentsStatus
} = await useCurrentPlatformDocuments()

const registrationForm = reactive({
  acceptPrivacyPolicy: false,
  acceptPlatformTerms: false
})

const requestedReturnTo = computed(() => normalizeAuthReturnTo(
  typeof route.query.returnTo === 'string' ? route.query.returnTo : null,
  '/dashboard'
))
const postRegistrationDestination = computed(() => {
  if (requestedReturnTo.value.startsWith('/auth/') || requestedReturnTo.value.startsWith('/onboarding/')) {
    return '/dashboard'
  }

  return requestedReturnTo.value
})
const onboardingProfileHref = computed(() => buildAccountOnboardingHref(postRegistrationDestination.value))
const pagePending = computed(() => documentsStatus.value === 'pending' || isResolvingActor.value)
const deletedMessage = computed(() => route.query.deleted === '1'
  ? 'The platform account was deleted. You can recreate it with the same authenticated identity.'
  : null)
const registrationError = ref<string | null>(null)
const isSubmitting = ref(false)

const identitySummaryRows = computed(() => {
  if (actor.value.kind !== 'authenticated_identity') {
    return []
  }

  return [{
    label: 'Authenticated email',
    value: actor.value.sessionUser.email ?? 'Unavailable from the identity provider'
  }, {
    label: 'Auth0 subject',
    value: actor.value.sessionUser.sub
  }, {
    label: 'Requested destination',
    value: postRegistrationDestination.value
  }]
})

function getRegistrationErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const apiError = error as FetchError<ApiErrorResponse> | Error

    if ('data' in apiError && apiError.data?.error?.message) {
      return apiError.data.error.message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Unable to continue platform onboarding.'
}

async function registerPlatformAccount(privacyPolicyDocumentId: string, platformTermsDocumentId: string) {
  registrationError.value = null
  isSubmitting.value = true

  try {
    await $fetch('/api/account/registration', {
      method: 'POST',
      body: {
        privacyPolicyDocumentId,
        platformTermsDocumentId
      }
    })
    await refreshActor()
    await navigateTo(onboardingProfileHref.value)
  } catch (error) {
    registrationError.value = getRegistrationErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}

async function continueAuthenticatedRegistration() {
  if (!privacyPolicyDocument.value || !platformTermsDocument.value) {
    registrationError.value = 'The current platform documents are unavailable. Try again once the documents are configured.'
    return
  }

  if (!registrationForm.acceptPrivacyPolicy || !registrationForm.acceptPlatformTerms) {
    registrationError.value = 'You must accept the current privacy policy and platform terms before continuing.'
    return
  }

  await registerPlatformAccount(privacyPolicyDocument.value.id, platformTermsDocument.value.id)
}

watchEffect(async () => {
  if (isResolvingActor.value) {
    return
  }

  if (actor.value.kind === 'anonymous') {
    await navigateTo(buildAuthLoginHref(route.fullPath), { external: true })
    return
  }

  if (actor.value.kind === 'platform_user') {
    if (actor.value.onboardingState === 'profile_pending') {
      await navigateTo(onboardingProfileHref.value)
      return
    }

    await navigateTo(postRegistrationDestination.value)
  }
})

useSeoMeta({
  title: 'Accept Platform Documents | Codex Hackathons',
  description: 'Accept the current platform privacy policy and platform terms to continue onboarding.'
})
</script>

<template>
  <div class="pb-24">
    <section class="border-b border-black/8 bg-white dark:border-white/[0.08] dark:bg-black">
      <AppContainer class="max-w-[68rem] pt-3 pb-6">
        <NuxtLink
          :to="requestedReturnTo"
          class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-600 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
        >
          <AppIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          Back
        </NuxtLink>

        <div class="mt-5 max-w-[56rem] space-y-3">
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              Accept the current platform documents
            </h1>
            <span class="rounded-full bg-black/6 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-neutral-600 dark:bg-white/[0.05] dark:text-[#8C8C8C]">
              Step 1 of 2
            </span>
          </div>

          <p class="text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
            The Auth0 session is active. Before the workspace opens, the platform must record exact acceptance of the current privacy policy and platform terms, then route you to the profile step.
          </p>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] space-y-6 pt-6">
      <AppAlert
        v-if="deletedMessage"
        color="warning"
        variant="subtle"
        :description="deletedMessage"
      />

      <div
        v-if="pagePending"
        class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
      >
        <div class="h-64 rounded-xl border border-black/8 bg-[#F7F7F8] dark:border-white/[0.08] dark:bg-[#111111]" />
        <div class="h-64 rounded-xl border border-black/8 bg-[#F7F7F8] dark:border-white/[0.08] dark:bg-[#111111]" />
      </div>

      <div
        v-else-if="actor.kind === 'authenticated_identity'"
        class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
      >
        <section class="rounded-xl border border-black/8 bg-[#F7F7F8] p-6 dark:border-white/[0.08] dark:bg-[#111111]">
          <div class="space-y-2">
            <p class="text-[14px] font-medium text-neutral-500 dark:text-[#A3A3A3]">
              Session summary
            </p>
            <div class="text-[16px] text-highlighted dark:text-white">
              Authenticated identity ready for platform onboarding.
            </div>
            <p class="text-[14px] leading-relaxed text-neutral-500 dark:text-[#A3A3A3]">
              This route exists only for the document-acceptance step. Once accepted, the next screen completes the reusable platform profile fields.
            </p>
          </div>

          <div class="mt-5 space-y-3">
            <div
              v-for="row in identitySummaryRows"
              :key="row.label"
              class="rounded-lg border border-black/8 bg-white px-4 py-3 dark:border-white/[0.08] dark:bg-[#181818]"
            >
              <dt class="text-[12px] font-medium text-neutral-500 dark:text-[#8C8C8C]">
                {{ row.label }}
              </dt>
              <dd class="mt-2 break-all text-[14px] text-highlighted dark:text-white">
                {{ row.value }}
              </dd>
            </div>
          </div>
        </section>

        <section class="rounded-xl border border-black/8 bg-[#F7F7F8] p-6 dark:border-white/[0.08] dark:bg-[#111111]">
          <div class="space-y-2">
            <h2 class="text-[16px] font-medium text-highlighted dark:text-white">
              Exact-version acceptance
            </h2>
            <p class="text-[14px] leading-relaxed text-neutral-500 dark:text-[#A3A3A3]">
              Accept both current documents to create the platform account and continue to profile completion.
            </p>
          </div>

          <div class="mt-6 space-y-5">
            <div class="grid gap-4">
              <label class="rounded-lg border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#181818]">
                <div class="flex items-start gap-3">
                  <input
                    v-model="registrationForm.acceptPrivacyPolicy"
                    type="checkbox"
                    class="mt-1 size-4 rounded border-default"
                  >
                  <div class="space-y-1">
                    <span class="text-sm font-medium text-highlighted dark:text-white">
                      Accept {{ privacyPolicyDocument?.title ?? 'Privacy Policy' }}
                    </span>
                    <p class="text-sm text-neutral-500 dark:text-[#A3A3A3]">
                      Version {{ privacyPolicyDocument?.version ?? 'n/a' }}
                    </p>
                    <details
                      v-if="privacyPolicyDocument"
                      class="text-sm text-toned"
                    >
                      <summary class="cursor-pointer font-medium text-primary">
                        Review document content
                      </summary>
                      <pre class="mt-3 whitespace-pre-wrap rounded-lg border border-black/8 bg-[#F7F7F8] p-4 text-xs text-toned dark:border-white/[0.08] dark:bg-[#111111]">{{ privacyPolicyDocument.content }}</pre>
                    </details>
                  </div>
                </div>
              </label>

              <label class="rounded-lg border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#181818]">
                <div class="flex items-start gap-3">
                  <input
                    v-model="registrationForm.acceptPlatformTerms"
                    type="checkbox"
                    class="mt-1 size-4 rounded border-default"
                  >
                  <div class="space-y-1">
                    <span class="text-sm font-medium text-highlighted dark:text-white">
                      Accept {{ platformTermsDocument?.title ?? 'Platform Terms' }}
                    </span>
                    <p class="text-sm text-neutral-500 dark:text-[#A3A3A3]">
                      Version {{ platformTermsDocument?.version ?? 'n/a' }}
                    </p>
                    <details
                      v-if="platformTermsDocument"
                      class="text-sm text-toned"
                    >
                      <summary class="cursor-pointer font-medium text-primary">
                        Review document content
                      </summary>
                      <pre class="mt-3 whitespace-pre-wrap rounded-lg border border-black/8 bg-[#F7F7F8] p-4 text-xs text-toned dark:border-white/[0.08] dark:bg-[#111111]">{{ platformTermsDocument.content }}</pre>
                    </details>
                  </div>
                </div>
              </label>
            </div>

            <AppAlert
              v-if="registrationError"
              color="error"
              variant="subtle"
              :description="registrationError"
            />

            <div class="flex flex-col gap-4 border-t border-black/8 pt-5 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
              <p class="max-w-md text-[14px] leading-relaxed text-neutral-500 dark:text-[#A3A3A3]">
                Saving this step records the exact current document versions and advances the session into the profile-completion step.
              </p>

              <AppButton
                :loading="isSubmitting"
                color="neutral"
                variant="solid"
                class="h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                label="Accept and continue"
                @click="continueAuthenticatedRegistration"
              />
            </div>
          </div>
        </section>
      </div>
    </AppContainer>
  </div>
</template>
