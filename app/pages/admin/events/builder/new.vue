<script setup lang="ts">
import type { ApiDataResponse } from '~/lib/api'
import type { EventRecord } from '~/domains/events/records'

import { normalizeApiError } from '~/lib/api'
import AdminBuilderWorkspace from '~/components/admin/builder/AdminBuilderWorkspace.vue'
import { useApiClient } from '~/composables/useApiClient'

definePageMeta({
  middleware: ['require-event-creator']
})

const workspace = useAdminWorkspace()
const apiFetch = useApiClient()
const toast = useToast()
const builder = useEventBuilder({ mode: 'create' })

const isSubmitting = ref(false)
const submitError = ref('')

async function createEvent() {
  submitError.value = ''
  isSubmitting.value = true

  try {
    const response = await apiFetch<ApiDataResponse<EventRecord>>('/api/events', {
      method: 'POST',
      body: {
        ...builder.buildCreateBody(),
        creationFlow: 'builder'
      }
    })

    builder.markSubmitted()
    toast.add({
      title: 'Event created',
      description: `Balance score ${builder.report.value.score} — the draft is ready for configuration.`,
      color: 'success'
    })

    await workspace.refreshRoot()
    await navigateTo(`/account/events/${response.data.slug}?tab=settings`)
  } catch (error) {
    submitError.value = normalizeApiError(error).message
  } finally {
    isSubmitting.value = false
  }
}

onBeforeRouteLeave(() => {
  if (builder.isDirty.value
    && !window.confirm('Leave the builder? Unsaved changes will be lost.')) {
    return false
  }
})

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (builder.isDirty.value) {
    event.preventDefault()
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

useSeoMeta({
  title: 'Event Builder | Codex Events',
  description: 'Assemble a balanced event from session blocks and watch the score respond.'
})
</script>

<template>
  <AppContainer class="max-w-none space-y-6 py-6 sm:py-8">
    <AdminWorkspaceHeader title="Build your event" />

    <AppAlert
      v-if="workspace.session.error.value"
      color="error"
      variant="soft"
      title="Unable to load session"
      :description="workspace.session.error.value.message"
    />

    <AdminBuilderWorkspace
      v-else
      :builder="builder"
      mode="create"
      :is-submitting="isSubmitting"
      :submit-error="submitError"
      @submit="createEvent"
    />
  </AppContainer>
</template>
