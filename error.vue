<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const statusCode = computed(() => props.error.statusCode ?? 500)
const isUnauthorized = computed(() => statusCode.value === 401)
const title = computed(() => isUnauthorized.value ? 'Unauthorized' : 'Something went wrong')
const description = computed(() => {
  if (isUnauthorized.value) {
    return props.error.statusMessage?.trim()
      || 'This page is not available for your current account permissions.'
  }

  return props.error.statusMessage?.trim()
    || 'The requested page could not be loaded.'
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <AppContainer class="flex min-h-screen max-w-[48rem] items-center py-16">
      <div class="w-full rounded-[1.75rem] border border-black/8 bg-white/85 p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.38)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#111111]/88 sm:p-10">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          Error {{ statusCode }}
        </p>
        <h1 class="mt-3 text-[32px] font-semibold tracking-[-0.03em] text-highlighted dark:text-white">
          {{ title }}
        </h1>
        <p class="mt-3 max-w-2xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
          {{ description }}
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <AppButton
            to="/"
            color="neutral"
            variant="solid"
            class="rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
          >
            Go home
          </AppButton>
          <AppButton
            color="neutral"
            variant="soft"
            class="rounded-lg px-4 py-2"
            @click="clearError({ redirect: '/' })"
          >
            Clear error
          </AppButton>
        </div>
      </div>
    </AppContainer>
  </div>
</template>
