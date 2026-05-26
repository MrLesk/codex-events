<script setup lang="ts">
import type { ApiDataResponse } from '~/lib/api'
import type { PlatformDocumentRecord } from '~/composables/useCurrentPlatformDocuments'

import { normalizeApiError } from '~/lib/api'

definePageMeta({
  middleware: ['require-platform-admin']
})

const toast = useToast()
const {
  settings,
  status: settingsStatus,
  error: settingsError,
  refresh: refreshSettings
} = usePlatformLegalSettings()
const {
  privacyPolicyDocument,
  platformTermsDocument,
  status: documentsStatus,
  error: documentsError,
  refresh: refreshDocuments
} = useCurrentPlatformDocuments()

const legalSettingsForm = reactive({
  operatorName: '',
  operatorAddress: '',
  supportEmail: '',
  privacyEmail: '',
  legalContactLanguages: '',
  businessPurpose: '',
  editorialLine: '',
  imprintContent: ''
})
const privacyPolicyDraft = ref('')
const privacyPolicyTitle = ref('')
const platformTermsDraft = ref('')
const platformTermsTitle = ref('')
const lastSyncedPrivacyPolicyContent = ref('')
const lastSyncedPlatformTermsContent = ref('')
const settingsMutation = reactive({
  pending: false,
  error: ''
})
const publishingDocumentType = ref<PlatformDocumentRecord['documentType'] | null>(null)
const publishError = ref('')

watch(settings, (nextSettings) => {
  if (!nextSettings) {
    return
  }

  legalSettingsForm.operatorName = nextSettings.operatorName
  legalSettingsForm.operatorAddress = nextSettings.operatorAddress
  legalSettingsForm.supportEmail = nextSettings.supportEmail
  legalSettingsForm.privacyEmail = nextSettings.privacyEmail
  legalSettingsForm.legalContactLanguages = nextSettings.legalContactLanguages
  legalSettingsForm.businessPurpose = nextSettings.businessPurpose
  legalSettingsForm.editorialLine = nextSettings.editorialLine
  legalSettingsForm.imprintContent = nextSettings.imprintContent
}, {
  immediate: true
})

watch(privacyPolicyDocument, (document) => {
  const nextContent = document?.content ?? ''

  if (privacyPolicyDraft.value === lastSyncedPrivacyPolicyContent.value) {
    privacyPolicyDraft.value = nextContent
  }

  lastSyncedPrivacyPolicyContent.value = nextContent
}, {
  immediate: true
})

watch(platformTermsDocument, (document) => {
  const nextContent = document?.content ?? ''

  if (platformTermsDraft.value === lastSyncedPlatformTermsContent.value) {
    platformTermsDraft.value = nextContent
  }

  lastSyncedPlatformTermsContent.value = nextContent
}, {
  immediate: true
})

function formatTitle(documentType: PlatformDocumentRecord['documentType']) {
  const currentDocument = documentType === 'privacy_policy'
    ? privacyPolicyDocument.value
    : platformTermsDocument.value
  const label = documentType === 'privacy_policy' ? 'Privacy Policy' : 'Platform Terms'
  const nextVersion = (currentDocument?.version ?? 0) + 1
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())

  return `${label} v${nextVersion} (${date})`
}

function getDocumentDraft(documentType: PlatformDocumentRecord['documentType']) {
  return documentType === 'privacy_policy'
    ? privacyPolicyDraft.value
    : platformTermsDraft.value
}

function getDocumentTitle(documentType: PlatformDocumentRecord['documentType']) {
  return documentType === 'privacy_policy'
    ? privacyPolicyTitle.value.trim() || formatTitle(documentType)
    : platformTermsTitle.value.trim() || formatTitle(documentType)
}

async function saveLegalSettings() {
  settingsMutation.pending = true
  settingsMutation.error = ''

  try {
    await $fetch('/api/platform-legal-settings/current', {
      method: 'PATCH',
      body: legalSettingsForm
    })

    await refreshSettings()
    toast.add({
      title: 'Legal settings saved',
      description: 'Public imprint and contact details now use the latest settings.',
      color: 'success'
    })
  } catch (error) {
    settingsMutation.error = normalizeApiError(error).message
  } finally {
    settingsMutation.pending = false
  }
}

async function publishPlatformDocument(documentType: PlatformDocumentRecord['documentType']) {
  const content = getDocumentDraft(documentType).trim()

  publishError.value = ''

  if (!content) {
    publishError.value = documentType === 'privacy_policy'
      ? 'Enter Privacy Policy content before publishing.'
      : 'Enter Platform Terms content before publishing.'
    return
  }

  publishingDocumentType.value = documentType

  try {
    await $fetch<ApiDataResponse<PlatformDocumentRecord>>(`/api/platform-documents/${documentType}/versions`, {
      method: 'POST',
      body: {
        title: getDocumentTitle(documentType),
        content
      }
    })

    if (documentType === 'privacy_policy') {
      privacyPolicyTitle.value = ''
    } else {
      platformTermsTitle.value = ''
    }

    await refreshDocuments()
    toast.add({
      title: documentType === 'privacy_policy' ? 'Privacy Policy published' : 'Platform Terms published',
      description: 'A new current platform document version is now available for public pages and consent flows.',
      color: 'success'
    })
  } catch (error) {
    publishError.value = normalizeApiError(error).message
  } finally {
    publishingDocumentType.value = null
  }
}

useSeoMeta({
  title: 'Platform Legal Settings | Codex Events',
  description: 'Configure public legal pages and platform consent documents.'
})
</script>

<template>
  <div class="pb-14">
    <section class="border-b border-black/8 dark:border-white/[0.08]">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <div class="space-y-3 pb-4">
          <NuxtLink
            to="/account/admin"
            class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-700 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
          >
            <AppIcon
              name="i-lucide-chevron-left"
              class="size-4"
            />
            <span>Back to Admin dashboard</span>
          </NuxtLink>

          <div class="space-y-2">
            <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              Platform legal settings
            </h1>
            <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              Configure the operator-owned legal notice, contact details, and current platform consent documents for this deployment.
            </p>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] space-y-6 pt-6">
      <AppAlert
        v-if="settingsError"
        color="error"
        variant="soft"
        title="Unable to load legal settings"
        :description="settingsError.message"
      />

      <AppAlert
        v-if="documentsError"
        color="error"
        variant="soft"
        title="Unable to load platform documents"
        :description="documentsError.message"
      />

      <AppAlert
        v-if="!settings && settingsStatus !== 'pending'"
        color="warning"
        variant="soft"
        title="Legal settings are not configured"
        description="Public imprint and legal contact details remain unavailable until these settings are saved."
      />

      <AppAlert
        v-if="(!privacyPolicyDocument || !platformTermsDocument) && documentsStatus !== 'pending'"
        color="warning"
        variant="soft"
        title="Platform consent documents are incomplete"
        description="Account registration and re-consent require current Privacy Policy and Platform Terms versions."
      />

      <AppCard class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Operator and imprint
            </h2>
            <p class="text-sm text-muted">
              These settings power the public imprint and contact form. Saving them does not create a new consent version.
            </p>
          </div>
        </template>

        <form
          class="space-y-5"
          @submit.prevent="saveLegalSettings"
        >
          <div class="grid gap-4 md:grid-cols-2">
            <AppFormField
              name="platform-operator-name"
              label="Operator name"
            >
              <AppInput
                v-model="legalSettingsForm.operatorName"
                type="text"
                required
              />
            </AppFormField>

            <AppFormField
              name="platform-operator-address"
              label="Operator address"
            >
              <AppInput
                v-model="legalSettingsForm.operatorAddress"
                type="text"
                required
              />
            </AppFormField>

            <AppFormField
              name="platform-support-email"
              label="Support email"
            >
              <AppInput
                v-model="legalSettingsForm.supportEmail"
                type="email"
                required
              />
            </AppFormField>

            <AppFormField
              name="platform-privacy-email"
              label="Privacy email"
            >
              <AppInput
                v-model="legalSettingsForm.privacyEmail"
                type="email"
                required
              />
            </AppFormField>
          </div>

          <AppFormField
            name="platform-legal-contact-languages"
            label="Legal contact languages"
            description="Languages accepted for legal and DSA communications, for example German and English."
          >
            <AppInput
              v-model="legalSettingsForm.legalContactLanguages"
              type="text"
              required
            />
          </AppFormField>

          <div class="grid gap-4 md:grid-cols-2">
            <AppFormField
              name="platform-business-purpose"
              label="Business purpose"
              description="Short public description of what this platform operates."
            >
              <AppTextarea
                v-model="legalSettingsForm.businessPurpose"
                rows="3"
                required
              />
            </AppFormField>

            <AppFormField
              name="platform-editorial-line"
              label="Editorial line"
              description="Short public summary of the information published through this platform."
            >
              <AppTextarea
                v-model="legalSettingsForm.editorialLine"
                rows="3"
                required
              />
            </AppFormField>
          </div>

          <LazyAdminMarkdownEditorField
            v-model="legalSettingsForm.imprintContent"
            name="platform-imprint-content"
            editor-id="platform-imprint-content"
            label="Imprint content"
            description="Full public legal notice shown on the imprint page. Include operator details, address, contact points, DSA contact information, and any jurisdiction-required notices."
            placeholder="Enter the public imprint content for this deployment."
            required
          />

          <AppAlert
            v-if="settingsMutation.error"
            color="error"
            variant="soft"
            title="Legal settings update failed"
            :description="settingsMutation.error"
          />

          <div class="flex justify-end">
            <AppButton
              type="submit"
              color="primary"
              :loading="settingsMutation.pending"
            >
              Save legal settings
            </AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Platform consent documents
            </h2>
            <p class="text-sm text-muted">
              Publishing creates a new current version. Existing accepted versions are retained unchanged.
            </p>
          </div>
        </template>

        <div class="space-y-6">
          <AppAlert
            v-if="publishError"
            color="error"
            variant="soft"
            title="Publish failed"
            :description="publishError"
          />

          <section class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="text-base font-semibold text-highlighted">
                Privacy Policy
              </h3>
              <p class="text-xs text-muted">
                {{ privacyPolicyDocument ? `Current v${privacyPolicyDocument.version}` : 'No published version' }}
              </p>
            </div>

            <AppFormField
              name="privacy-policy-title"
              label="Version title"
              description="Leave blank to use the next version number and today's date."
            >
              <AppInput
                v-model="privacyPolicyTitle"
                type="text"
                :placeholder="formatTitle('privacy_policy')"
              />
            </AppFormField>

            <LazyAdminMarkdownEditorField
              v-model="privacyPolicyDraft"
              name="privacy-policy-content"
              editor-id="privacy-policy-content"
              label="Content"
              placeholder="Enter the Privacy Policy content."
              required
            />

            <div class="flex justify-end">
              <AppButton
                color="primary"
                :loading="publishingDocumentType === 'privacy_policy'"
                :disabled="publishingDocumentType !== null"
                @click="publishPlatformDocument('privacy_policy')"
              >
                Publish Privacy Policy
              </AppButton>
            </div>
          </section>

          <section class="space-y-4 border-t border-black/8 pt-6 dark:border-white/[0.08]">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="text-base font-semibold text-highlighted">
                Platform Terms
              </h3>
              <p class="text-xs text-muted">
                {{ platformTermsDocument ? `Current v${platformTermsDocument.version}` : 'No published version' }}
              </p>
            </div>

            <AppFormField
              name="platform-terms-title"
              label="Version title"
              description="Leave blank to use the next version number and today's date."
            >
              <AppInput
                v-model="platformTermsTitle"
                type="text"
                :placeholder="formatTitle('platform_terms')"
              />
            </AppFormField>

            <LazyAdminMarkdownEditorField
              v-model="platformTermsDraft"
              name="platform-terms-content"
              editor-id="platform-terms-content"
              label="Content"
              placeholder="Enter the Platform Terms content."
              required
            />

            <div class="flex justify-end">
              <AppButton
                color="primary"
                :loading="publishingDocumentType === 'platform_terms'"
                :disabled="publishingDocumentType !== null"
                @click="publishPlatformDocument('platform_terms')"
              >
                Publish Platform Terms
              </AppButton>
            </div>
          </section>
        </div>
      </AppCard>
    </AppContainer>
  </div>
</template>
