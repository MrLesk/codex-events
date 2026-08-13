<script setup lang="ts">
import { normalizeApiError } from '~/lib/api'
import type { McpAccessToken } from '~/domains/accounts/mcp-tokens'
import { copyMcpCredential, createAccountMcpToken, listAllAccountMcpTokens, revokeAccountMcpToken } from '~/domains/accounts/mcp-tokens'

const tokens = ref<McpAccessToken[]>([])
const name = ref('')
const credential = ref('')
const pending = ref(false)
const errorMessage = ref('')
const copied = ref(false)
const revokingId = ref<string | null>(null)

async function loadTokens() {
  tokens.value = await listAllAccountMcpTokens($fetch)
}

async function createToken() {
  pending.value = true
  errorMessage.value = ''
  copied.value = false
  credential.value = ''

  try {
    const created = await createAccountMcpToken($fetch, name.value)
    credential.value = created.credential
    name.value = ''
    await loadTokens()
  } catch (error) {
    errorMessage.value = normalizeApiError(error).message
  } finally {
    pending.value = false
  }
}

async function copyCredential() {
  if (!credential.value || !import.meta.client || !window.isSecureContext || !navigator.clipboard) {
    return
  }
  await copyMcpCredential(navigator.clipboard, credential.value)
  copied.value = true
}

async function revokeToken(token: McpAccessToken) {
  if (!window.confirm(`Revoke “${token.name}”? Clients using it will lose access immediately.`)) {
    return
  }

  revokingId.value = token.id
  errorMessage.value = ''
  try {
    await revokeAccountMcpToken($fetch, token.id)
    await loadTokens()
  } catch (error) {
    errorMessage.value = normalizeApiError(error).message
  } finally {
    revokingId.value = null
  }
}

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

onMounted(async () => {
  try {
    await loadTokens()
  } catch (error) {
    errorMessage.value = normalizeApiError(error).message
  }
})
</script>

<template>
  <section class="space-y-5 border-t border-black/8 pt-8 dark:border-white/[0.08]">
    <h2 class="text-[20px] font-medium text-highlighted dark:text-white">
      MCP access tokens
    </h2>

    <AppAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      :description="errorMessage"
    />

    <form
      class="flex flex-col gap-3 sm:flex-row sm:items-end"
      @submit.prevent="createToken"
    >
      <div class="min-w-0 flex-1 space-y-2">
        <label
          class="text-sm font-medium text-highlighted"
          for="mcp-token-name"
        >
          Token name
        </label>
        <AppInput
          id="mcp-token-name"
          v-model="name"
          required
          maxlength="80"
          placeholder="My Codex client"
        />
      </div>
      <AppButton
        type="submit"
        color="neutral"
        variant="solid"
        label="Create token"
        :loading="pending"
      />
    </form>

    <div
      v-if="credential"
      class="space-y-3 rounded-xl border border-warning/25 bg-warning/5 p-5"
    >
      <p class="text-sm font-semibold text-highlighted">
        Copy this token now
      </p>
      <code class="block overflow-x-auto rounded-lg bg-black px-3 py-2 text-xs text-white">{{ credential }}</code>
      <AppButton
        color="neutral"
        variant="outline"
        :label="copied ? 'Copied' : 'Copy token'"
        @click="copyCredential"
      />
    </div>

    <div class="divide-y divide-black/8 border-y border-black/8 dark:divide-white/[0.08] dark:border-white/[0.08]">
      <div
        v-for="token in tokens"
        :key="token.id"
        class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0 space-y-1">
          <p class="truncate text-sm font-semibold text-highlighted">
            {{ token.name }}
          </p>
          <p class="font-mono text-xs text-muted">
            {{ token.displayPrefix }}…
          </p>
          <p class="text-xs text-muted">
            Expires {{ formatDate(token.expiresAt) }} · Last used {{ formatDate(token.lastUsedAt) }}
          </p>
        </div>
        <div
          v-if="token.revokedAt"
          class="text-xs font-medium text-muted"
        >
          Revoked
        </div>
        <AppButton
          v-else
          color="error"
          variant="outline"
          label="Revoke"
          :loading="revokingId === token.id"
          @click="revokeToken(token)"
        />
      </div>
      <p
        v-if="tokens.length === 0"
        class="py-6 text-sm text-muted"
      >
        No access tokens.
      </p>
    </div>
  </section>
</template>
