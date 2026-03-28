<script setup lang="ts">
import type { PublicHackathonState } from '~/composables/useHackathonPresentation'

const props = defineProps<{
  state: PublicHackathonState
  registrationOpensAt?: string
  registrationClosesAt?: string
}>()

const statePresentation = computed(() => getPublicHackathonStatePresentation(props))
const color = computed(() => statePresentation.value.color)
const label = computed(() => statePresentation.value.label)
</script>

<template>
  <AppBadge
    :color="color"
    variant="subtle"
    size="md"
    class="rounded-full px-3 py-1 font-semibold tracking-[0.16em] uppercase"
  >
    {{ label }}
  </AppBadge>
</template>
