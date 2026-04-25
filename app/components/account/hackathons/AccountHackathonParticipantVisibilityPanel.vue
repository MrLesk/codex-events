<script setup lang="ts">
import type {
  AdminApplicationRecord,
  ApiDataResponse,
  HackathonRecord,
  ApiListResponse
} from '~/utils/admin-workspace'

import {
  LazyAccountHackathonsAccountHackathonParticipantsPanel as LazyAccountHackathonParticipantsPanel
} from '#components'
import {
  shouldShowApprovedParticipantAttendanceSummary
} from '~/utils/admin-workspace'

const props = defineProps<{
  hackathonId: string
}>()

const {
  data,
  error,
  status
} = useFetch<ApiListResponse<AdminApplicationRecord>>(
  () => `/api/hackathons/${props.hackathonId}/applications`,
  {
    key: () => `hackathon-participant-visibility:${props.hackathonId}`
  }
)

const {
  data: hackathonData
} = useFetch<ApiDataResponse<HackathonRecord>>(
  () => `/api/hackathons/${props.hackathonId}`,
  {
    key: () => `hackathon-participant-visibility-config:${props.hackathonId}`
  }
)

const applications = computed(() => data.value?.data ?? [])
const hackathon = computed(() => hackathonData.value?.data ?? null)
const showAttendance = computed(() =>
  shouldShowApprovedParticipantAttendanceSummary(hackathon.value)
)
</script>

<template>
  <LazyAccountHackathonParticipantsPanel
    :hackathon-id="props.hackathonId"
    :applications="applications"
    :is-loading="status === 'pending'"
    :error-message="error?.message ?? ''"
    read-only
    :show-attendance="showAttendance"
    :participants-limit="hackathon?.participantsLimit ?? null"
  />
</template>
