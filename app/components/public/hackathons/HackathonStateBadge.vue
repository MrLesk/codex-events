<script setup lang="ts">
import type { PublicHackathonState } from '~/composables/useHackathonPresentation'

const props = defineProps<{
  state: PublicHackathonState
}>()

const color = computed(() => resolveHackathonStateColor(props.state))
const label = computed(() => formatHackathonStateLabel(props.state))
</script>

<template>
  <UBadge
    :color="color"
    variant="subtle"
    size="md"
    class="rounded-full px-3 py-1 font-semibold tracking-[0.16em] uppercase"
  >
    {{ label }}
  </UBadge>
</template>
