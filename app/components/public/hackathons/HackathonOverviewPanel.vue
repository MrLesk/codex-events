<script setup lang="ts">
import { renderMarkdown } from '~/utils/markdown'

const props = defineProps<{
  description: string
}>()

const descriptionMarkdown = computed(() => props.description.trim())
const descriptionHtml = computed(() => descriptionMarkdown.value ? renderMarkdown(descriptionMarkdown.value) : '')
</script>

<template>
  <section
    v-if="descriptionHtml"
    class="rounded-xl border border-black/8 bg-[#F7F7F8]/80 p-6 dark:border-white/[0.08] dark:bg-[#111111]/80"
    data-testid="public-hackathon-overview"
  >
    <div
      class="hackathon-markdown"
      v-html="descriptionHtml"
    />
  </section>

  <section
    v-else
    class="rounded-xl border border-dashed border-black/10 bg-white/80 p-8 text-center dark:border-white/[0.08] dark:bg-[#111111]/80"
    data-testid="public-hackathon-overview-empty"
  >
    <p class="text-[15px] font-medium text-highlighted dark:text-white">
      Overview will appear here once published.
    </p>
  </section>
</template>
