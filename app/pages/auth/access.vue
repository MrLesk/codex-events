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
  <AppContainer class="py-12">
    <PageSection
      title="Sign in or create your platform account"
      description="Use the app-owned entry flow to inspect current platform documents before continuing into Auth0 or finalizing platform registration."
    >
      <div
        v-if="pagePending"
        class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
      >
        <div class="h-72 rounded-[2rem] border border-default bg-elevated/70" />
        <div class="h-72 rounded-[2rem] border border-default bg-elevated/70" />
      </div>

      <div
        v-else
        class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
      >
        <AppCard class="rounded-[2rem] border border-default/80 bg-elevated/85 shadow-xl shadow-primary/5">
          <template #header>
            <div class="space-y-2">
              <AppBadge
                color="primary"
                variant="subtle"
              >
                Auth0 access
              </AppBadge>
              <p class="text-2xl font-semibold text-highlighted">
                Keep sign-in and platform registration distinct.
              </p>
              <p class="text-sm text-muted">
                Auth0 confirms identity. The platform still records the product-specific account and the exact document versions accepted for platform use.
              </p>
            </div>
          </template>

          <AppAlert
            v-if="deletedMessage"
            color="warning"
            variant="subtle"
            :description="deletedMessage"
            class="mb-4"
          />

          <AppAlert
            v-if="registrationSuccess"
            color="success"
            variant="subtle"
            :description="registrationSuccess"
            class="mb-4"
          />

          <dl
            v-if="identitySummaryRows.length > 0"
            class="grid gap-4"
          >
            <div
              v-for="row in identitySummaryRows"
              :key="row.label"
              class="app-inset-choice p-4"
            >
              <dt class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                {{ row.label }}
              </dt>
              <dd class="mt-2 break-all text-sm text-toned">
                {{ row.value }}
              </dd>
            </div>
          </dl>

          <div
            v-else
            class="space-y-4"
          >
            <p class="text-sm leading-7 text-toned">
              Existing users can sign in without accepting documents again. New users can review the current privacy policy and platform terms here before the Auth0 round-trip.
            </p>

            <AppButton
              :to="signInHref"
              external
              size="lg"
              color="neutral"
              label="Continue to sign in"
            />
          </div>
        </AppCard>

        <AppCard class="rounded-[2rem] border border-default/80 bg-elevated/90 shadow-xl shadow-primary/5">
          <template #header>
            <div class="space-y-2">
              <p class="text-lg font-semibold text-highlighted">
                Platform registration
              </p>
              <p class="text-sm text-muted">
                Review the current platform documents, optionally add platform profile fields, and accept both before continuing with account creation.
              </p>
            </div>
          </template>

          <div class="space-y-5">
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2">
                <span class="text-sm font-medium text-toned">ChatGPT email</span>
                <input
                  v-model="registrationForm.chatgptEmail"
                  type="email"
                  placeholder="you@example.com"
                  class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                >
              </label>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-toned">OpenAI org ID</span>
                <input
                  v-model="registrationForm.openaiOrgId"
                  type="text"
                  placeholder="org_1234567890"
                  class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary"
                >
              </label>
            </div>

            <div class="grid gap-4">
              <label class="app-inset-choice p-4">
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

              <label class="app-inset-choice p-4">
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

            <AppAlert
              v-if="registrationError"
              color="error"
              variant="subtle"
              :description="registrationError"
            />

            <div class="flex items-center justify-between gap-4">
              <p class="max-w-md text-sm text-toned">
                The exact current document versions are recorded in platform data only after the authenticated registration step succeeds.
              </p>

              <AppButton
                v-if="actor.kind === 'authenticated_identity'"
                :loading="isSubmitting"
                size="lg"
                label="Create platform account"
                @click="continueAuthenticatedRegistration"
              />

              <AppButton
                v-else
                :loading="isSubmitting"
                size="lg"
                :label="currentMode === 'register' ? 'Continue to Auth0' : 'Register with Auth0'"
                @click="continueToAuth0Registration"
              />
            </div>
          </div>
        </AppCard>
      </div>
    </PageSection>
  </AppContainer>
</template>
