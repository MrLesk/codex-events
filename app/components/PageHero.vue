<script setup lang="ts">
type HeroLink = {
  label: string
  to: string
  external?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'neutral' | 'success' | 'warning' | 'error' | 'info'
  variant?: 'solid' | 'soft' | 'subtle' | 'ghost' | 'outline'
  trailingIcon?: string
}

const props = withDefaults(defineProps<{
  title: string
  description?: string
  orientation?: 'vertical' | 'horizontal'
  links?: HeroLink[]
}>(), {
  description: undefined,
  orientation: 'vertical',
  links: () => []
})
</script>

<template>
  <section class="relative overflow-hidden rounded-[2rem] border border-default/80 bg-elevated/82 px-6 py-8 shadow-[0_32px_72px_-52px_rgba(15,20,34,0.65)] backdrop-blur sm:px-8 sm:py-10">
    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

    <div
      class="flex flex-col gap-8"
      :class="props.orientation === 'horizontal' ? 'xl:flex-row xl:items-start xl:justify-between' : ''"
    >
      <div class="max-w-3xl space-y-5">
        <slot name="headline" />

        <div class="space-y-4">
          <h1 class="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-highlighted sm:text-5xl">
            {{ props.title }}
          </h1>
          <p
            v-if="props.description"
            class="max-w-3xl text-base leading-8 text-toned"
          >
            {{ props.description }}
          </p>
        </div>

        <div
          v-if="props.links.length > 0"
          class="flex flex-wrap gap-3"
        >
          <AppButton
            v-for="link in props.links"
            :key="`${link.label}-${link.to}`"
            :to="link.to"
            :external="link.external"
            :label="link.label"
            :size="link.size ?? 'lg'"
            :color="link.color ?? 'primary'"
            :variant="link.variant ?? 'solid'"
            :trailing-icon="link.trailingIcon"
          />
        </div>
      </div>

      <div class="min-w-0 flex-1">
        <slot name="body" />
      </div>
    </div>
  </section>
</template>
