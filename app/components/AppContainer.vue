<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '~/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('mx-auto w-full max-w-[75rem] px-4 sm:px-6 lg:px-8', props.class)">
    <slot />
  </div>
</template>
