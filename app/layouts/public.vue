<script setup lang="ts">
import AppShellFooter from '~/components/shell/AppShellFooter.vue'
import AppShellHeader from '~/components/shell/AppShellHeader.vue'
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-foreground">
    <AppShellHeader />

    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <main class="relative">
        <slot />
      </main>

      <AppShellFooter />
    </div>
  </div>
</template>
