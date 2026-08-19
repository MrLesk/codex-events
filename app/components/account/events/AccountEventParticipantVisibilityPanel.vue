<script setup lang="ts">
import type { ApiDataResponse, ApiListResponse } from '~/lib/api'
import { listAllPaginatedItems, normalizeApiError } from '~/lib/api'
import type { AdminApplicationRecord } from '~/domains/applications/admin-application-record'
import type { EventRecord } from '~/domains/events/records'

import {
  LazyAccountEventsAccountEventParticipantsPanel as LazyAccountEventParticipantsPanel
} from '#components'
import {
  shouldShowApprovedParticipantAttendanceSummary
} from '~/domains/applications/admin-application-record'
import { isAbortError } from '~/lib/request-cancellation'
import { useAbortableRequest } from '~/composables/useAbortableRequest'
import { useApiClient, useApiFetch } from '~/composables/useApiClient'

const props = defineProps<{
  eventId: string
}>()

type LoadStatus = 'idle' | 'pending' | 'success' | 'error'

const eventId = computed(() => props.eventId.trim())
const apiFetch = useApiClient()
const requests = useAbortableRequest()
const applications = ref<AdminApplicationRecord[]>([])
const applicationsStatus = ref<LoadStatus>('pending')
const applicationsErrorMessage = ref('')

const {
  data: eventData
} = useApiFetch<ApiDataResponse<EventRecord>>(
  () => `/api/events/${eventId.value}`,
  {
    key: () => `event-participant-visibility-config:${eventId.value}`,
    watch: [eventId]
  }
)

const event = computed(() => eventData.value?.data ?? null)
const showAttendance = computed(() =>
  shouldShowApprovedParticipantAttendanceSummary(event.value)
)

async function loadApplications() {
  applicationsStatus.value = 'pending'
  applicationsErrorMessage.value = ''
  const signal = requests.createSignal('participant-applications')

  try {
    applications.value = await listAllPaginatedItems(
      async (page, pageSize, requestSignal) => await apiFetch<ApiListResponse<AdminApplicationRecord>>(
        `/api/events/${eventId.value}/applications`,
        {
          query: {
            page,
            page_size: pageSize
          },
          signal: requestSignal
        }
      ),
      100,
      signal
    )
    applicationsStatus.value = 'success'
  } catch (error) {
    if (isAbortError(error, signal)) {
      return
    }

    applications.value = []
    applicationsStatus.value = 'error'
    const message = normalizeApiError(error).message
    applicationsErrorMessage.value = message && message.length > 0
      ? message
      : 'Application records could not be loaded right now.'
  }
}

watch(eventId, loadApplications)
onMounted(loadApplications)
</script>

<template>
  <LazyAccountEventParticipantsPanel
    :event-id="props.eventId"
    :applications="applications"
    :is-loading="applicationsStatus === 'pending'"
    :error-message="applicationsErrorMessage"
    read-only
    :show-attendance="showAttendance"
    :show-ai-knowledge="event?.applicationAiKnowledgeVisible ?? false"
    :tracks="event?.tracks ?? []"
    :participants-limit="event?.participantsLimit ?? null"
    :auto-approve-applications="event?.autoApproveApplications ?? false"
    :event-state="event?.state ?? 'draft'"
  />
</template>
