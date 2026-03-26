<script setup lang="ts">
import AppShellFooter from '~/components/shell/AppShellFooter.vue'
import AppShellHeader from '~/components/shell/AppShellHeader.vue'
</script>

<template>
  <div class="min-h-screen overflow-x-hidden text-foreground">
    <AppShellHeader />

    <main class="relative">
      <slot />
    </main>

    <AppShellFooter />
  </div>
</template>
