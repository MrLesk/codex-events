<script setup lang="ts">
defineProps<{
  tokenName: string
  credential: string
  serverUrl: string
  copied: boolean
}>()

defineEmits<{
  copy: []
  done: []
}>()
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-1">
      <h3 class="text-base font-semibold text-highlighted">
        {{ tokenName }}
      </h3>
      <p class="text-sm text-muted">
        Copy this token now. It will not be shown again.
      </p>
    </div>

    <div class="flex min-w-0 flex-col gap-2 sm:flex-row">
      <code class="min-w-0 flex-1 overflow-x-auto rounded-lg bg-default px-3 py-2.5 text-sm text-highlighted">{{ credential }}</code>
      <AppButton
        color="neutral"
        variant="outline"
        :label="copied ? 'Copied' : 'Copy token'"
        @click="$emit('copy')"
      />
    </div>

    <p class="text-sm text-muted">
      Connect to <span class="font-mono text-highlighted">{{ serverUrl }}</span> and send the token as an <span class="font-mono text-highlighted">Authorization: Bearer</span> header.
    </p>

    <AppButton
      color="neutral"
      variant="ghost"
      label="Done"
      @click="$emit('done')"
    />
  </div>
</template>
