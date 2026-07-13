<script setup lang="ts">
import AccountEventSimplifiedClaimingPanel from '~/components/account/events/AccountEventSimplifiedClaimingPanel.vue'

const enabled = defineModel<boolean>({
  required: true
})

const props = defineProps<{
  eventId?: string | null
  persistedEnabled?: boolean
}>()

const persistedEventId = computed(() => props.eventId?.trim() ?? '')
const claimingLocked = shallowRef(false)
</script>

<template>
  <div class="grid">
    <label
      data-testid="simplified-claiming-toggle"
      class="flex items-start gap-3 border px-4 py-3 text-sm text-toned transition-colors"
      :class="enabled
        ? 'rounded-t-xl border-primary/25 bg-primary/[0.06] pb-4 dark:border-primary/30 dark:bg-primary/[0.08]'
        : 'rounded-lg border-black/8 dark:border-white/[0.08]'"
    >
      <input
        v-model="enabled"
        type="checkbox"
        :disabled="claimingLocked"
        class="mt-0.5 size-4 rounded border-black/20 dark:border-white/[0.3]"
      >
      <span class="grid gap-0.5">
        <span class="font-medium text-highlighted">Simplified attendee claiming</span>
        <span class="text-xs text-muted">Prepare a private QR, upload reward links, and match approved Luma attendees.</span>
      </span>
    </label>

    <template v-if="enabled">
      <AccountEventSimplifiedClaimingPanel
        v-if="props.persistedEnabled && persistedEventId"
        :event-id="persistedEventId"
        @lock-change="claimingLocked = $event"
      />
      <section
        v-else
        class="-mt-px ml-7 rounded-b-xl border border-l-4 border-primary/20 border-l-primary/35 bg-primary/[0.035] px-4 py-5 dark:border-primary/25 dark:border-l-primary/40 dark:bg-primary/[0.055] sm:px-5"
      >
        <div class="mb-4 space-y-1">
          <h3 class="text-lg font-semibold text-highlighted">
            Attendee claiming setup
          </h3>
          <p class="text-sm text-muted">
            The QR, reward links, and attendee import will be available here.
          </p>
        </div>
        <AppAlert
          data-testid="simplified-claiming-save-notice"
          color="info"
          variant="soft"
          :title="persistedEventId ? 'Save configuration to continue' : 'Create the event to continue'"
          :description="persistedEventId
            ? 'Save this setting to generate the redemption QR and upload private rewards.'
            : 'Create the event to generate its redemption QR and upload private rewards.'"
        />
      </section>
    </template>
  </div>
</template>
