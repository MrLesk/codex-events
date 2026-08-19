<script setup lang="ts">
import { useApiClient } from '~/composables/useApiClient'

const enabled = defineModel<boolean>('enabled', { required: true })
const opensAt = defineModel<string>('opensAt', { required: true })
const closesAt = defineModel<string>('closesAt', { required: true })

const props = defineProps<{
  eventId?: string | null
  persistedEnabled?: boolean
}>()

const disablingLocked = ref(false)
const apiFetch = useApiClient()

onMounted(async () => {
  const eventId = props.eventId?.trim()
  if (!eventId || !props.persistedEnabled) return

  try {
    const response = await apiFetch<{ data: unknown[] }>(`/api/events/${eventId}/talk-proposals`, {
      query: { page: 1, page_size: 1 }
    })
    disablingLocked.value = response.data.length > 0
  } catch {
    // The save endpoint remains authoritative when the review list is unavailable.
  }
})
</script>

<template>
  <div
    data-testid="talk-proposal-control"
    class="grid min-w-0 overflow-hidden rounded-xl border transition-colors"
    :class="enabled
      ? 'border-primary/25 bg-primary/[0.035] dark:border-primary/30 dark:bg-primary/[0.055]'
      : 'border-black/8 dark:border-white/[0.08]'"
  >
    <label class="flex min-w-0 items-start gap-3 px-4 py-3 text-sm text-toned">
      <input
        v-model="enabled"
        type="checkbox"
        :disabled="disablingLocked"
        class="mt-0.5 size-4 rounded border-black/20 dark:border-white/[0.3]"
      >
      <span class="grid min-w-0 flex-1 gap-0.5">
        <span class="font-medium text-highlighted">Call for talks</span>
        <span class="text-xs text-muted">Registered applicants can send one private talk proposal.</span>
      </span>
    </label>

    <p
      v-if="disablingLocked"
      class="border-t border-primary/15 px-4 py-3 text-xs text-muted dark:border-primary/20"
    >
      Call for talks cannot be turned off after a Talk proposal has been created.
    </p>

    <div
      v-if="enabled"
      class="grid gap-5 border-t border-primary/15 px-4 py-4 md:grid-cols-2 dark:border-primary/20"
    >
      <label class="grid gap-2">
        <span class="text-sm font-medium text-toned">Opens</span>
        <AppDateTimeInput
          v-model="opensAt"
          picker-aria-label="Choose Call for talks open date and time"
          required
        />
      </label>

      <label class="grid gap-2">
        <span class="text-sm font-medium text-toned">Closes</span>
        <AppDateTimeInput
          v-model="closesAt"
          picker-aria-label="Choose Call for talks close date and time"
          required
        />
      </label>
    </div>
  </div>
</template>
