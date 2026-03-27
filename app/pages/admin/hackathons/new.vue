<script setup lang="ts">
import type { ApiDataResponse, HackathonRecord } from '~/utils/admin-workspace'

import {
  canCreateHackathon,
  createEmptyHackathonFormState,
  createHackathonSlug,
  fromDateTimeLocalValue,
  normalizeApiError,
  toHackathonAgendaPayload
} from '~/utils/admin-workspace'

definePageMeta({
  layout: 'profile',
  middleware: ['require-auth']
})

const workspace = useAdminWorkspace()
const toast = useToast()

const form = reactive(createEmptyHackathonFormState())
const hasManuallyEditedSlug = ref(false)
const isSubmitting = ref(false)
const submitError = ref('')

watch(() => form.name, (value) => {
  if (!hasManuallyEditedSlug.value) {
    form.slug = createHackathonSlug(value)
  }
})

watch(() => form.slug, (value) => {
  if (value !== createHackathonSlug(form.name)) {
    hasManuallyEditedSlug.value = true
  }
})

const actor = computed(() => workspace.actor.value)
const canCreate = computed(() => canCreateHackathon(actor.value))

async function createHackathon() {
  submitError.value = ''
  isSubmitting.value = true

  try {
    const response = await $fetch<ApiDataResponse<HackathonRecord>>('/api/hackathons', {
      method: 'POST',
      body: {
        name: form.name,
        slug: form.slug,
        description: form.description,
        agendaItems: toHackathonAgendaPayload(form.agendaItems),
        backgroundImageUrl: form.backgroundImageUrl || null,
        bannerImageUrl: form.bannerImageUrl || null,
        city: form.city,
        address: form.address,
        registrationOpensAt: fromDateTimeLocalValue(form.registrationOpensAt),
        registrationClosesAt: fromDateTimeLocalValue(form.registrationClosesAt),
        submissionOpensAt: fromDateTimeLocalValue(form.submissionOpensAt),
        submissionClosesAt: fromDateTimeLocalValue(form.submissionClosesAt),
        maxTeamMembers: form.maxTeamMembers,
        requireXProfile: form.requireXProfile,
        requireLinkedinProfile: form.requireLinkedinProfile,
        requireGithubProfile: form.requireGithubProfile,
        requireChatgptEmail: form.requireChatgptEmail,
        requireOpenaiOrgId: form.requireOpenaiOrgId,
        requireLumaProfile: form.requireLumaProfile
      }
    })

    toast.add({
      title: 'Hackathon created',
      description: 'The draft hackathon is ready for configuration.',
      color: 'success'
    })

    await workspace.refreshRoot()
    await navigateTo(`/hackathons/${response.data.slug}/admin`)
  } catch (error) {
    const apiError = normalizeApiError(error)
    submitError.value = apiError.message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AppContainer class="space-y-8 py-10 sm:py-14">
    <AdminWorkspaceHeader
      eyebrow="Admin Workspace"
      title="Create a hackathon draft."
      description="Platform admins can create draft hackathons here using the canonical backend configuration model. Registration remains system-driven, while later lifecycle transitions stay manual."
    />

    <AppAlert
      v-if="workspace.session.error.value"
      color="error"
      variant="soft"
      title="Unable to load session"
      :description="workspace.session.error.value.message"
    />

    <AppAlert
      v-else-if="!canCreate"
      color="warning"
      variant="soft"
      title="Platform admin access required"
      description="Creating hackathons is reserved for platform admins."
    />

    <template v-else>
      <AppAlert
        v-if="submitError"
        color="error"
        variant="soft"
        title="Unable to create hackathon"
        :description="submitError"
      />

      <HackathonConfigForm
        v-model:form="form"
        :is-submitting="isSubmitting"
        submit-label="Create Draft Hackathon"
        helper-text="A successful create call produces a draft hackathon. Registration still opens automatically from the configured registration window."
        @submit="createHackathon"
      />
    </template>
  </AppContainer>
</template>
