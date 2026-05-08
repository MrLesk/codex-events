<script setup lang="ts">
import { MonitorIcon, MoonIcon, SunMediumIcon } from 'lucide-vue-next'

const colorModeStorageKey = 'codex-events-color-mode'
type ColorMode = 'dark' | 'light' | 'system'

const colorModeSequence: ColorMode[] = ['dark', 'light', 'system']
const colorMode = ref<ColorMode>('system')

const isDark = computed(() => resolveIsDark(colorMode.value))
const nextColorMode = computed<ColorMode>(() => {
  const currentIndex = colorModeSequence.indexOf(colorMode.value)
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % colorModeSequence.length
  return colorModeSequence[nextIndex] as ColorMode
})
const ariaLabel = computed(
  () => `Theme: ${colorMode.value}. Switch to ${nextColorMode.value}.`
)

let systemThemeMediaQuery: MediaQueryList | null = null

function isColorMode(value: string | null): value is ColorMode {
  return value === 'dark' || value === 'light' || value === 'system'
}

function getSystemPrefersDark(): boolean {
  if (!import.meta.client || !window.matchMedia) {
    return false
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveIsDark(mode: ColorMode): boolean {
  return mode === 'dark' || (mode === 'system' && getSystemPrefersDark())
}

function readColorMode(): ColorMode {
  if (!import.meta.client) {
    return 'system'
  }

  const documentMode = document.documentElement.dataset.themeMode
  if (isColorMode(documentMode ?? null)) {
    return documentMode as ColorMode
  }

  try {
    const storedMode = localStorage.getItem(colorModeStorageKey)
    if (isColorMode(storedMode)) {
      return storedMode
    }
  } catch {
    // Ignore storage access failures and keep current mode.
  }

  return 'system'
}

function applyColorMode(nextColorMode: ColorMode, persist: boolean = true) {
  colorMode.value = nextColorMode

  const nextIsDark = resolveIsDark(nextColorMode)
  const root = document.documentElement
  root.classList.toggle('dark', nextIsDark)
  root.dataset.themeMode = nextColorMode
  root.style.colorScheme = nextIsDark ? 'dark' : 'light'

  if (!persist) {
    return
  }

  try {
    localStorage.setItem(colorModeStorageKey, nextColorMode)
  } catch {
    // Ignore storage access failures (private mode / blocked storage).
  }
}

function toggleColorMode() {
  applyColorMode(nextColorMode.value)
}

onMounted(() => {
  applyColorMode(readColorMode(), false)

  if (!window.matchMedia) {
    return
  }

  systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemThemeMediaQuery.addEventListener('change', syncSystemColorMode)
})

onBeforeUnmount(() => {
  if (!systemThemeMediaQuery) {
    return
  }

  systemThemeMediaQuery.removeEventListener('change', syncSystemColorMode)
})

function syncSystemColorMode() {
  if (colorMode.value !== 'system') {
    return
  }

  applyColorMode('system', false)
}
</script>

<template>
  <AppButton
    color="neutral"
    variant="ghost"
    size="sm"
    class="rounded-full text-neutral-600 hover:bg-transparent hover:text-highlighted dark:text-[#D3D6DF] dark:hover:bg-transparent dark:hover:text-white"
    :aria-label="ariaLabel"
    @click="toggleColorMode"
  >
    <MonitorIcon
      v-if="colorMode === 'system'"
      class="size-4"
    />
    <MoonIcon
      v-else-if="isDark"
      class="size-4"
    />
    <SunMediumIcon
      v-else
      class="size-4"
    />
  </AppButton>
</template>
