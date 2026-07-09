<script setup lang="ts">
import type { ApiDataResponse } from '~/lib/api'
import type {
  EventFormState
} from '~/domains/events/admin-event'
import type {
  EventRecord
} from '~/domains/events/records'

import { normalizeApiError } from '~/lib/api'
import {
  fromDateTimeLocalValue,
  toEventAgendaPayload,
  toEventTracksPayload
} from '~/domains/events/admin-event'

definePageMeta({
  middleware: ['require-event-creator']
})

const workspace = useAdminWorkspace()
const toast = useToast()

const isSubmitting = ref(false)
const submitError = ref('')

async function createEvent(form: EventFormState) {
  submitError.value = ''
  isSubmitting.value = true
  const isHackathon = form.eventType === 'hackathon'
  const supportsTracks = isHackathon || form.eventType === 'build'

  try {
    const response = await $fetch<ApiDataResponse<EventRecord>>('/api/events', {
      method: 'POST',
      body: {
        eventType: form.eventType,
        name: form.name,
        slug: form.slug,
        discordServerUrl: form.discordServerUrl.trim() || null,
        lumaEventUrl: form.lumaEventUrl.trim() || null,
        slidesUrl: form.slidesUrl.trim() || null,
        lumaEventApiId: form.lumaEventApiId.trim() || null,
        lumaApiKey: form.lumaApiKey.trim() || null,
        description: form.description,
        agendaItems: toEventAgendaPayload(form.agendaItems),
        tracks: supportsTracks ? toEventTracksPayload(form.tracks) : [],
        city: form.city,
        country: form.country,
        address: form.address,
        registrationOpensAt: fromDateTimeLocalValue(form.registrationOpensAt),
        registrationClosesAt: fromDateTimeLocalValue(form.registrationClosesAt),
        submissionOpensAt: isHackathon ? fromDateTimeLocalValue(form.submissionOpensAt) : undefined,
        submissionClosesAt: isHackathon ? fromDateTimeLocalValue(form.submissionClosesAt) : undefined,
        maxTeamMembers: isHackathon ? form.maxTeamMembers : 1,
        participantsLimit: form.participantsLimit,
        autoApproveApplications: form.autoApproveApplications,
        simplifiedClaimingEnabled: form.eventType === 'meetup' && form.simplifiedClaimingEnabled,
        inPersonEvent: form.inPersonEvent,
        applicationXProfileVisible: form.applicationXProfileVisible,
        applicationLinkedinProfileVisible: form.applicationLinkedinProfileVisible,
        applicationGithubProfileVisible: form.applicationGithubProfileVisible,
        applicationChatgptEmailVisible: form.applicationChatgptEmailVisible,
        applicationOpenaiOrgIdVisible: form.applicationOpenaiOrgIdVisible,
        applicationLumaEmailVisible: form.applicationLumaEmailVisible,
        applicationWhyThisEventVisible: form.applicationWhyThisEventVisible,
        applicationProofOfExecutionVisible: form.applicationProofOfExecutionVisible,
        applicationTeamIntentVisible: form.applicationTeamIntentVisible,
        applicationAiKnowledgeVisible: form.applicationAiKnowledgeVisible,
        requireXProfile: form.requireXProfile,
        requireLinkedinProfile: form.requireLinkedinProfile,
        requireGithubProfile: form.requireGithubProfile,
        requireChatgptEmail: form.requireChatgptEmail,
        requireOpenaiOrgId: form.requireOpenaiOrgId,
        requireLumaEmail: form.requireLumaEmail,
        requireWhyThisEvent: form.requireWhyThisEvent,
        requireProofOfExecution: form.requireProofOfExecution,
        requireTeamIntent: form.requireTeamIntent,
        requireAiKnowledge: form.requireAiKnowledge,
        requireSubmissionSummary: isHackathon ? form.requireSubmissionSummary : false,
        requireSubmissionRepositoryUrl: isHackathon ? form.requireSubmissionRepositoryUrl : false,
        requireSubmissionDemoUrl: isHackathon ? form.requireSubmissionDemoUrl : false
      }
    })

    toast.add({
      title: 'Event created',
      description: 'The draft event is ready for configuration.',
      color: 'success'
    })

    await workspace.refreshRoot()
    await navigateTo(`/account/events/${response.data.slug}?tab=settings`)
  } catch (error) {
    const apiError = normalizeApiError(error)
    submitError.value = apiError.message
  } finally {
    isSubmitting.value = false
  }
}

useSeoMeta({
  title: 'Create Event | Codex Events',
  description: 'Set up a new event and save it as a draft.'
})
</script>

<template>
  <AppContainer class="space-y-8 py-10 sm:py-14">
    <AdminWorkspaceHeader
      eyebrow="Admin Workspace"
      title="Create an event draft."
      description="Create a new event and fill in the details participants will use. It starts as a draft so you can review everything before opening registration."
    />

    <AppAlert
      v-if="workspace.session.error.value"
      color="error"
      variant="soft"
      title="Unable to load session"
      :description="workspace.session.error.value.message"
    />

    <template v-else>
      <AdminEventCreateEditForm
        :auto-generate-slug="true"
        :submit-error="submitError"
        :is-submitting="isSubmitting"
        submit-label="Create Draft Event"
        helper-text="This creates a draft event. You can keep editing it before applications open."
        @submit="createEvent"
      />
    </template>
  </AppContainer>
</template>
