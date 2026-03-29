<script setup lang="ts">
import { renderMarkdown } from '~/utils/markdown'
import {
  accountDashboardHref,
  normalizeAuthReturnTo
} from '~/utils/auth-navigation'

definePageMeta({
  layout: 'profile',
  middleware: ['require-auth']
})

const route = useRoute()
const returnTo = computed(() => normalizeAuthReturnTo(
  typeof route.query.returnTo === 'string' ? route.query.returnTo : null,
  accountDashboardHref
))
const { actor, status, refresh } = await useAccountLifecycleActor()
const {
  documents,
  privacyPolicyDocument,
  platformTermsDocument,
  status: documentsStatus
} = await useCurrentPlatformDocuments()

const privacyAccepted = ref(false)
const termsAccepted = ref(false)
const submitAttempted = ref(false)
const submitState = reactive({
  pending: false,
  error: ''
})

const privacyPolicyHtml = computed(() => {
  const content = privacyPolicyDocument.value?.content?.trim() ?? ''
  return content ? renderMarkdown(content.replaceAll('\\n', '\n')) : ''
})

const platformTermsHtml = computed(() => {
  const content = platformTermsDocument.value?.content?.trim() ?? ''
  return content ? renderMarkdown(content.replaceAll('\\n', '\n')) : ''
})

const isReadyToSubmit = computed(() =>
  Boolean(privacyPolicyDocument.value)
  && Boolean(platformTermsDocument.value)
  && privacyAccepted.value
  && termsAccepted.value
)

if (
  status.value !== 'pending'
  && actor.value.kind === 'platform_user'
  && actor.value.hasAcceptedCurrentPlatformDocuments
) {
  await navigateTo(returnTo.value, { replace: true })
}

async function submitPlatformConsent() {
  submitAttempted.value = true
  submitState.error = ''

  if (!isReadyToSubmit.value || !privacyPolicyDocument.value || !platformTermsDocument.value) {
    return
  }

  submitState.pending = true

  try {
    if (actor.value.kind === 'authenticated_identity') {
      await $fetch('/api/account/registration', {
        method: 'POST',
        body: {
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
    submitState.error = error instanceof Error
      ? error.message
      : 'Unable to finish account registration right now.'
  } finally {
    submitState.pending = false
  }
}

useSeoMeta({
  title: 'Finish Account Registration | Codex Hackathons',
  description: 'Review and accept the current platform Privacy Policy and Platform Terms to continue.'
})
</script>

<template>
  <div class="pb-14">
    <section class="border-b border-black/8 dark:border-white/[0.08]">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <div class="pb-4">
          <div class="space-y-2">
            <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              Finish account registration
            </h1>
            <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              Review the current platform Privacy Policy and Platform Terms, then accept both to continue into your account and hackathon workspaces.
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

      <AppAlert
        v-else-if="!documents?.privacy_policy || !documents?.platform_terms"
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
          color="info"
          variant="soft"
          title="Platform consent is required"
          description="You need current platform consent before you can use account settings, register for hackathons, or enter participant workspaces."
        />

        <AppAlert
          v-if="submitState.error"
          color="error"
          variant="soft"
          title="Registration could not be completed"
          :description="submitState.error"
        />

        <section class="rounded-xl border border-black/8 bg-[#F7F7F8]/80 p-6 dark:border-white/[0.08] dark:bg-[#111111]/80">
          <div class="space-y-4">
            <div class="space-y-2">
              <h2 class="text-[20px] font-medium text-highlighted dark:text-white">
                Privacy Policy
              </h2>
              <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                Version {{ privacyPolicyDocument?.version }}
              </p>
            </div>

            <div
              class="hackathon-markdown max-h-[24rem] overflow-y-auto rounded-lg border border-black/8 bg-white p-5 dark:border-white/[0.08] dark:bg-black/20"
              v-html="privacyPolicyHtml"
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

        <section class="rounded-xl border border-black/8 bg-[#F7F7F8]/80 p-6 dark:border-white/[0.08] dark:bg-[#111111]/80">
          <div class="space-y-4">
            <div class="space-y-2">
              <h2 class="text-[20px] font-medium text-highlighted dark:text-white">
                Platform Terms
              </h2>
              <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
                Version {{ platformTermsDocument?.version }}
              </p>
            </div>

            <div
              class="hackathon-markdown max-h-[24rem] overflow-y-auto rounded-lg border border-black/8 bg-white p-5 dark:border-white/[0.08] dark:bg-black/20"
              v-html="platformTermsHtml"
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

        <div class="flex justify-end">
          <AppButton
            type="submit"
            color="neutral"
            variant="solid"
            :loading="submitState.pending"
            :disabled="submitState.pending"
            class="rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
          >
            Continue
          </AppButton>
        </div>
      </form>
    </AppContainer>
  </div>
</template>
