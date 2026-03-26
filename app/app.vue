<script setup lang="ts">
import { Toaster as UiSonner } from '~/components/ui/sonner'

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Codex Hackathons'
const description = 'The internal platform for running Codex community hackathons with Auth0-backed platform authentication.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <NuxtLoadingIndicator color="var(--primary)" />

  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <UiSonner
    position="top-right"
    rich-colors
    close-button
  />
</template>
