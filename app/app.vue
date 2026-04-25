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
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'manifest', href: '/site.webmanifest' }
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

useSeoMeta({
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <NuxtLoadingIndicator color="var(--primary)" />
  <NuxtRouteAnnouncer />

  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <UiSonner
    position="top-right"
    rich-colors
    close-button
  />
</template>
