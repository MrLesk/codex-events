<script setup lang="ts">
import type { ApiDataResponse } from '~/lib/api'
import type { EventRecord, TermsDocument } from '~/domains/events/records'

import { normalizeApiError } from '~/lib/api'
import { getTermsVersionPublishErrorMessage } from '~/domains/events/admin-event'
import AdminBuilderWorkspace from '~/components/admin/builder/AdminBuilderWorkspace.vue'
import { useApiClient } from '~/composables/useApiClient'

definePageMeta({
  middleware: ['require-platform-account']
})

const route = useRoute()
const apiFetch = useApiClient()
const toast = useToast()
const eventId = computed(() => String(route.params.eventId ?? ''))

const {
  data: eventResponse,
  error: eventError,
  refresh: refreshEvent
} = await useApiResponse<EventRecord>(
  () => `admin-event-builder-${eventId.value}`,
  () => `/api/events/${eventId.value}`
)

const currentEvent = computed(() => eventResponse.value ?? null)

const {
  data: termsResponse,
  refresh: refreshTerms
} = await useApiResponse<{
  applicationTerms: TermsDocument | null
  winnerTerms: TermsDocument | null
}>(
  () => `admin-event-builder-terms-${eventId.value}`,
  () => `/api/events/${eventId.value}/terms/current`
)

const builder = useEventBuilder({
  mode: 'edit',
  initialEvent: currentEvent
})

const isSubmitting = ref(false)
const submitError = ref('')

async function saveEvent() {
  submitError.value = ''
  isSubmitting.value = true

  try {
    await apiFetch<ApiDataResponse<EventRecord>>(`/api/events/${eventId.value}`, {
      method: 'PATCH',
      body: builder.buildPatchBody()
    })

    toast.add({
      title: 'Event updated',
      description: `Balance score ${builder.report.value.score} — changes are saved.`,
      color: 'success'
    })

    await refreshEvent()
    builder.resetBaseline()
  } catch (error) {
    submitError.value = normalizeApiError(error).message
  } finally {
    isSubmitting.value = false
  }
}

interface ImageMutationState {
  pending: boolean
  error: string
}

const imageMutationState = reactive<Record<'background' | 'banner', ImageMutationState>>({
  background: { pending: false, error: '' },
  banner: { pending: false, error: '' }
})

async function uploadEventImage(slot: 'background' | 'banner', file: File) {
  const state = imageMutationState[slot]

  state.pending = true
  state.error = ''

  try {
    const formData = new FormData()

    formData.append('file', file)

    await apiFetch<ApiDataResponse<EventRecord>>(`/api/events/${eventId.value}/images/${slot}`, {
      method: 'POST',
      body: formData
    })

    await refreshEvent()
    toast.add({
      title: slot === 'background' ? 'Background image updated' : 'Banner image updated',
      color: 'success'
    })
  } catch (error) {
    state.error = normalizeApiError(error).message
  } finally {
    state.pending = false
  }
}

async function removeEventImage(slot: 'background' | 'banner') {
  const state = imageMutationState[slot]

  state.pending = true
  state.error = ''

  try {
    await apiFetch<ApiDataResponse<EventRecord>>(`/api/events/${eventId.value}/images/${slot}`, {
      method: 'DELETE'
    })

    await refreshEvent()
    toast.add({
      title: slot === 'background' ? 'Background image removed' : 'Banner image removed',
      color: 'success'
    })
  } catch (error) {
    state.error = normalizeApiError(error).message
  } finally {
    state.pending = false
  }
}

const savingTermsDocumentType = ref<TermsDocument['documentType'] | null>(null)

async function saveTerms(documentType: TermsDocument['documentType'], content: string) {
  savingTermsDocumentType.value = documentType
  submitError.value = ''

  const trimmedContent = content.trim()

  try {
    const versions = await apiFetch<{ data: TermsDocument[] }>(
      `/api/events/${eventId.value}/terms/${documentType}/versions`
    )
    const nextVersion = versions.data.reduce((highest, doc) => Math.max(highest, doc.version), 0) + 1
    const title = `${documentType === 'application_terms' ? 'Application Terms' : 'Winner Terms'} v${nextVersion}`
    const validationError = getTermsVersionPublishErrorMessage(title, trimmedContent)

    if (validationError) {
      submitError.value = validationError
      return
    }

    const createdDocument = await apiFetch<ApiDataResponse<TermsDocument>>(
      `/api/events/${eventId.value}/terms/${documentType}/versions`,
      {
        method: 'POST',
        body: { title, content: trimmedContent }
      }
    )

    await apiFetch(`/api/events/${eventId.value}/terms/${documentType}/actions/set-current`, {
      method: 'POST',
      body: { eventTermsDocumentId: createdDocument.data.id }
    })

    toast.add({
      title: documentType === 'application_terms' ? 'Application terms updated' : 'Winner terms updated',
      color: 'success'
    })
    await Promise.all([refreshEvent(), refreshTerms()])
  } catch (error) {
    submitError.value = normalizeApiError(error).message
  } finally {
    savingTermsDocumentType.value = null
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
  description: 'Rework the event agenda with live balance scoring.'
})
</script>

<template>
  <AppContainer class="max-w-none space-y-6 py-6 sm:py-8">
    <AdminWorkspaceHeader
      title="Rework your event"
      :back-to="currentEvent ? `/account/events/${currentEvent.slug}?tab=settings` : undefined"
    />

    <AppAlert
      v-if="eventError"
      color="error"
      variant="soft"
      title="Unable to load this event"
      :description="normalizeApiError(eventError).message"
    />

    <AdminBuilderWorkspace
      v-else-if="currentEvent"
      :builder="builder"
      mode="edit"
      :event="currentEvent"
      :is-submitting="isSubmitting"
      :submit-error="submitError"
      :background-image-upload-pending="imageMutationState.background.pending"
      :background-image-upload-error="imageMutationState.background.error"
      :banner-image-upload-pending="imageMutationState.banner.pending"
      :banner-image-upload-error="imageMutationState.banner.error"
      :image-version="currentEvent.updatedAt"
      :current-application-terms="termsResponse?.applicationTerms ?? null"
      :current-winner-terms="termsResponse?.winnerTerms ?? null"
      :saving-terms-document-type="savingTermsDocumentType"
      @submit="saveEvent"
      @upload-background-image="file => uploadEventImage('background', file)"
      @remove-background-image="removeEventImage('background')"
      @upload-banner-image="file => uploadEventImage('banner', file)"
      @remove-banner-image="removeEventImage('banner')"
      @save-terms="saveTerms"
    />
  </AppContainer>
</template>
