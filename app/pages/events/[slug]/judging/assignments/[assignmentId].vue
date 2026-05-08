<script setup lang="ts">
import { buildAccountEventJudgingTabHref } from '~/domains/judging/query'

definePageMeta({
  middleware: ['require-event-judge']
})

const route = useRoute()
const slug = typeof route.params.slug === 'string' ? route.params.slug.trim() : ''
const assignmentId = typeof route.params.assignmentId === 'string' ? route.params.assignmentId.trim() : ''

if (!slug || !assignmentId) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Judge assignment not found.'
  })
}

await navigateTo(
  buildAccountEventJudgingTabHref(slug, assignmentId),
  {
    replace: true,
    redirectCode: 302
  }
)
</script>
