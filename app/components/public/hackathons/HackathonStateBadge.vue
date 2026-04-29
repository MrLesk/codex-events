<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core'
import { cn } from '~/lib/utils'
import {
  getPublicHackathonStatePresentation,
  resolvePublicHackathonHeaderStateClass,
  type PublicHackathonState
} from '~/domains/hackathons/presentation'

defineOptions({
  inheritAttrs: false
})

const props = defineProps<{
  state: PublicHackathonState
  registrationOpensAt?: string
  registrationClosesAt?: string
}>()

const statePresentation = computed(() => getPublicHackathonStatePresentation(props))
const label = computed(() => statePresentation.value.label)
const attrs = useAttrs()
const delegatedAttrs = reactiveOmit(attrs, 'class')
const rootClass = computed(() =>
  cn(
    'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
    resolvePublicHackathonHeaderStateClass(props),
    attrs.class
  )
)
</script>

<template>
  <span
    :class="rootClass"
    v-bind="delegatedAttrs"
  >
    {{ label }}
  </span>
</template>
