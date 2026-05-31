<script setup lang="ts">
import type { ApiDataResponse } from '~/lib/api'

interface PlatformDebugSettings {
  luma: {
    webhookUrl: string
  }
}

const { data, status, error } = await useFetch<ApiDataResponse<PlatformDebugSettings>>('/api/platform-settings/debug')

const lumaWebhookUrl = computed(() => data.value?.data.luma.webhookUrl ?? '')
</script>

<template>
  <div class="space-y-6">
    <AppAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Unable to load debug information"
      :description="error.message"
    />

    <AppCard class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
      <template #header>
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-highlighted">
            Luma
          </h2>
          <p class="text-sm text-muted">
            Webhook details for event attendance updates.
          </p>
        </div>
      </template>

      <div
        v-if="status === 'pending'"
        class="h-16 rounded-lg bg-black/[0.04] dark:bg-white/[0.06]"
      />

      <dl
        v-else-if="lumaWebhookUrl"
        class="divide-y divide-black/8 dark:divide-white/[0.08]"
      >
        <div class="grid gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[12rem_1fr]">
          <dt class="text-sm font-medium text-muted">
            Webhook URL
          </dt>
          <dd class="min-w-0 break-all rounded-lg bg-black/[0.04] px-3 py-2 font-mono text-sm text-highlighted dark:bg-white/[0.06] dark:text-white">
            {{ lumaWebhookUrl }}
          </dd>
        </div>
      </dl>

      <AppAlert
        v-else
        color="warning"
        variant="soft"
        title="Luma webhook URL is unavailable"
        description="The app URL is not configured for this deployment."
      />
    </AppCard>
  </div>
</template>
