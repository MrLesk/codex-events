<script setup lang="ts">
import type { ApiDataResponse, ApiListResponse } from '~/lib/api'
import type { AdminApplicationRecord } from '~/domains/applications/admin-application-record'
import type { EventRecord } from '~/domains/events/records'

import {
  LazyAccountEventsAccountEventParticipantsPanel as LazyAccountEventParticipantsPanel
} from '#components'
import {
  shouldShowApprovedParticipantAttendanceSummary
} from '~/domains/applications/admin-application-record'

const props = defineProps<{
  eventId: string
}>()

const {
  data,
  error,
  status
} = useFetch<ApiListResponse<AdminApplicationRecord>>(
  () => `/api/events/${props.eventId}/applications`,
  {
    key: () => `event-participant-visibility:${props.eventId}`
  }
)

const {
  data: eventData
} = useFetch<ApiDataResponse<EventRecord>>(
  () => `/api/events/${props.eventId}`,
  {
    key: () => `event-participant-visibility-config:${props.eventId}`
  }
)

const applications = computed(() => data.value?.data ?? [])
const event = computed(() => eventData.value?.data ?? null)
const showAttendance = computed(() =>
  shouldShowApprovedParticipantAttendanceSummary(event.value)
)
</script>

<template>
  <LazyAccountEventParticipantsPanel
    :event-id="props.eventId"
    :applications="applications"
    :is-loading="status === 'pending'"
    :error-message="error?.message ?? ''"
    read-only
    :show-attendance="showAttendance"
    :show-ai-knowledge="event?.applicationAiKnowledgeVisible ?? false"
    :participants-limit="event?.participantsLimit ?? null"
    :auto-approve-applications="event?.autoApproveApplications ?? false"
  />
</template>
