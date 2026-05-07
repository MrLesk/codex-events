<script setup lang="ts">
import type { ApiDataResponse } from '~/lib/api'
import type {
  HackathonFormState
} from '~/domains/hackathons/admin-hackathon'
import type {
  HackathonRecord
} from '~/domains/hackathons/records'

import { normalizeApiError } from '~/lib/api'
import {
  fromDateTimeLocalValue,
  toHackathonAgendaPayload,
  toHackathonTracksPayload
} from '~/domains/hackathons/admin-hackathon'

definePageMeta({
  middleware: ['require-platform-admin']
})

const workspace = useAdminWorkspace()
const toast = useToast()

const isSubmitting = ref(false)
const submitError = ref('')

async function createHackathon(form: HackathonFormState) {
  submitError.value = ''
  isSubmitting.value = true

  try {
    const response = await $fetch<ApiDataResponse<HackathonRecord>>('/api/hackathons', {
      method: 'POST',
      body: {
        name: form.name,
        slug: form.slug,
        discordServerUrl: form.discordServerUrl.trim() || null,
        lumaEventUrl: form.lumaEventUrl.trim() || null,
        lumaEventApiId: form.lumaEventApiId.trim() || null,
        description: form.description,
        agendaItems: toHackathonAgendaPayload(form.agendaItems),
        tracks: toHackathonTracksPayload(form.tracks),
        city: form.city,
        country: form.country,
        address: form.address,
        registrationOpensAt: fromDateTimeLocalValue(form.registrationOpensAt),
        registrationClosesAt: fromDateTimeLocalValue(form.registrationClosesAt),
        submissionOpensAt: fromDateTimeLocalValue(form.submissionOpensAt),
        submissionClosesAt: fromDateTimeLocalValue(form.submissionClosesAt),
        maxTeamMembers: form.maxTeamMembers,
        participantsLimit: form.participantsLimit,
        autoApproveApplications: form.autoApproveApplications,
        inPersonEvent: form.inPersonEvent,
        requireXProfile: form.requireXProfile,
        requireLinkedinProfile: form.requireLinkedinProfile,
        requireGithubProfile: form.requireGithubProfile,
        requireChatgptEmail: form.requireChatgptEmail,
        requireOpenaiOrgId: form.requireOpenaiOrgId,
        requireLumaEmail: form.requireLumaEmail,
        requireWhyThisHackathon: form.requireWhyThisHackathon,
        requireProofOfExecution: form.requireProofOfExecution,
        requireSubmissionSummary: form.requireSubmissionSummary,
        requireSubmissionRepositoryUrl: form.requireSubmissionRepositoryUrl,
        requireSubmissionDemoUrl: form.requireSubmissionDemoUrl
      }
    })

    toast.add({
      title: 'Hackathon created',
      description: 'The draft hackathon is ready for configuration.',
      color: 'success'
    })

    await workspace.refreshRoot()
    await navigateTo(`/account/hackathons/${response.data.slug}?tab=settings`)
  } catch (error) {
    const apiError = normalizeApiError(error)
    submitError.value = apiError.message
  } finally {
    isSubmitting.value = false
  }
}

useSeoMeta({
  title: 'Create Hackathon | Codex Hackathons',
  description: 'Set up a new hackathon and save it as a draft.'
})
</script>

<template>
  <AppContainer class="space-y-8 py-10 sm:py-14">
    <AdminWorkspaceHeader
      eyebrow="Admin Workspace"
      title="Create a hackathon draft."
      description="Create a new hackathon and fill in the details participants and judges will use. It starts as a draft so you can review everything before opening registration."
    />

    <AppAlert
      v-if="workspace.session.error.value"
      color="error"
      variant="soft"
      title="Unable to load session"
      :description="workspace.session.error.value.message"
    />

    <template v-else>
      <AdminHackathonCreateEditForm
        :auto-generate-slug="true"
        :submit-error="submitError"
        :is-submitting="isSubmitting"
        submit-label="Create Draft Hackathon"
        helper-text="This creates a draft hackathon. You can keep editing it before applications open."
        @submit="createHackathon"
      />
    </template>
  </AppContainer>
</template>
