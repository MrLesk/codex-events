<script setup lang="ts">
const props = defineProps<{
  opensAt: string
  closesAt: string
  actionHref?: string
  actionLabel?: string
  actionExternal?: boolean
}>()

const now = Date.now()
const opensAtTime = computed(() => Date.parse(props.opensAt))
const closesAtTime = computed(() => Date.parse(props.closesAt))
const isOpen = computed(() => now >= opensAtTime.value && now <= closesAtTime.value)
const isUpcoming = computed(() => now < opensAtTime.value)
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
  hour12: true
})
const timingLabel = computed(() => isOpen.value
  ? `Open until ${dateFormatter.format(new Date(props.closesAt))}`
  : `Opens ${dateFormatter.format(new Date(props.opensAt))}`
)
</script>

<template>
  <AppCard v-if="isOpen || isUpcoming" data-testid="public-call-for-talks" variant="subtle">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">Call for talks</h2>
        <p class="text-sm text-muted">{{ timingLabel }}</p>
      </div>
      <AppButton
        v-if="props.actionHref"
        :to="props.actionHref"
        :external="props.actionExternal"
        color="neutral"
        variant="solid"
      >
        {{ props.actionLabel || (isOpen ? 'Open Talk proposal' : 'View Call for talks') }}
      </AppButton>
    </div>
  </AppCard>
</template>
