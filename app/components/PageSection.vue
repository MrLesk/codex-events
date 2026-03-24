<script setup lang="ts">
type SectionFeature = {
  icon?: string
  title: string
  description: string
}

const props = withDefaults(defineProps<{
  title: string
  description?: string
  features?: SectionFeature[]
}>(), {
  description: undefined,
  features: () => []
})
</script>

<template>
  <section class="space-y-8">
    <div class="flex flex-col gap-5 border-b border-default/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-3">
        <h2 class="text-3xl font-semibold tracking-[-0.04em] text-highlighted">
          {{ props.title }}
        </h2>
        <p
          v-if="props.description"
          class="max-w-3xl text-sm leading-7 text-toned"
        >
          {{ props.description }}
        </p>
      </div>

      <div class="shrink-0">
        <slot name="links" />
      </div>
    </div>

    <div
      v-if="props.features.length > 0"
      class="grid gap-4 xl:grid-cols-3"
    >
      <article
        v-for="feature in props.features"
        :key="feature.title"
        class="rounded-[1.5rem] border border-default/70 bg-elevated/85 px-5 py-5 shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)]"
      >
        <div class="flex items-start gap-3">
          <div
            v-if="feature.icon"
            class="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-default/70 bg-default"
          >
            <AppIcon
              :name="feature.icon"
              class="size-4 text-highlighted"
            />
          </div>

          <div class="space-y-2">
            <h3 class="text-lg font-semibold text-highlighted">
              {{ feature.title }}
            </h3>
            <p class="text-sm leading-7 text-toned">
              {{ feature.description }}
            </p>
          </div>
        </div>
      </article>
    </div>

    <slot name="body">
      <slot />
    </slot>
  </section>
</template>
