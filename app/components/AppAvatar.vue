<script setup lang="ts">
import { Avatar as UiAvatar, AvatarFallback as UiAvatarFallback, AvatarImage as UiAvatarImage } from '~/components/ui/avatar'
import { cn } from '~/lib/utils'

type AvatarSize = 'sm' | 'lg' | '3xl'

const props = withDefaults(defineProps<{
  src?: string
  alt?: string
  size?: AvatarSize
}>(), {
  src: undefined,
  alt: '',
  size: 'sm'
})

const sizeClasses: Record<AvatarSize, string> = {
  'sm': 'size-8',
  'lg': 'size-10',
  '3xl': 'size-16'
}

const fallbackLabel = computed(() => {
  const value = (props.alt || '').trim()

  if (!value) {
    return 'CH'
  }

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
})
</script>

<template>
  <UiAvatar :class="cn('border border-default/70 bg-default', sizeClasses[props.size])">
    <UiAvatarImage
      v-if="props.src"
      :src="props.src"
      :alt="props.alt"
    />
    <UiAvatarFallback class="bg-default text-xs font-semibold text-toned">
      {{ fallbackLabel }}
    </UiAvatarFallback>
  </UiAvatar>
</template>
