<script setup lang="ts">
import AppShellFooter from '~/components/shell/AppShellFooter.vue'
import AppShellHeader from '~/components/shell/AppShellHeader.vue'
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-foreground">
    <AppShellHeader />

    <div class="min-h-0 flex flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-none">
      <main class="relative">
        <slot />
      </main>

      <AppShellFooter class="mt-auto" />
    </div>
  </div>
</template>
