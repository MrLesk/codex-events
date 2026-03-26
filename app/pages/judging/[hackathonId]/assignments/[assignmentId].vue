<script setup lang="ts">
import type { ApiDataResponse, HackathonRecord } from '~/utils/admin-workspace'

definePageMeta({
  layout: 'profile',
  middleware: ['require-auth']
})

const route = useRoute()
const hackathonId = typeof route.params.hackathonId === 'string' ? route.params.hackathonId.trim() : ''
const assignmentId = typeof route.params.assignmentId === 'string' ? route.params.assignmentId.trim() : ''

if (!hackathonId || !assignmentId) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Judge assignment not found.'
  })
}

const requestFetch = import.meta.server ? useRequestFetch() : $fetch
const response = await requestFetch<ApiDataResponse<HackathonRecord>>(`/api/hackathons/${encodeURIComponent(hackathonId)}`)

await navigateTo(`/hackathons/${response.data.slug}/judging/assignments/${assignmentId}`, {
  redirectCode: 301
})
</script>
