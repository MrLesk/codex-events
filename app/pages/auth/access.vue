<script setup lang="ts">
import type { FetchError } from 'ofetch'

import {
  buildAuthAccessHref,
  buildAuthLoginHref,
  normalizeAuthReturnTo,
  type AuthAccessMode
} from '~/utils/auth-navigation'
import {
  buildPlatformRegistrationDisplayName,
  clearPlatformRegistrationIntent,
  readPlatformRegistrationIntent,
  writePlatformRegistrationIntent
} from '~/utils/platform-registration-intent'

interface ApiErrorResponse {
  error?: {
    message?: string
  }
}

const route = useRoute()
const {
  actor,
  refresh: refreshActor
} = useShellNavigation()
const {
  privacyPolicyDocument,
  platformTermsDocument,
  status: documentsStatus
} = await useCurrentPlatformDocuments()

const registrationForm = reactive({
  chatgptEmail: '',
  openaiOrgId: '',
  acceptPrivacyPolicy: false,
  acceptPlatformTerms: false
})

const currentMode = computed<AuthAccessMode>(() => route.query.mode === 'register' ? 'register' : 'signin')
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
const signInHref = computed(() => buildAuthLoginHref(requestedReturnTo.value))
const authAccessSignInHref = computed(() => buildAuthAccessHref(requestedReturnTo.value, 'signin'))
const authAccessRegisterHref = computed(() => buildAuthAccessHref(requestedReturnTo.value, 'register'))
const registerViaAuth0Href = computed(() => buildAuthLoginHref(authAccessRegisterHref.value))
const pagePending = computed(() => documentsStatus.value === 'pending')
const deletedMessage = computed(() => route.query.deleted === '1'
  ? 'The platform account was deleted. You can recreate it with the same authenticated identity.'
  : null)
const registrationError = ref<string | null>(null)
const registrationSuccess = ref<string | null>(null)
const isSubmitting = ref(false)
const hasAttemptedAutomaticRegistration = ref(false)

const identitySummaryRows = computed(() => {
  if (actor.value.kind !== 'authenticated_identity' && actor.value.kind !== 'platform_user') {
    return []
  }

  return [{
    label: 'Authenticated email',
    value: actor.value.sessionUser.email ?? 'Unavailable from the identity provider'
  }, {
    label: 'Auth0 subject',
    value: actor.value.sessionUser.sub
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

  return 'Unable to create the platform account.'
}

function buildRegistrationPayload(
  privacyPolicyDocumentId: string,
  platformTermsDocumentId: string,
  profileFields?: {
    chatgptEmail?: string | null
    openaiOrgId?: string | null
  }
) {
  if (actor.value.kind !== 'authenticated_identity') {
    return null
  }

  return {
    displayName: buildPlatformRegistrationDisplayName(actor.value.sessionUser),
    privacyPolicyDocumentId,
    platformTermsDocumentId,
    chatgptEmail: profileFields?.chatgptEmail ?? registrationForm.chatgptEmail,
    openaiOrgId: profileFields?.openaiOrgId ?? registrationForm.openaiOrgId
  }
}

async function registerPlatformAccount(
  privacyPolicyDocumentId: string,
  platformTermsDocumentId: string,
  clearIntentOnSuccess = false,
  profileFields?: {
    chatgptEmail?: string | null
    openaiOrgId?: string | null
  }
) {
  registrationError.value = null
  registrationSuccess.value = null

  const payload = buildRegistrationPayload(privacyPolicyDocumentId, platformTermsDocumentId, profileFields)

  if (!payload) {
    return
  }

  isSubmitting.value = true

  try {
    await $fetch('/api/account/registration', {
      method: 'POST',
      body: payload
    })

    if (clearIntentOnSuccess) {
      clearPlatformRegistrationIntent()
    }

    registrationSuccess.value = 'Platform account created.'
    await refreshActor()
    await navigateTo(postRegistrationDestination.value)
  } catch (error) {
    clearPlatformRegistrationIntent()
    registrationError.value = getRegistrationErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}

async function continueToAuth0Registration() {
  registrationError.value = null
  registrationSuccess.value = null

  if (!privacyPolicyDocument.value || !platformTermsDocument.value) {
    registrationError.value = 'The current platform documents are unavailable. Try again once the documents are configured.'
    return
  }

  if (!registrationForm.acceptPrivacyPolicy || !registrationForm.acceptPlatformTerms) {
    registrationError.value = 'You must accept the current privacy policy and platform terms before continuing.'
    return
  }

  writePlatformRegistrationIntent({
    privacyPolicyDocumentId: privacyPolicyDocument.value.id,
    platformTermsDocumentId: platformTermsDocument.value.id,
    chatgptEmail: registrationForm.chatgptEmail,
    openaiOrgId: registrationForm.openaiOrgId,
    returnTo: requestedReturnTo.value,
    createdAt: new Date().toISOString()
  })

  await navigateTo(registerViaAuth0Href.value, { external: true })
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
  if (actor.value.kind === 'platform_user') {
    await navigateTo(postRegistrationDestination.value)
  }
})

watchEffect(async () => {
  if (hasAttemptedAutomaticRegistration.value || documentsStatus.value === 'pending' || isSubmitting.value) {
    return
  }

  if (actor.value.kind !== 'authenticated_identity') {
    return
  }

  const registrationIntent = readPlatformRegistrationIntent()

  if (!registrationIntent) {
    return
  }

  hasAttemptedAutomaticRegistration.value = true
  await registerPlatformAccount(
    registrationIntent.privacyPolicyDocumentId,
    registrationIntent.platformTermsDocumentId,
    true,
    {
      chatgptEmail: registrationIntent.chatgptEmail,
      openaiOrgId: registrationIntent.openaiOrgId
    }
  )
})

useSeoMeta({
  title: 'Sign In Or Register | Codex Hackathons',
  description: 'Start an Auth0 session or create a platform account with exact-version platform document acceptance.'
})
</script>

<template>
  <div class="pb-24">
    <section class="border-b border-black/8 bg-white dark:border-white/[0.08] dark:bg-black">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
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

        <div class="mt-3 border-b border-black/8 pb-0 dark:border-white/[0.08]">
          <div class="space-y-2 pb-4">
            <div class="flex items-start justify-between gap-6">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-3">
                  <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                    Sign in or create your platform account
                  </h1>
                  <span class="rounded-full bg-black/6 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-neutral-600 dark:bg-white/[0.05] dark:text-[#8C8C8C]">
                    {{ currentMode === 'register' ? 'Register' : 'Sign in' }}
                  </span>
                </div>

                <p class="mt-4 max-w-[52rem] text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
                  Auth0 confirms identity. The platform still records the product-specific account and exact accepted document versions before the rest of the app becomes available.
                </p>
              </div>

              <div class="shrink-0 pt-0.5">
                <AppButton
                  :to="signInHref"
                  external
                  color="neutral"
                  variant="solid"
                  class="h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                >
                  Continue to sign in
                  <template #trailing>
                    <AppIcon
                      name="i-lucide-arrow-up-right"
                      class="size-3.5"
                    />
                  </template>
                </AppButton>
              </div>
            </div>
          </div>

          <nav
            aria-label="Platform access sections"
            role="tablist"
            class="flex items-center gap-5 overflow-x-auto"
          >
            <NuxtLink
              :to="authAccessSignInHref"
              role="tab"
              :aria-selected="currentMode === 'signin'"
              class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="currentMode === 'signin' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
            >
              Sign in
            </NuxtLink>
            <NuxtLink
              :to="authAccessRegisterHref"
              role="tab"
              :aria-selected="currentMode === 'register'"
              class="inline-flex items-center gap-2 border-b-2 pb-3 text-[14px] font-medium transition-colors"
              :class="currentMode === 'register' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
            >
              Register
              <span class="rounded-full bg-black/6 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:bg-white/[0.05] dark:text-[#8C8C8C]">
                2 steps
              </span>
            </NuxtLink>
          </nav>
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

      <AppAlert
        v-if="registrationSuccess"
        color="success"
        variant="subtle"
        :description="registrationSuccess"
      />

      <div
        v-if="pagePending"
        class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
      >
        <div class="h-64 rounded-xl border border-black/8 bg-[#F7F7F8] dark:border-white/[0.08] dark:bg-[#111111]" />
        <div class="h-64 rounded-xl border border-black/8 bg-[#F7F7F8] dark:border-white/[0.08] dark:bg-[#111111]" />
      </div>

      <div
        v-else
        class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
      >
        <section class="rounded-xl border border-black/8 bg-[#F7F7F8] p-6 dark:border-white/[0.08] dark:bg-[#111111]">
          <div class="space-y-2">
            <p class="text-[14px] font-medium text-neutral-500 dark:text-[#A3A3A3]">
              Identity status
            </p>
            <div class="text-[16px] text-highlighted dark:text-white">
              {{ identitySummaryRows.length > 0 ? 'Authenticated session detected.' : 'No platform profile exists yet.' }}
            </div>
            <p class="text-[14px] leading-relaxed text-neutral-500 dark:text-[#A3A3A3]">
              Existing users can sign in immediately. New users review the current platform documents here before the Auth0 round-trip or the final account creation step.
            </p>
          </div>

          <div
            v-if="identitySummaryRows.length > 0"
            class="mt-5 space-y-3"
          >
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

          <div
            v-else
            class="mt-5 rounded-lg border border-black/8 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-[#181818]"
          >
            <p class="text-[14px] leading-relaxed text-neutral-500 dark:text-[#A3A3A3]">
              Use the sign-in action above if you already have an Auth0 session. Stay on this page if you are reviewing documents and creating a platform account for the first time.
            </p>
          </div>
        </section>

        <section class="rounded-xl border border-black/8 bg-[#F7F7F8] p-6 dark:border-white/[0.08] dark:bg-[#111111]">
          <div class="space-y-2">
            <h2 class="text-[16px] font-medium text-highlighted dark:text-white">
              Platform registration
            </h2>
            <p class="text-[14px] leading-relaxed text-neutral-500 dark:text-[#A3A3A3]">
              Add the optional platform profile fields, review the current policy documents, and accept both before continuing.
            </p>
          </div>

          <div class="mt-6 space-y-5">
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2">
                <span class="text-sm font-medium text-toned">ChatGPT email</span>
                <input
                  v-model="registrationForm.chatgptEmail"
                  type="email"
                  placeholder="you@example.com"
                  class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/20 dark:border-white/[0.08] dark:bg-[#181818] dark:text-white dark:focus:border-white/[0.2]"
                >
              </label>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-toned">OpenAI org ID</span>
                <input
                  v-model="registrationForm.openaiOrgId"
                  type="text"
                  placeholder="org_1234567890"
                  class="rounded-lg border border-black/8 bg-white px-4 py-3 text-sm text-highlighted outline-none transition focus:border-black/20 dark:border-white/[0.08] dark:bg-[#181818] dark:text-white dark:focus:border-white/[0.2]"
                >
              </label>
            </div>

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
                The exact current document versions are recorded in platform data only after the authenticated registration step succeeds.
              </p>

              <AppButton
                v-if="actor.kind === 'authenticated_identity'"
                :loading="isSubmitting"
                color="neutral"
                variant="solid"
                class="h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                label="Create platform account"
                @click="continueAuthenticatedRegistration"
              />

              <AppButton
                v-else
                :loading="isSubmitting"
                color="neutral"
                variant="solid"
                class="h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                :label="currentMode === 'register' ? 'Continue to Auth0' : 'Register with Auth0'"
                @click="continueToAuth0Registration"
              />
            </div>
          </div>
        </section>
      </div>
    </AppContainer>
  </div>
</template>
