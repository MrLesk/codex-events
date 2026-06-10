<script setup lang="ts">
import type { ApiErrorShape } from '~/lib/api'

import { normalizeApiError } from '~/lib/api'
import {
  getAccountRegistrationMissingDocumentsCopy,
  getAccountRegistrationSubmitErrorMessage,
  getAccountRegistrationIntro,
  getIdentityEmailVerificationResendErrorMessage,
  getUnverifiedIdentityEmailMessage,
  identityEmailVerificationResentMessage,
  missingIdentityEmailMessage
} from '~/domains/accounts/registration'
import { accountDashboardHref, normalizeAuthReturnTo } from '#shared/domains/accounts/auth-navigation'

definePageMeta({
  middleware: ['require-auth']
})

const route = useRoute()
const returnTo = computed(() => normalizeAuthReturnTo(
  typeof route.query.returnTo === 'string' ? route.query.returnTo : null,
  accountDashboardHref
))
const { actor, status, refresh } = useAccountLifecycleActor()
const {
  privacyPolicyDocument,
  platformTermsDocument,
  status: documentsStatus
} = useCurrentPlatformDocuments()

const platformLegalSettingsHref = '/account/platform-settings?tab=legal'
const privacyAccepted = ref(false)
const termsAccepted = ref(false)
const submitAttempted = ref(false)
const submitState = reactive({
  pending: false,
  error: ''
})
const identityEmailVerificationState = reactive({
  pending: false,
  sent: false,
  error: ''
})

const linkingError = computed<ApiErrorShape | null>(() => {
  const errorCode = typeof route.query.linkingError === 'string'
    ? route.query.linkingError.trim()
    : ''

  if (!errorCode) {
    return null
  }

  const messages: Record<string, string> = {
    expired: 'Your account-linking session expired. Try signing in to your existing account again.',
    invalid: 'The account-linking session could not be verified. Try signing in to your existing account again.',
    login_failed: 'We could not complete the sign-in to your existing account. Try again.',
    mismatch: 'You signed in with a different account. Sign in with the existing password account for this email address instead.',
    failed: 'The login method could not be linked right now. Try signing in to your existing account again.'
  }

  return {
    code: errorCode,
    message: messages[errorCode] ?? 'The login method could not be linked right now. Try again.'
  }
})

const platformDocumentsUnavailable = computed(() =>
  !privacyPolicyDocument.value || !platformTermsDocument.value
)
const canOpenLegalSettingsForSetup = computed(() =>
  actor.value.kind === 'platform_user' && actor.value.isPlatformAdmin
)
const canCreateFirstPlatformAdminSetupAccount = computed(() =>
  actor.value.kind === 'authenticated_identity'
  && actor.value.canCreateFirstPlatformAdminSetupAccount
)
const missingDocumentsCopy = computed(() => getAccountRegistrationMissingDocumentsCopy({
  canCreateFirstPlatformAdminSetupAccount: canCreateFirstPlatformAdminSetupAccount.value,
  canOpenLegalSettingsForSetup: canOpenLegalSettingsForSetup.value
}))
const canSubmitMissingDocumentsFlow = computed(() =>
  canCreateFirstPlatformAdminSetupAccount.value || canOpenLegalSettingsForSetup.value
)
const isReadyToSubmit = computed(() =>
  !platformDocumentsUnavailable.value
  && privacyAccepted.value
  && termsAccepted.value
)
const accountRegistrationIntro = computed(() => platformDocumentsUnavailable.value
  ? missingDocumentsCopy.value.intro
  : getAccountRegistrationIntro()
)
const identityEmailUnavailable = computed(() =>
  actor.value.kind === 'authenticated_identity'
  && !actor.value.sessionUser.email?.trim()
)
const identityEmailUnverified = computed(() =>
  actor.value.kind === 'authenticated_identity'
  && Boolean(actor.value.sessionUser.email?.trim())
  && actor.value.sessionUser.email_verified !== true
)
const identityEmailVerificationMessage = computed(() =>
  actor.value.kind === 'authenticated_identity' && actor.value.sessionUser.email?.trim()
    ? getUnverifiedIdentityEmailMessage(actor.value.sessionUser.email.trim())
    : ''
)
const accountRegistrationBlocked = computed(() =>
  identityEmailUnavailable.value || identityEmailUnverified.value
)

if (
  status.value !== 'pending'
  && actor.value.kind === 'platform_user'
  && actor.value.hasAcceptedCurrentPlatformDocuments
  && !linkingError.value
) {
  await navigateTo(returnTo.value, { replace: true })
}

async function submitInitialPlatformSetupAccount() {
  if (canOpenLegalSettingsForSetup.value) {
    await navigateTo(platformLegalSettingsHref)
    return
  }

  if (
    actor.value.kind !== 'authenticated_identity'
    || !canCreateFirstPlatformAdminSetupAccount.value
  ) {
    return
  }

  if (identityEmailUnavailable.value) {
    submitState.error = missingIdentityEmailMessage
    return
  }

  if (identityEmailUnverified.value) {
    return
  }

  submitState.pending = true

  try {
    await $fetch('/api/account/registration', {
      method: 'POST',
      body: {
        returnTo: platformLegalSettingsHref
      }
    })

    await refresh()
    await navigateTo(platformLegalSettingsHref, { replace: true })
  } catch (error) {
    const apiError = normalizeApiError(error)

    submitState.error = getAccountRegistrationSubmitErrorMessage(apiError)
  } finally {
    submitState.pending = false
  }
}

async function resendIdentityEmailVerification() {
  identityEmailVerificationState.pending = true
  identityEmailVerificationState.sent = false
  identityEmailVerificationState.error = ''

  try {
    await $fetch('/api/account/email-verification', {
      method: 'POST'
    })

    identityEmailVerificationState.sent = true
  } catch (error) {
    const apiError = normalizeApiError(error)

    if (apiError.code === 'identity_email_already_verified') {
      await refresh()
      return
    }

    identityEmailVerificationState.error = getIdentityEmailVerificationResendErrorMessage(apiError)
  } finally {
    identityEmailVerificationState.pending = false
  }
}

async function submitPlatformConsent() {
  submitAttempted.value = true
  submitState.error = ''

  if (platformDocumentsUnavailable.value) {
    await submitInitialPlatformSetupAccount()
    return
  }

  if (!isReadyToSubmit.value || !privacyPolicyDocument.value || !platformTermsDocument.value) {
    return
  }

  if (identityEmailUnavailable.value) {
    submitState.error = missingIdentityEmailMessage
    return
  }

  if (identityEmailUnverified.value) {
    return
  }

  submitState.pending = true

  try {
    if (actor.value.kind === 'authenticated_identity') {
      await $fetch('/api/account/registration', {
        method: 'POST',
        body: {
          returnTo: returnTo.value,
          privacyPolicyDocumentId: privacyPolicyDocument.value.id,
          platformTermsDocumentId: platformTermsDocument.value.id
        }
      })
    } else if (actor.value.kind === 'platform_user') {
      await Promise.all([
        $fetch('/api/platform-document-acceptances', {
          method: 'POST',
          body: {
            platformDocumentId: privacyPolicyDocument.value.id
          }
        }),
        $fetch('/api/platform-document-acceptances', {
          method: 'POST',
          body: {
            platformDocumentId: platformTermsDocument.value.id
          }
        })
      ])
    }

    await refresh()
    await navigateTo(returnTo.value, { replace: true })
  } catch (error) {
    const apiError = normalizeApiError(error)

    submitState.error = getAccountRegistrationSubmitErrorMessage(apiError)
  } finally {
    submitState.pending = false
  }
}

useSeoMeta({
  title: 'Finish Setting Up Your Account | Codex Events',
  description: 'Accept the current Privacy Policy and Terms so you can continue.'
})
</script>

<template>
  <div class="pb-14">
    <section class="border-b border-black/8 dark:border-white/[0.08]">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <div class="pb-4">
          <div class="space-y-2">
            <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              {{ accountRegistrationIntro.title }}
            </h1>
            <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              {{ accountRegistrationIntro.description }}
            </p>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] space-y-6 pt-6">
      <AppAlert
        v-if="status === 'pending' || documentsStatus === 'pending'"
        color="neutral"
        variant="soft"
        title="Loading account registration"
        description="Resolving your account state and the current platform documents."
      />

      <section
        v-else-if="identityEmailUnverified"
        class="space-y-4"
      >
        <AppAlert
          color="info"
          variant="soft"
          title="Confirm your email to finish registration"
          :description="identityEmailVerificationMessage"
        />
        <AppAlert
          v-if="identityEmailVerificationState.sent"
          color="success"
          variant="soft"
          title="Confirmation email sent"
          :description="identityEmailVerificationResentMessage"
        />
        <AppAlert
          v-if="identityEmailVerificationState.error"
          color="error"
          variant="soft"
          title="Confirmation email could not be sent"
          :description="identityEmailVerificationState.error"
        />
        <div class="flex justify-end">
          <AppButton
            type="button"
            color="neutral"
            variant="solid"
            :loading="identityEmailVerificationState.pending"
            :disabled="identityEmailVerificationState.pending"
            class="rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
            @click="resendIdentityEmailVerification"
          >
            Resend confirmation email
          </AppButton>
        </div>
      </section>

      <form
        v-else-if="platformDocumentsUnavailable"
        class="space-y-4"
        @submit.prevent="submitPlatformConsent"
      >
        <AppAlert
          :color="missingDocumentsCopy.alert.color"
          variant="soft"
          :title="missingDocumentsCopy.alert.title"
          :description="missingDocumentsCopy.alert.description"
        />

        <AppAlert
          v-if="identityEmailUnavailable"
          color="warning"
          variant="soft"
          title="Email address required"
          :description="missingIdentityEmailMessage"
        />

        <AppAlert
          v-if="actor.kind === 'platform_user' && !canOpenLegalSettingsForSetup"
          color="warning"
          variant="soft"
          title="Platform admin setup required"
          description="A platform admin needs to publish the current Privacy Policy and Platform Terms before you can continue."
        />

        <AppAlert
          v-if="submitState.error"
          color="error"
          variant="soft"
          title="Setup could not be completed"
          :description="submitState.error"
        />

        <div class="space-y-3">
          <p
            v-if="missingDocumentsCopy.helperText"
            class="text-sm text-neutral-600 dark:text-[#A3A3A3]"
          >
            {{ missingDocumentsCopy.helperText }}
          </p>

          <div class="flex justify-end">
            <AppButton
              v-if="canSubmitMissingDocumentsFlow"
              type="submit"
              color="neutral"
              variant="solid"
              :loading="submitState.pending"
              :disabled="submitState.pending || accountRegistrationBlocked"
              class="rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
            >
              {{ missingDocumentsCopy.submitButtonLabel }}
            </AppButton>
          </div>
        </div>
      </form>

      <form
        v-else
        class="space-y-6"
        @submit.prevent="submitPlatformConsent"
      >
        <AppAlert
          color="info"
          variant="soft"
          title="Platform consent is required"
          description="You need current platform consent before you can use account settings, register for events, or enter participant workspaces."
        />

        <AppAlert
          v-if="linkingError"
          color="warning"
          variant="soft"
          title="Existing account sign-in required"
          :description="linkingError.message"
        />

        <AppAlert
          v-if="identityEmailUnavailable"
          color="warning"
          variant="soft"
          title="Email address required"
          :description="missingIdentityEmailMessage"
        />

        <section
          class="rounded-xl border border-black/8 bg-[#F7F7F8]/80 p-6 dark:border-white/[0.08] dark:bg-[#111111]/80"
        >
          <div class="space-y-4">
            <div class="space-y-2">
              <h2 class="text-[20px] font-medium text-highlighted dark:text-white">
                Privacy Policy
              </h2>
              <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                Version {{ privacyPolicyDocument?.version }}
              </p>
            </div>

            <AppMarkdownRenderer
              :source="privacyPolicyDocument?.content"
              normalize-escaped-newlines
              class="max-h-[24rem] overflow-y-auto rounded-lg border border-black/8 bg-white p-5 dark:border-white/[0.08] dark:bg-black/20"
            />

            <AppCheckbox
              v-model="privacyAccepted"
              :disabled="submitState.pending"
            >
              I accept the current Privacy Policy.
            </AppCheckbox>
            <p
              v-if="submitAttempted && !privacyAccepted"
              class="text-[11px] text-error"
            >
              Accept the Privacy Policy to continue.
            </p>
          </div>
        </section>

        <section
          class="rounded-xl border border-black/8 bg-[#F7F7F8]/80 p-6 dark:border-white/[0.08] dark:bg-[#111111]/80"
        >
          <div class="space-y-4">
            <div class="space-y-2">
              <h2 class="text-[20px] font-medium text-highlighted dark:text-white">
                Platform Terms
              </h2>
              <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                Version {{ platformTermsDocument?.version }}
              </p>
            </div>

            <AppMarkdownRenderer
              :source="platformTermsDocument?.content"
              normalize-escaped-newlines
              class="max-h-[24rem] overflow-y-auto rounded-lg border border-black/8 bg-white p-5 dark:border-white/[0.08] dark:bg-black/20"
            />

            <AppCheckbox
              v-model="termsAccepted"
              :disabled="submitState.pending"
            >
              I accept the current Platform Terms.
            </AppCheckbox>
            <p
              v-if="submitAttempted && !termsAccepted"
              class="text-[11px] text-error"
            >
              Accept the Platform Terms to continue.
            </p>
          </div>
        </section>

        <div class="space-y-4">
          <AppAlert
            v-if="submitState.error"
            color="error"
            variant="soft"
            title="Registration could not be completed"
            :description="submitState.error"
          />

          <div class="flex justify-end">
            <AppButton
              type="submit"
              color="neutral"
              variant="solid"
              :loading="submitState.pending"
              :disabled="submitState.pending || accountRegistrationBlocked"
              class="rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
            >
              Continue
            </AppButton>
          </div>
        </div>
      </form>
    </AppContainer>
  </div>
</template>
