<script setup lang="ts">
import { Toaster as UiSonner } from '~/components/ui/sonner'

const colorModeStorageKey = 'codex-hackathons-color-mode'
const colorModeBootstrapScript = `(function () {
  var root = document.documentElement;
  var colorMode = 'system';

  try {
    var savedMode = localStorage.getItem('${colorModeStorageKey}');
    if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
      colorMode = savedMode;
    }
  }
  catch (_error) {
    colorMode = 'system';
  }

  var prefersDark = false;
  if (window.matchMedia) {
    prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  var isDark = colorMode === 'dark' || (colorMode === 'system' && prefersDark);

  root.classList.toggle('dark', isDark);
  root.dataset.themeMode = colorMode;
  root.style.colorScheme = isDark ? 'dark' : 'light';
})();`

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  script: [
    {
      key: 'color-mode-bootstrap',
      tagPosition: 'head',
      textContent: colorModeBootstrapScript
    }
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
