<script setup lang="ts">
defineProps<{
  serverUrl: string
  copied: boolean
}>()

defineEmits<{
  copy: []
}>()
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <h3 class="text-base font-semibold text-highlighted">
        Connect with OAuth
      </h3>
      <span class="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        Recommended
      </span>
    </div>
    <p class="text-sm text-muted">
      Add this server in Codex. Your browser will open so you can sign in securely.
    </p>
    <div class="flex min-w-0 flex-col gap-2 sm:flex-row">
      <code class="min-w-0 flex-1 overflow-x-auto rounded-lg bg-default px-3 py-2.5 text-sm text-highlighted">{{ serverUrl }}</code>
      <AppButton
        color="neutral"
        variant="outline"
        :label="copied ? 'Copied' : 'Copy server URL'"
        @click="$emit('copy')"
      />
    </div>
  </div>
</template>
