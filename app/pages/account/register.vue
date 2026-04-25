<script setup lang="ts">
import type { ApiErrorShape } from '~/utils/admin-workspace'

import { normalizeApiError } from '~/utils/admin-workspace'
import {
  getAccountRegistrationSubmitErrorMessage,
  getAccountRegistrationIntro,
  isAccountRegistrationLinkOnlyMode,
  missingIdentityEmailMessage
} from '~/utils/account-registration'
import { accountDashboardHref, normalizeAuthReturnTo } from '../../../shared/auth-navigation'

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
  documents,
  privacyPolicyDocument,
  platformTermsDocument,
  status: documentsStatus
} = useCurrentPlatformDocuments()

const privacyAccepted = ref(false)
const termsAccepted = ref(false)
const submitAttempted = ref(false)
const accountLinkState = reactive({
  required: false,
  email: '',
  href: '/auth/link/login'
})
const submitState = reactive({
  pending: false,
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

const isReadyToSubmit = computed(() =>
  Boolean(privacyPolicyDocument.value)
  && Boolean(platformTermsDocument.value)
  && privacyAccepted.value
  && termsAccepted.value
)
const linkOnlyMode = computed(() => isAccountRegistrationLinkOnlyMode(actor.value, accountLinkState.required))
const accountRegistrationIntro = computed(() => getAccountRegistrationIntro(linkOnlyMode.value))
const resolvedAccountLinkState = computed(() => {
  if (accountLinkState.required) {
    return {
      required: true,
      email: accountLinkState.email,
      href: accountLinkState.href
    }
  }

  if (actor.value.kind === 'authenticated_identity' && actor.value.accountLink?.required) {
    return {
      required: true,
      email: actor.value.accountLink.email,
      href: actor.value.accountLink.linkLoginHref
    }
  }

  return {
    required: false,
    email: '',
    href: '/auth/link/login'
  }
})
const identityEmailUnavailable = computed(() =>
  actor.value.kind === 'authenticated_identity'
  && !resolvedAccountLinkState.value.required
  && !actor.value.sessionUser.email?.trim()
)

if (
  status.value !== 'pending'
  && actor.value.kind === 'platform_user'
  && actor.value.hasAcceptedCurrentPlatformDocuments
  && !linkingError.value
) {
  await navigateTo(returnTo.value, { replace: true })
}

async function submitPlatformConsent() {
  submitAttempted.value = true
  submitState.error = ''
  accountLinkState.required = false
  accountLinkState.email = ''
  accountLinkState.href = '/auth/link/login'

  if (!isReadyToSubmit.value || !privacyPolicyDocument.value || !platformTermsDocument.value) {
    return
  }

  if (identityEmailUnavailable.value) {
    submitState.error = missingIdentityEmailMessage
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

    if (apiError.code === 'platform_account_link_required') {
      accountLinkState.required = true
      accountLinkState.email = typeof apiError.details?.email === 'string'
        ? apiError.details.email
        : ''
      accountLinkState.href = typeof apiError.details?.linkLoginHref === 'string'
        ? apiError.details.linkLoginHref
        : '/auth/link/login'
      return
    }

    submitState.error = getAccountRegistrationSubmitErrorMessage(apiError)
  } finally {
    submitState.pending = false
  }
}

useSeoMeta({
  title: () => linkOnlyMode.value
    ? 'Connect Your Account | Codex Hackathons'
    : 'Finish Setting Up Your Account | Codex Hackathons',
  description: () => linkOnlyMode.value
    ? 'Connect this sign-in method to your existing Codex Hackathons account.'
    : 'Accept the current Privacy Policy and Terms so you can continue.'
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
        v-if="status === 'pending' || (!linkOnlyMode && documentsStatus === 'pending')"
        color="neutral"
        variant="soft"
        title="Loading account registration"
        description="Resolving your account state and the current platform documents."
      />

      <AppAlert
        v-else-if="!linkOnlyMode && (!documents?.privacy_policy || !documents?.platform_terms)"
        color="warning"
        variant="soft"
        title="Platform documents unavailable"
        description="The current Privacy Policy or Platform Terms could not be loaded right now."
      />

      <form
        v-else
        class="space-y-6"
        @submit.prevent="submitPlatformConsent"
      >
        <AppAlert
          v-if="!linkOnlyMode"
          color="info"
          variant="soft"
          title="Platform consent is required"
          description="You need current platform consent before you can use account settings, register for hackathons, or enter participant workspaces."
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
          v-if="!linkOnlyMode"
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
          v-if="!linkOnlyMode"
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
          <section
            v-if="resolvedAccountLinkState.required"
            class="rounded-xl border border-primary/15 bg-primary/6 p-6"
          >
            <div class="space-y-3">
              <h2 class="text-[18px] font-semibold text-highlighted dark:text-white">
                Sign in to your existing account once
              </h2>
              <p class="max-w-3xl text-sm text-neutral-700 dark:text-[#A3A3A3]">
                {{ resolvedAccountLinkState.email || 'This email address' }} already has a Codex Hackathons account. Sign in with that account&apos;s password to connect Google. After that, you can use either sign-in method.
              </p>
              <AppButton
                :to="resolvedAccountLinkState.href"
                external
                label="Sign In To Existing Account"
                size="lg"
              />
            </div>
          </section>

          <AppAlert
            v-if="submitState.error"
            color="error"
            variant="soft"
            title="Registration could not be completed"
            :description="submitState.error"
          />

          <div
            v-if="!linkOnlyMode"
            class="flex justify-end"
          >
            <AppButton
              type="submit"
              color="neutral"
              variant="solid"
              :loading="submitState.pending"
              :disabled="submitState.pending || identityEmailUnavailable"
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
