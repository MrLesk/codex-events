<script setup lang="ts">
import { MoonIcon, SunIcon } from 'lucide-vue-next'

const colorModeStorageKey = 'codex-hackathons-color-mode'
const isDark = ref(true)

function applyColorMode(nextIsDark: boolean) {
  isDark.value = nextIsDark
  document.documentElement.classList.toggle('dark', nextIsDark)
  localStorage.setItem(colorModeStorageKey, nextIsDark ? 'dark' : 'light')
}

function toggleColorMode() {
  applyColorMode(!isDark.value)
}

onMounted(() => {
  const savedMode = localStorage.getItem(colorModeStorageKey)
  applyColorMode(savedMode !== 'light')
})
</script>

<template>
  <AppButton
    color="neutral"
    variant="soft"
    size="sm"
    class="rounded-full"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleColorMode"
  >
    <SunIcon
      v-if="isDark"
      class="size-4"
    />
    <MoonIcon
      v-else
      class="size-4"
    />
  </AppButton>
</template>
