<script setup lang="ts">
import type { ApiDataResponse, HackathonRecord } from '~/utils/admin-workspace'

definePageMeta({
  layout: 'profile',
  middleware: ['require-auth']
})

const route = useRoute()
const hackathonId = typeof route.params.hackathonId === 'string' ? route.params.hackathonId.trim() : ''

if (!hackathonId) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const requestFetch = import.meta.server ? useRequestFetch() : $fetch
const response = await requestFetch<ApiDataResponse<HackathonRecord>>(`/api/hackathons/${encodeURIComponent(hackathonId)}`)

await navigateTo(`/hackathons/${response.data.slug}/admin`, {
  redirectCode: 301
})
</script>
