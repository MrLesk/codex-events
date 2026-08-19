<script setup lang="ts">
import type { AccountEventParticipantsPage } from '#shared/domains/events/account-event-participants-page'
import type { AdminApplicationRecord } from '~/domains/applications/admin-application-record'

import {
  LazyAccountEventsAccountEventParticipantsPanel as LazyAccountEventParticipantsPanel
} from '#components'
import {
  shouldShowApprovedParticipantAttendanceSummary
} from '~/domains/applications/admin-application-record'

const props = withDefaults(defineProps<{
  eventId: string
  page: AccountEventParticipantsPage | null
  isLoading?: boolean
  errorMessage?: string
}>(), {
  isLoading: false,
  errorMessage: ''
})

const applications = computed(() => (props.page?.applications ?? []) as AdminApplicationRecord[])
const event = computed(() => props.page?.event ?? null)
const showAttendance = computed(() =>
  shouldShowApprovedParticipantAttendanceSummary(event.value)
)
</script>

<template>
  <LazyAccountEventParticipantsPanel
    :event-id="props.eventId"
    :applications="applications"
    :is-loading="props.isLoading"
    :error-message="props.errorMessage"
    read-only
    :show-attendance="showAttendance"
    :show-ai-knowledge="event?.applicationAiKnowledgeVisible ?? false"
    :tracks="event?.tracks ?? []"
    :participants-limit="event?.participantsLimit ?? null"
    :auto-approve-applications="event?.autoApproveApplications ?? false"
    :event-state="event?.state ?? 'draft'"
    :status-counts="props.page?.statusCounts"
  />
</template>
