<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '~/lib/utils'

const props = defineProps<{
  name: string
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <Icon
    :name="props.name"
    :class="cn('size-4 shrink-0', props.class)"
  />
</template>
