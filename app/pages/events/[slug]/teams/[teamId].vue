<script setup lang="ts">
import type { AccountEventTeamsPage } from '#shared/domains/events/account-event-teams-page'

import { LazyAccountEventsAccountEventParticipantTeamPanel as LazyAccountEventParticipantTeamPanel } from '#components'
import { useAccountEventPageRequest } from '~/composables/useAccountEventPageRequest'
import { normalizeApiError } from '~/lib/api'

definePageMeta({
  middleware: ['require-platform-account']
})

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())
const teamSlug = computed(() => String(route.params.teamId ?? '').trim().toLowerCase())

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Event not found.'
  })
}

const pageRequest = useAccountEventPageRequest<AccountEventTeamsPage>(slug, 'teams', {
  query: computed(() => ({ selectedTeamSlug: teamSlug.value }))
})
</script>

<template>
  <div class="space-y-6">
    <AppAlert
      v-if="pageRequest.pending.value && !pageRequest.data.value"
      color="neutral"
      variant="soft"
      title="Loading team"
      description="The selected event team is loading."
    />

    <AppAlert
      v-else-if="pageRequest.error.value"
      color="error"
      variant="soft"
      title="Team unavailable"
      :description="normalizeApiError(pageRequest.error.value).message"
    />

    <LazyAccountEventParticipantTeamPanel
      v-else-if="pageRequest.data.value"
      :event="pageRequest.data.value.page.event"
      :page="pageRequest.data.value.page"
      :selected-team-slug="teamSlug"
      :is-loading="pageRequest.pending.value"
      :load-error-message="pageRequest.error.value ? normalizeApiError(pageRequest.error.value).message : ''"
    />
  </div>
</template>
