<script setup lang="ts">
definePageMeta({
  middleware: ['require-platform-account']
})

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Event not found.'
  })
}

await navigateTo(`/account/events/${slug.value}?tab=teams`, {
  redirectCode: 302,
  replace: true
})
</script>

<template>
  <div />
</template>
