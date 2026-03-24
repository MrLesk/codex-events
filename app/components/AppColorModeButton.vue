<script setup lang="ts">
import { MoonIcon, SunMediumIcon } from 'lucide-vue-next'

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
    variant="ghost"
    size="sm"
    class="rounded-full text-neutral-600 hover:bg-transparent hover:text-highlighted dark:text-[#D3D6DF] dark:hover:bg-transparent dark:hover:text-white"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleColorMode"
  >
    <SunMediumIcon
      v-if="isDark"
      class="size-4"
    />
    <MoonIcon
      v-else
      class="size-4"
    />
  </AppButton>
</template>
